/**
 * Sincronização offline-first com o back-end (fzlbpms /api/tasktoday).
 *
 * O localStorage continua sendo a fonte da UI. Cada alteração local entra numa fila
 * persistente (outbox) que é enviada em ordem quando há sessão e rede; depois, o estado
 * do servidor substitui o cache local. Enquanto houver alteração pendente, o pull é
 * descartado para não sobrescrever o que ainda não subiu.
 */

import { authService } from 'fzl-fund-appshell--lit'
import { getStorageItem, setStorageItem } from './storage.js'
import { apiFetch, ApiError } from './api-client.js'
import { isKeycloakConfigured } from './keycloak-provider.js'

const OUTBOX_KEY = 'sync:outbox'
const PULL_INTERVAL_MS = 60 * 1000

const TASK_CREATE_FIELDS = ['id', 'title', 'description', 'categoryId', 'priority', 'status', 'deadline', 'alertType', 'triggerMinutes', 'isArchived']
const TASK_UPDATE_FIELDS = ['title', 'description', 'categoryId', 'priority', 'status', 'deadline', 'alertType', 'triggerMinutes', 'isArchived', 'alarmFired']
const CATEGORY_CREATE_FIELDS = ['id', 'name', 'color', 'icon']

function pick(obj, fields) {
  const out = {}
  for (const f of fields) {
    if (obj[f] !== undefined) out[f] = obj[f]
  }
  return out
}

// 401 (token), 408/429 e 5xx são transitórios: a fila para e tenta de novo depois
function isTransient(err) {
  if (!(err instanceof ApiError)) return true
  return err.status === 401 || err.status === 408 || err.status === 429 || err.status >= 500
}

function requestFor(entry) {
  const base = entry.kind === 'task' ? '/tasks' : '/categories'
  const id = encodeURIComponent(entry.id)
  switch (entry.op) {
    case 'create': return { method: 'POST', path: base, body: entry.body }
    case 'update': return { method: 'PUT', path: `${base}/${id}`, body: entry.body }
    case 'delete': return { method: 'DELETE', path: `${base}/${id}` }
  }
}

class SyncService {
  constructor() {
    this.pulledListeners = new Set()
    this.loginListeners = new Set()
    this._flushing = null
    this._timer = null
  }

  isActive() {
    return isKeycloakConfigured() && !authService.isLocal() && Boolean(authService.getCurrentUser())
  }

  getOutbox() {
    return getStorageItem(OUTBOX_KEY, [])
  }

  /** Recebe { tasks, categories } do servidor depois de cada pull. */
  onPulled(listener) {
    this.pulledListeners.add(listener)
    return () => this.pulledListeners.delete(listener)
  }

  /** Chamado a cada login (ex.: registrar a inscrição push no servidor). */
  onLogin(listener) {
    this.loginListeners.add(listener)
    return () => this.loginListeners.delete(listener)
  }

  // --- Fila de alterações -------------------------------------------------

  taskCreated(task) {
    this._enqueue({ op: 'create', kind: 'task', id: task.id, body: pick(task, TASK_CREATE_FIELDS) })
  }

  taskUpdated(taskId, patch) {
    const body = pick(patch, TASK_UPDATE_FIELDS)
    if (Object.keys(body).length > 0) {
      this._enqueue({ op: 'update', kind: 'task', id: taskId, body })
    }
  }

  taskDeleted(taskId) {
    this._enqueue({ op: 'delete', kind: 'task', id: taskId })
  }

  categoryCreated(category) {
    this._enqueue({ op: 'create', kind: 'category', id: category.id, body: pick(category, CATEGORY_CREATE_FIELDS) })
  }

  categoryDeleted(categoryId) {
    this._enqueue({ op: 'delete', kind: 'category', id: categoryId })
  }

  _enqueue(entry) {
    if (!isKeycloakConfigured()) return
    setStorageItem(OUTBOX_KEY, [...this.getOutbox(), entry])
    this.flush()
  }

  /** Descarta a fila (logout). */
  clear() {
    setStorageItem(OUTBOX_KEY, null)
  }

  // --- Envio e recebimento --------------------------------------------------

  /** Envia a fila em ordem. Uma execução por vez; resolve true se esvaziou. */
  flush() {
    if (!this.isActive() || !navigator.onLine) return Promise.resolve(false)
    if (!this._flushing) {
      this._flushing = this._flushQueue().finally(() => { this._flushing = null })
    }
    return this._flushing
  }

  async _flushQueue() {
    let outbox = this.getOutbox()
    while (outbox.length > 0) {
      const entry = outbox[0]
      try {
        await this._send(entry)
      } catch (err) {
        if (isTransient(err)) {
          console.warn('Sincronização adiada:', err.message)
          return false
        }
        // Erro definitivo (400/403/404...): não adianta repetir
        console.warn(`Alteração descartada pelo servidor (${entry.op} ${entry.kind} ${entry.id}):`, err.message)
      }
      // Relê a fila: novas alterações podem ter entrado durante o envio
      outbox = this.getOutbox().slice(1)
      setStorageItem(OUTBOX_KEY, outbox)
    }
    return true
  }

  async _send(entry) {
    const { method, path, body } = requestFor(entry)
    try {
      await apiFetch(path, { method, body })
    } catch (err) {
      // Criação repetida (ex.: resposta perdida na primeira tentativa): vira atualização
      if (err instanceof ApiError && err.status === 409 && entry.op === 'create' && entry.kind === 'task') {
        const { id, ...rest } = entry.body
        await apiFetch(`/tasks/${encodeURIComponent(id)}`, { method: 'PUT', body: rest })
        return
      }
      if (err instanceof ApiError && err.status === 404 && entry.op === 'delete') return
      throw err
    }
  }

  /** Envia a fila e, se ela esvaziou, traz o estado do servidor. */
  async sync() {
    if (!this.isActive() || !navigator.onLine) return
    try {
      if (!(await this.flush())) return
      const [categories, tasks] = await Promise.all([
        apiFetch('/categories'),
        apiFetch('/tasks?include_archived=true')
      ])
      if (this.getOutbox().length > 0) return
      for (const listener of this.pulledListeners) listener({ tasks, categories })
    } catch (err) {
      console.warn('Falha ao sincronizar com o servidor:', err.message)
    }
  }

  start() {
    authService.subscribe((user) => {
      if (!user || !this.isActive()) return
      for (const listener of this.loginListeners) {
        Promise.resolve(listener(user)).catch((err) => console.warn('Erro pós-login:', err))
      }
      this.sync()
    })
    window.addEventListener('online', () => this.sync())
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.sync()
    })
    this._timer = setInterval(() => {
      if (document.visibilityState === 'visible') this.sync()
    }, PULL_INTERVAL_MS)
  }
}

export const syncService = new SyncService()
