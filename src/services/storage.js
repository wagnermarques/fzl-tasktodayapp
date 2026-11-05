/**
 * Gerenciador de armazenamento local e cache offline para o Task Today App.
 */
class StorageManager {
  constructor(prefix = 'fzl-tasktodayapp:') {
    this.prefix = prefix
  }

  _resolveKey(key) {
    return key.startsWith(this.prefix) ? key : (this.prefix + key)
  }

  getItem(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this._resolveKey(key))
      return raw ? JSON.parse(raw) : fallback
    } catch (err) {
      console.error(`Erro ao ler ${key} do localStorage:`, err)
      return fallback
    }
  }

  setItem(key, value) {
    try {
      const resolvedKey = this._resolveKey(key)
      if (value === null || value === undefined) {
        localStorage.removeItem(resolvedKey)
      } else {
        localStorage.setItem(resolvedKey, JSON.stringify(value))
      }
    } catch (err) {
      console.error(`Erro ao gravar ${key} no localStorage:`, err)
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(this._resolveKey(key))
    } catch (err) {
      console.error(`Erro ao remover ${key} do localStorage:`, err)
    }
  }

  /** Inicializa dados padrão caso seja o primeiro acesso. */
  initSeedData() {
    const existingCategories = this.getItem('categories', null)
    if (!existingCategories || existingCategories.length === 0) {
      this.setItem('categories', NATIVE_CATEGORIES)
    }

    const existingSettings = this.getItem('settings:alerts', null)
    if (!existingSettings) {
      this.setItem('settings:alerts', DEFAULT_ALERT_SETTINGS)
    }

    // Remove tarefas legadas sem isolamento de usuário para evitar vazamento
    this.removeItem('tasks')
  }
}

// Tipos de item: a tarefa tem prazo, prioridade e alarme; a anotação é só título e conteúdo
export const ITEM_KIND_TASK = 'TAREFA'
export const ITEM_KIND_NOTE = 'ANOTACAO'

/** Itens gravados antes da distinção não têm `kind`: são tarefas. */
export const isNote = item => item?.kind === ITEM_KIND_NOTE

// Categorias Nativas Obrigatórias (RF02)
export const NATIVE_CATEGORIES = [
  { id: 'cat-cursos', name: 'Cursos', color: '#1976d2', icon: 'school', isNative: true, defaultKind: ITEM_KIND_TASK },
  { id: 'cat-cotidianas', name: 'Tarefas Cotidianas', color: '#388e3c', icon: 'routine', isNative: true, defaultKind: ITEM_KIND_TASK },
  { id: 'cat-financeira', name: 'Financeira', color: '#f57c00', icon: 'payments', isNative: true, defaultKind: ITEM_KIND_TASK },
  { id: 'cat-pessoais', name: 'Pessoais', color: '#7b1fa2', icon: 'person', isNative: true, defaultKind: ITEM_KIND_TASK }
]

// Configurações Padrão de Alertas (RF04)
export const DEFAULT_ALERT_SETTINGS = {
  soundEnabled: true,
  soundTone: 'chime', // 'chime', 'radar', 'bell', 'synth'
  volume: 0.8,
  pushEnabled: true,
  defaultTriggerMinutes: 15, // 15 minutos antes do deadline
  autoSnoozeMinutes: 5,
  browserNotification: true
}

export const storageManager = new StorageManager()
