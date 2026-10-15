/**
 * Gerenciador de armazenamento local e cache offline para o Task Today App.
 */

const STORAGE_PREFIX = 'fzl-tasktodayapp:'

export function getStorageItem(key, fallback = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch (err) {
    console.error(`Erro ao ler ${key} do localStorage:`, err)
    return fallback
  }
}

export function setStorageItem(key, value) {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(STORAGE_PREFIX + key)
    } else {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
    }
  } catch (err) {
    console.error(`Erro ao gravar ${key} no localStorage:`, err)
  }
}

// Categorias Nativas Obrigatórias (RF02)
export const NATIVE_CATEGORIES = [
  { id: 'cat-cursos', name: 'Cursos', color: '#1976d2', icon: 'school', isNative: true },
  { id: 'cat-cotidianas', name: 'Tarefas Cotidianas', color: '#388e3c', icon: 'routine', isNative: true },
  { id: 'cat-financeira', name: 'Financeira', color: '#f57c00', icon: 'payments', isNative: true },
  { id: 'cat-pessoais', name: 'Pessoais', color: '#7b1fa2', icon: 'person', isNative: true }
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

// Inicializa dados padrão caso seja o primeiro acesso
export function initSeedData() {
  const existingCategories = getStorageItem('categories', null)
  if (!existingCategories || existingCategories.length === 0) {
    setStorageItem('categories', NATIVE_CATEGORIES)
  }

  const existingSettings = getStorageItem('settings:alerts', null)
  if (!existingSettings) {
    setStorageItem('settings:alerts', DEFAULT_ALERT_SETTINGS)
  }

  const existingTasks = getStorageItem('tasks', null)
  if (!existingTasks) {
    const now = new Date()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0)
    const overdueDate = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2h atrás
    const thisWeekDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 dias

    const sampleTasks = [
      {
        id: 'task-sample-1',
        title: 'Revisar módulo de Arquitetura Apache Camel',
        description: 'Concluir a leitura dos bundles de integração e rotas REST do Apache Karaf.',
        categoryId: 'cat-cursos',
        priority: 'ALTA',
        status: 'PENDENTE',
        deadline: todayEnd.toISOString(),
        alertType: 'sound',
        triggerMinutes: 30,
        isArchived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'task-sample-2',
        title: 'Pagamento da fatura de serviços Cloud',
        description: 'Efetuar pagamento da infraestrutura via aplicativo do banco.',
        categoryId: 'cat-financeira',
        priority: 'URGENTE',
        status: 'PENDENTE',
        deadline: overdueDate.toISOString(),
        alertType: 'sound',
        triggerMinutes: 60,
        isArchived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'task-sample-3',
        title: 'Comprar itens de mercado para a semana',
        description: 'Frutas, vegetais e mantimentos para a rotina diária.',
        categoryId: 'cat-cotidianas',
        priority: 'MEDIA',
        status: 'PENDENTE',
        deadline: thisWeekDate.toISOString(),
        alertType: 'notification',
        triggerMinutes: 15,
        isArchived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ]
    setStorageItem('tasks', sampleTasks)
  }
}
