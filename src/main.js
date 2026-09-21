import { html } from 'lit'
import './styles/app.css'
import 'fzl-fund-appshell--lit/styles/theme.css'
import { createAppShell, pattern } from 'fzl-fund-appshell--lit'

// Views
import './views/task-today-home-view.js'
import './views/task-categories-view.js'
import './views/task-alarms-config-view.js'
import './views/task-integrations-view.js'

createAppShell({
  mount: '#app',
  title: 'Task Today App',
  home: () => html`<task-today-home-view></task-today-home-view>`,
  routes: [
    {
      name: 'tarefas',
      match: pattern('/tarefas/*resto'),
      render: ({ params }) => {
        const filter = params.resto || 'all'
        return html`<task-today-home-view .filterParams=${{
          deadlineScope: filter === 'archived' ? 'all' : filter,
          categoryId: 'all',
          priority: 'all',
          status: filter === 'archived' ? 'all' : 'PENDENTE',
          includeArchived: filter === 'archived' ? 'only' : false,
          searchQuery: ''
        }}></task-today-home-view>`
      }
    },
    {
      name: 'categorias',
      match: pattern('/categorias'),
      render: () => html`<task-categories-view></task-categories-view>`
    },
    {
      name: 'alarmes',
      match: pattern('/alarmes'),
      render: () => html`<task-alarms-config-view></task-alarms-config-view>`
    },
    {
      name: 'integracoes',
      match: pattern('/integracoes'),
      render: () => html`<task-integrations-view></task-integrations-view>`
    }
  ],
  drawer: {
    sections: [
      {
        id: 'tarefas-section',
        label: 'Tarefas por Prazo',
        items: [
          { label: 'Todas as Tarefas', href: '#/tarefas/all', icon: 'dashboard' },
          { label: 'Atrasadas', href: '#/tarefas/overdue', icon: 'warning' },
          { label: 'Vencem Hoje', href: '#/tarefas/today', icon: 'today' },
          { label: 'Esta Semana', href: '#/tarefas/this_week', icon: 'date_range' },
          { label: 'Arquivadas', href: '#/tarefas/archived', icon: 'archive' }
        ]
      },
      {
        id: 'gestao-section',
        label: 'Gestão & Configurações',
        items: [
          { label: 'Categorias (Multiescopo)', href: '#/categorias', icon: 'category' },
          { label: 'Alertas & Push (VAPID)', href: '#/alarmes', icon: 'notifications_active' },
          { label: 'Integrações Multiplataforma', href: '#/integracoes', icon: 'sync_alt' }
        ]
      }
    ]
  },
  headerActions: () => html`
    <a
      href="#/alarmes"
      title="Alertas & Push"
      style="color: var(--md-sys-color-on-primary, #ffffff); text-decoration: none; display: flex; align-items: center; margin-right: 8px;"
    >
      <md-icon>notifications_active</md-icon>
    </a>
  `
})
