/**
 * Serviço de Gerenciamento de Tarefas e Filtros Avançados (RF01, RF03, RF06, RF07)
 */

import { storageManager, NATIVE_CATEGORIES, ITEM_KIND_TASK, ITEM_KIND_NOTE, isNote } from './storage.js'
import { alarmService } from './alarm-service.js'
import { syncService } from './sync-service.js'
import { onSignOut, isTaskTodayAdmin } from './keycloak-provider.js'
import { authService } from 'fzl-fund-appshell--lit'

// `0` é uma opção válida de gatilho ("no momento exato");
// ausente ou vazio vira null (gatilho desativado / no prazo)
function normalizeTriggerMinutes(value, fallback = null) {
  if (value === null || value === undefined || value === '' || value === 'none') return fallback
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : fallback
}

/**
 * Mantém as invariantes de cada tipo de item: a tarefa tem prioridade e status, com prazo,
 * tipo de alerta e gatilho opcionais; a anotação é só título, conteúdo e categoria.
 * Vale também na troca de tipo durante a edição, nos dois sentidos.
 */
function applyKindRules(item) {
  if (isNote(item)) {
    return {
      ...item,
      kind: ITEM_KIND_NOTE,
      priority: null,
      status: null,
      deadline: null,
      alertType: 'none',
      triggerMinutes: null, // nulo, não 0: `0` significaria alarme no instante do prazo
      completedAt: null,
      alarmFired: false
    }
  }

  const hasDeadline = Boolean(item.deadline)
  const alertType = hasDeadline ? (item.alertType || 'none') : 'none'
  const triggerMinutes = (alertType === 'none' || !hasDeadline)
    ? null
    : normalizeTriggerMinutes(item.triggerMinutes, null)

  return {
    ...item,
    kind: ITEM_KIND_TASK,
    priority: item.priority || 'MEDIA',
    status: item.status || 'PENDENTE',
    deadline: hasDeadline ? item.deadline : null,
    alertType,
    triggerMinutes
  }
}

class TaskService {
  constructor() {
    storageManager.initSeedData()
    this.listeners = new Set()
    this._initAlarmChecker()
    this._initSync()
    this._initAuthListener()
  }

  _initAuthListener() {
    authService.subscribe(() => {
      this._notify()
    })
  }

  _getUser() {
    return authService.getCurrentUser()
  }

  _getUserTaskKey() {
    const user = this._getUser()
    return user?.id ? `tasks:${user.id}` : null
  }

  _initSync() {
    // O servidor é a referência depois de cada sincronização (inclusive alarmFired,
    // para o alarme local não tocar de novo o que o push do servidor já avisou), mas
    // preservamos a ordenação manual local definida pelo usuário via drag-and-drop / card-list
    syncService.onPulled(({ tasks, categories }) => {
      const key = this._getUserTaskKey()
      if (key) {
        storageManager.setItem(key, this._mergeServerTasks(tasks, this.getTasks()))
      }
      storageManager.setItem('categories', this._mergeServerCategories(categories, this.getCategories()))
      this._notify()
    })
    // Os dados locais são do usuário que está saindo
    onSignOut(() => {
      syncService.clear()
      this._notify()
    })
    syncService.start()
  }

  /**
   * Mescla as tarefas vindas do servidor mantendo a ordenação manual local que o usuário
   * definiu via drag-and-drop / card-list e preservando o `kind` local se o backend não enviar.
   */
  _mergeServerTasks(incoming, local) {
    if (!Array.isArray(incoming)) return incoming
    if (!Array.isArray(local) || local.length === 0) return incoming

    const incomingById = new Map(incoming.map(item => [item.id, item]))
    const merged = []

    // 1. Percorre a lista local na ordem exata definida pelo usuário
    for (const localItem of local) {
      if (incomingById.has(localItem.id)) {
        const serverItem = incomingById.get(localItem.id)
        if (!serverItem.kind && localItem.kind) {
          serverItem.kind = localItem.kind
        }
        merged.push(serverItem)
        incomingById.delete(localItem.id)
      }
    }

    // 2. Tarefas novas criadas remotamente ou em outros dispositivos são adicionadas no topo
    for (const newItem of incomingById.values()) {
      merged.unshift(newItem)
    }

    return merged
  }

