/**
 * Serviço de Gerenciamento de Tarefas e Filtros Avançados (RF01, RF03, RF06, RF07)
 */

import { getStorageItem, setStorageItem, initSeedData } from './storage.js'
import { alarmService } from './alarm-service.js'

class TaskService {
  constructor() {
    initSeedData()
    this.listeners = new Set()
    this._initAlarmChecker()
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
    return getStorageItem('tasks', [])
  }

  getCategories() {
    return getStorageItem('categories', [])
  }

  saveCategories(categories) {
    setStorageItem('categories', categories)
    this._notify()
  }

  addCategory(category) {
    const cats = this.getCategories()
    const newCat = {
      id: category.id || `cat-${Date.now()}`,
      name: category.name,
      color: category.color || '#1976d2',
      icon: category.icon || 'folder',
      isNative: false,
      createdAt: new Date().toISOString()
    }
    cats.push(newCat)
    this.saveCategories(cats)
    return newCat
  }

  deleteCategory(categoryId) {
    const cats = this.getCategories().filter(c => c.id !== categoryId || c.isNative)
    this.saveCategories(cats)
  }

  /**
   * RF01: Cadastro de Tarefa
   */
  createTask(taskData) {
    const tasks = this.getTasks()
    const newTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: taskData.title.trim(),
      description: taskData.description || '',
      categoryId: taskData.categoryId || 'cat-cotidianas',
      priority: taskData.priority || 'MEDIA', // 'BAIXA', 'MEDIA', 'ALTA', 'URGENTE'
      status: taskData.status || 'PENDENTE',   // 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'
      deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
      alertType: taskData.alertType || 'sound', // 'sound', 'notification', 'none'
      triggerMinutes: Number(taskData.triggerMinutes) || 15,
      isArchived: false,
      completedAt: null,
      alarmFired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    tasks.unshift(newTask)
    setStorageItem('tasks', tasks)
    this._notify()
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
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    }

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
    setStorageItem('tasks', tasks)
    this._notify()
    return updated
  }

  /**
   * Reagendamento Rápido de Prazo (RF06)
   */
  rescheduleTask(taskId, daysToAdd = 1) {
    const tasks = this.getTasks()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const baseDate = task.deadline ? new Date(task.deadline) : new Date()
    const newDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
    return this.updateTask(taskId, { deadline: newDate.toISOString(), alarmFired: false })
  }

  /**
   * RF07: Exclusão individual e em lote
   */
  deleteTask(taskId) {
    const tasks = this.getTasks().filter(t => t.id !== taskId)
    setStorageItem('tasks', tasks)
    this._notify()
  }

  bulkDelete(taskIds) {
    const idsSet = new Set(taskIds)
    const tasks = this.getTasks().filter(t => !idsSet.has(t.id))
    setStorageItem('tasks', tasks)
    this._notify()
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
    setStorageItem('tasks', tasks)
    this._notify()
  }

  toggleComplete(taskId) {
    const tasks = this.getTasks()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

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
    const tasks = this.getTasks().filter(t => !t.isArchived)
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

    return { total: tasks.length, overdue, today, thisWeek, completed }
  }

  _initAlarmChecker() {
    alarmService.startTicker(() => {
      const tasks = this.getTasks()
      const now = new Date().getTime()

      for (const task of tasks) {
        if (task.status === 'CONCLUIDA' || task.isArchived || task.alarmFired || !task.deadline) {
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
