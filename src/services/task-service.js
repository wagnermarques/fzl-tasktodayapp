/**
 * Serviço de Gerenciamento de Tarefas e Filtros Avançados (RF01, RF03, RF06, RF07)
 */

import { storageManager, NATIVE_CATEGORIES, ITEM_KIND_TASK, ITEM_KIND_NOTE, isNote } from './storage.js'
import { alarmService } from './alarm-service.js'
import { syncService } from './sync-service.js'
import { onSignOut, isTaskTodayAdmin } from './keycloak-provider.js'

// `0` é uma opção válida de gatilho ("no momento exato"), por isso não usamos `|| 15`;
// ausente (anotação) cai no padrão
function normalizeTriggerMinutes(value, fallback = 15) {
  if (value === null || value === undefined || value === '') return fallback
  const minutes = Number(value)
  return Number.isFinite(minutes) && minutes >= 0 ? minutes : fallback
}

/**
 * Mantém as invariantes de cada tipo de item: a tarefa tem prazo, prioridade, status e
 * alarme; a anotação é só título, conteúdo e categoria. Vale também na troca de tipo
 * durante a edição, nos dois sentidos.
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
  return {
    ...item,
    kind: ITEM_KIND_TASK,
    priority: item.priority || 'MEDIA',
    status: item.status || 'PENDENTE',
    alertType: item.alertType || 'sound',
    triggerMinutes: normalizeTriggerMinutes(item.triggerMinutes)
  }
}

class TaskService {
  constructor() {
    storageManager.initSeedData()
    this.listeners = new Set()
    this._initAlarmChecker()
    this._initSync()
  }

  _initSync() {
    // O servidor é a referência depois de cada sincronização (inclusive alarmFired,
    // para o alarme local não tocar de novo o que o push do servidor já avisou)
    syncService.onPulled(({ tasks, categories }) => {
      storageManager.setItem('tasks', this._keepLocalKinds(tasks, this.getTasks(), 'kind'))
      storageManager.setItem('categories', this._keepLocalKinds(categories, this.getCategories(), 'defaultKind'))
      this._notify()
    })
    // Os dados locais são do usuário que está saindo
    onSignOut(() => {
      syncService.clear()
      storageManager.setItem('tasks', [])
      storageManager.setItem('categories', NATIVE_CATEGORIES)
      this._notify()
    })
    syncService.start()
  }

  /**
   * Enquanto o back-end não persistir `kind`/`defaultKind`, mantém o tipo que já está
   * local para a anotação não voltar do servidor como tarefa.
   */
  _keepLocalKinds(incoming, local, field) {
    if (!Array.isArray(incoming)) return incoming
    const localById = new Map(local.map(item => [item.id, item]))
    return incoming.map(item => {
      if (item[field]) return item
      const previous = localById.get(item.id)
      return previous?.[field] ? { ...item, [field]: previous[field] } : item
    })
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
    return storageManager.getItem('tasks', [])
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
    const tasks = this.getTasks().map(t => t.categoryId === categoryId ? { ...t, categoryId: null } : t)
    storageManager.setItem('tasks', tasks)
    this._notify()
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
    const tasks = this.getTasks()
    const kind = taskData.kind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK
    const prefix = kind === ITEM_KIND_NOTE ? 'note' : 'task'
    const now = new Date().toISOString()

    const newTask = applyKindRules({
      id: `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      kind,
      title: taskData.title.trim(),
      description: taskData.description || '',
      categoryId: taskData.categoryId || 'cat-cotidianas',
      priority: taskData.priority || 'MEDIA', // 'BAIXA', 'MEDIA', 'ALTA', 'URGENTE'
      status: taskData.status || 'PENDENTE',   // 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'
      deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
      alertType: taskData.alertType || 'sound', // 'sound', 'notification', 'none'
      triggerMinutes: normalizeTriggerMinutes(taskData.triggerMinutes),
      isArchived: false,
      completedAt: null,
      alarmFired: false,
      createdAt: now,
      updatedAt: now
    })

    tasks.unshift(newTask)
    storageManager.setItem('tasks', tasks)
    this._notify()
    syncService.taskCreated(newTask)
    return newTask
  }

  /**
   * RF06: Manutenção e Edição
   */
  updateTask(taskId, patch) {
    const tasks = this.getTasks()
    const idx = tasks.findIndex(t => t.id === taskId)
    if (idx === -1) throw new Error('Tarefa não encontrada.')

    const current = tasks[idx]
    const updated = applyKindRules({
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    })

    // Se mudou o deadline ou reabriu a tarefa, reseta o alarme disparado
    if (patch.deadline && patch.deadline !== current.deadline) {
      updated.alarmFired = false
    }
    if (patch.status === 'CONCLUIDA' && !current.completedAt) {
      updated.completedAt = new Date().toISOString()
    } else if (patch.status && patch.status !== 'CONCLUIDA') {
      updated.completedAt = null
    }

    tasks[idx] = updated
    storageManager.setItem('tasks', tasks)
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
    const tasks = this.getTasks().filter(t => t.id !== taskId)
    storageManager.setItem('tasks', tasks)
    this._notify()
    syncService.taskDeleted(taskId)
  }

  bulkDelete(taskIds) {
    const idsSet = new Set(taskIds)
    const tasks = this.getTasks().filter(t => !idsSet.has(t.id))
    storageManager.setItem('tasks', tasks)
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
    const idsSet = new Set(taskIds)
    const tasks = this.getTasks().map(t => {
      if (idsSet.has(t.id)) {
        return { ...t, isArchived, updatedAt: new Date().toISOString() }
      }
      return t
    })
    storageManager.setItem('tasks', tasks)
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