  /**
   * Mescla as categorias do servidor mantendo a ordenação local e o `defaultKind`.
   */
  _mergeServerCategories(incoming, local) {
    if (!Array.isArray(incoming)) return incoming
    if (!Array.isArray(local) || local.length === 0) return incoming

    const incomingById = new Map(incoming.map(item => [item.id, item]))
    const merged = []

    for (const localItem of local) {
      if (incomingById.has(localItem.id)) {
        const serverItem = incomingById.get(localItem.id)
        if (!serverItem.defaultKind && localItem.defaultKind) {
          serverItem.defaultKind = localItem.defaultKind
        }
        merged.push(serverItem)
        incomingById.delete(localItem.id)
      }
    }

    for (const newItem of incomingById.values()) {
      merged.push(newItem)
    }

    return merged
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener()
      } catch (err) {
        console.error('Erro no listener do taskService:', err)
      }
    }
  }

  getTasks() {
    const key = this._getUserTaskKey()
    if (!key) return []
    return storageManager.getItem(key, [])
  }

  clearMemory() {
    this._notify()
  }

  getCategories() {
    return storageManager.getItem('categories', [])
  }

  saveCategories(categories) {
    storageManager.setItem('categories', categories)
    this._notify()
  }

  addCategory(category) {
    const cats = this.getCategories()
    const newCat = {
      // O sufixo aleatório evita id repetido em criações no mesmo milissegundo,
      // que no servidor viraria uma categoria só (o id é a chave da sincronização)
      id: category.id || `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: category.name,
      color: category.color || '#1976d2',
      icon: category.icon || 'folder',
      // Tipo de item que o formulário já abre selecionado nesta categoria
      defaultKind: category.defaultKind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK,
      // Categoria nativa (visível a todos os usuários) só para o administrador
      isNative: Boolean(category.isNative) && isTaskTodayAdmin(),
      createdAt: new Date().toISOString()
    }
    cats.push(newCat)
    this.saveCategories(cats)
    syncService.categoryCreated(newCat)
    return newCat
  }

  /** Categorias próprias: qualquer usuário; nativas: só o administrador. */
  canManageCategory(category) {
    return Boolean(category) && (!category.isNative || isTaskTodayAdmin())
  }

  updateCategory(categoryId, patch) {
    const cats = this.getCategories()
    const idx = cats.findIndex(c => c.id === categoryId)
    if (idx === -1 || !this.canManageCategory(cats[idx])) return null

    const { name, color, icon, defaultKind } = patch
    const changes = Object.fromEntries(
      Object.entries({ name, color, icon, defaultKind }).filter(([, v]) => v !== undefined)
    )
    cats[idx] = { ...cats[idx], ...changes }
    this.saveCategories(cats)
    syncService.categoryUpdated(categoryId, changes)
    return cats[idx]
  }

  deleteCategory(categoryId) {
    const category = this.getCategories().find(c => c.id === categoryId)
    if (!this.canManageCategory(category)) return
    const cats = this.getCategories().filter(c => c.id !== categoryId)
    this.saveCategories(cats)

    // Mesmo efeito do servidor: as tarefas da categoria ficam sem categoria
    const key = this._getUserTaskKey()
    if (key) {
      const tasks = this.getTasks().map(t => t.categoryId === categoryId ? { ...t, categoryId: null } : t)
      storageManager.setItem(key, tasks)
      this._notify()
    }
    syncService.categoryDeleted(categoryId)
  }

  /** Tipo de item sugerido pela categoria (ex.: uma categoria "Anotações"). */
  kindForCategory(categoryId) {
    const category = this.getCategories().find(c => c.id === categoryId)
    return category?.defaultKind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK
  }

  /**
   * RF01: Cadastro de Tarefa ou de Anotação, conforme `kind`
   */
  createTask(taskData) {
    const key = this._getUserTaskKey()
    if (!key) {
      throw new Error('É necessário estar autenticado para criar tarefas.')
    }
    const tasks = this.getTasks()
    const kind = taskData.kind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK
    const prefix = kind === ITEM_KIND_NOTE ? 'note' : 'task'
    const now = new Date().toISOString()

    const hasDeadline = Boolean(taskData.deadline)
    const alertType = hasDeadline ? (taskData.alertType || 'none') : 'none'
    const triggerMinutes = (alertType === 'none' || !hasDeadline)
      ? null
      : normalizeTriggerMinutes(taskData.triggerMinutes, null)

    const newTask = applyKindRules({
      id: `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      kind,
      title: taskData.title.trim(),
      description: taskData.description || '',
      categoryId: taskData.categoryId || 'cat-cotidianas',
      priority: taskData.priority || 'MEDIA', // 'BAIXA', 'MEDIA', 'ALTA', 'URGENTE'
      status: taskData.status || 'PENDENTE',   // 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'
      deadline: hasDeadline ? new Date(taskData.deadline).toISOString() : null,
      alertType,
      triggerMinutes,
      isArchived: false,
      completedAt: null,
      alarmFired: false,
      createdAt: now,
      updatedAt: now
    })

    tasks.unshift(newTask)
    storageManager.setItem(key, tasks)
    this._notify()
    syncService.taskCreated(newTask)
    return newTask
  }

  /**
   * RF06: Manutenção e Edição
   */
  updateTask(taskId, patch) {
    const key = this._getUserTaskKey()
    if (!key) {
      throw new Error('É necessário estar autenticado para atualizar tarefas.')
    }
    const tasks = this.getTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) throw new Error('Tarefa não encontrada.')

    const current = tasks[idx]
    const updated = applyKindRules({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    })

    // Se mudou ou limpou o deadline, ou reabriu a tarefa, reseta o alarme disparado
    if (patch.deadline !== undefined) {
      if (patch.deadline && patch.deadline !== current.deadline) {
        updated.alarmFired = false
      } else if (!patch.deadline) {
        updated.deadline = null
        updated.alarmFired = false
      }
    }
    if (patch.status === 'CONCLUIDA' && !current.completedAt) {
      updated.completedAt = new Date().toISOString()
    } else if (patch.status && patch.status !== 'CONCLUIDA') {
      updated.completedAt = null
    }

    tasks[idx] = updated
    storageManager.setItem(key, tasks)
    this._notify()
    // O servidor também precisa do que as regras do tipo ajustaram: ao virar anotação,
    // prazo, prioridade, status e alarme são apagados
    syncService.taskUpdated(taskId, { ...patch, ...this._kindDiff(current, updated) })
    return updated
  }

  _kindDiff(before, after) {
    const diff = {}
    for (const field of ['kind', 'priority', 'status', 'deadline', 'alertType', 'triggerMinutes', 'alarmFired']) {
      if (after[field] !== before[field]) diff[field] = after[field]
    }
    return diff
  }

  /**
   * Reagendamento Rápido de Prazo (RF06)
   */
  rescheduleTask(taskId, daysToAdd = 1) {
    const tasks = this.getTasks()
    const task = tasks.find(t => t.id === taskId)
    if (!task || isNote(task)) return // anotação não tem prazo para adiar

    const baseDate = task.deadline ? new Date(task.deadline) : new Date()
    const newDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    return this.updateTask(taskId, { deadline: newDate.toISOString(), alarmFired: false })
  }

  /**
   * RF07: Exclusão individual e em lote
   */
  deleteTask(taskId) {
    const key = this._getUserTaskKey()
    if (!key) return
    const tasks = this.getTasks().filter(t => t.id !== taskId)
    storageManager.setItem(key, tasks)
    this._notify()
    syncService.taskDeleted(taskId)
  }

  bulkDelete(taskIds) {
    const key = this._getUserTaskKey()
    if (!key) return
    const idsSet = new Set(taskIds)
    const tasks = this.getTasks().filter(t => !idsSet.has(t.id))
    storageManager.setItem(key, tasks)
    this._notify()
    for (const id of idsSet) syncService.taskDeleted(id)
  }

  /**
   * RF07: Arquivamento individual e em lote
   */
  archiveTask(taskId, isArchived = true) {
    return this.updateTask(taskId, { isArchived })
  }

  bulkArchive(taskIds, isArchived = true) {
    const key = this._getUserTaskKey()
    if (!key) return
    const idsSet = new Set(taskIds)
    const tasks = this.getTasks().map(t => {
      if (idsSet.has(t.id)) {
        return { ...t, isArchived, updatedAt: new Date().toISOString() }
      }
      return t
    })
    storageManager.setItem(key, tasks)
    this._notify()
    for (const id of idsSet) syncService.taskUpdated(id, { isArchived })
  }

  toggleComplete(taskId) {
    const tasks = this.getTasks()
    const task = tasks.find(t => t.id === taskId)
    if (!task || isNote(task)) return // anotação não se conclui

    const newStatus = task.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    return this.updateTask(taskId, { status: newStatus })
  }

  /**
   * Reordena a lista de tarefas persistida a partir de uma nova sequência de IDs.
   */
  reorderTasks(reorderedIds) {
    const key = this._getUserTaskKey()
    if (!key) return
    if (!Array.isArray(reorderedIds) || reorderedIds.length === 0) return
    const allTasks = this.getTasks()
    const taskMap = new Map(allTasks.map(t => [t.id, t]))
    const newTasks = []

    for (const id of reorderedIds) {
      const t = taskMap.get(id)
      if (t) {
        newTasks.push(t)
        taskMap.delete(id)
      }
    }
    // Mantém tarefas não visíveis no filtro atual ao final
    for (const t of taskMap.values()) {
      newTasks.push(t)
    }

    storageManager.setItem(key, newTasks)
    this._notify()
  }

  /**
   * RF03: Filtragem Avançada e Visualização
   */
  filterTasks({
    deadlineScope = 'all', // 'overdue', 'today', 'this_week', 'all'
    categoryId = 'all',
    priority = 'all',
    status = 'all',       // 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'all'
    kind = 'all',         // 'TAREFA', 'ANOTACAO', 'all'
    includeArchived = false,
    searchQuery = ''
  } = {}) {
    const tasks = this.getTasks()
    const now = new Date()

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)

    return tasks.filter(task => {
      // Arquivamento
      if (!includeArchived && task.isArchived) return false
      if (includeArchived === 'only' && !task.isArchived) return false

      // Tipo de item (tarefa ou anotação)
      if (kind !== 'all' && (isNote(task) ? ITEM_KIND_NOTE : ITEM_KIND_TASK) !== kind) return false

      // Os filtros de prazo, prioridade e status são próprios de tarefa:
      // a anotação só aparece quando nenhum deles está ativo
      if (isNote(task) && (deadlineScope !== 'all' || priority !== 'all' || status !== 'all')) return false

      // Categoria
      if (categoryId !== 'all' && task.categoryId !== categoryId) return false

      // Prioridade
      if (priority !== 'all' && task.priority !== priority) return false

      // Status
      if (status !== 'all' && task.status !== status) return false

      // Busca textual
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchTitle = task.title.toLowerCase().includes(query)
        const matchDesc = (task.description || '').toLowerCase().includes(query)
        if (!matchTitle && !matchDesc) return false
      }

      // Filtro de Deadline
      if (deadlineScope !== 'all') {
        if (!task.deadline) return false
        const d = new Date(task.deadline)

        if (deadlineScope === 'overdue') {
          // Atrasada: Prazo menor que agora e não concluída
          return d < now && task.status !== 'CONCLUIDA'
        } else if (deadlineScope === 'today') {
          // Vence hoje
          return d >= startOfToday && d <= endOfToday
        } else if (deadlineScope === 'this_week') {
          // Vence nesta semana
          return d >= startOfToday && d <= endOfWeek
        }
      }

      return true
    })
  }

  getMetrics() {
    const items = this.getTasks().filter(t => !t.isArchived)
    // Os indicadores são de prazo e conclusão: anotação não entra
    const tasks = items.filter(t => !isNote(t))
    const notes = items.length - tasks.length
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)

    let overdue = 0
    let today = 0
    let thisWeek = 0
    let completed = 0

    for (const t of tasks) {
      if (t.status === 'CONCLUIDA') {
        completed++
        continue
      }
      if (t.deadline) {
        const d = new Date(t.deadline)
        if (d < now) overdue++
        if (d >= startOfToday && d <= endOfToday) today++
        if (d >= startOfToday && d <= endOfWeek) thisWeek++
      }
    }

    return { total: tasks.length, overdue, today, thisWeek, completed, notes }
  }

  _initAlarmChecker() {
    alarmService.startTicker(() => {
      const tasks = this.getTasks()
      const now = new Date().getTime()

      for (const task of tasks) {
        if (isNote(task) || task.status === 'CONCLUIDA' || task.isArchived || task.alarmFired || !task.deadline) {
          continue
        }
        const deadlineTime = new Date(task.deadline).getTime()
        const triggerTime = deadlineTime - (task.triggerMinutes || 0) * 60 * 1000

        if (now >= triggerTime) {
          // Dispara o alarme
          task.alarmFired = true
          this.updateTask(task.id, { alarmFired: true })
          alarmService.triggerAlarm(task)
          break // Toca um alarme por vez para não sobrepor
        }
      }
    })
  }
}

export const taskService = new TaskService()
