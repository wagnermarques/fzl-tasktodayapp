import { LitElement, html, css } from 'lit'
import { taskService } from '../services/task-service.js'
import '../components/task-card.js'
import '../components/task-filter-bar.js'
import '../components/task-form-dialog.js'
import '../components/task-alarm-dialog.js'

export class TaskTodayHomeView extends LitElement {
  static properties = {
    filterParams: { type: Object },
    tasks: { type: Array },
    categories: { type: Array },
    metrics: { type: Object },
    dialogOpen: { type: Boolean },
    editingTask: { type: Object },
    selectedTaskIds: { type: Array }
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      max-width: 1100px;
      margin: 0 auto;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .metric-card {
      background: var(--md-sys-color-surface-container, #f3edf7);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
    }
    .metric-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .metric-icon-box.overdue {
      background: #ba1a1a;
    }
    .metric-icon-box.today {
      background: #e65100;
    }
    .metric-icon-box.week {
      background: #1976d2;
    }
    .metric-icon-box.completed {
      background: #388e3c;
    }
    .metric-info {
      display: flex;
      flex-direction: column;
    }
    .metric-value {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #1d1b20);
      line-height: 1.1;
    }
    .metric-label {
      font-size: 0.78rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-weight: 500;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 16px 0 12px 0;
    }
    .section-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .add-task-btn {
      background: var(--md-sys-color-primary, #6750a4);
      color: var(--md-sys-color-on-primary, #ffffff);
      border: none;
      border-radius: 20px;
      padding: 8px 16px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 6px rgba(103, 80, 164, 0.3);
      transition: opacity 0.15s;
    }
    .add-task-btn:hover {
      opacity: 0.92;
    }
    .batch-toolbar {
      background: var(--md-sys-color-primary-container, #eaddff);
      color: var(--md-sys-color-on-primary-container, #21005d);
      padding: 8px 16px;
      border-radius: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.88rem;
      font-weight: 500;
    }
    .batch-actions {
      display: flex;
      gap: 8px;
    }
    .batch-btn {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }
    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      background: var(--md-sys-color-surface-container-lowest, #ffffff);
      border: 2px dashed var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 16px;
      margin-top: 16px;
      color: var(--md-sys-color-outline, #79747e);
    }
    .empty-state md-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .empty-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0 0 4px 0;
    }
  `

  constructor() {
    super()
    this.filterParams = {
      deadlineScope: 'all',
      categoryId: 'all',
      priority: 'all',
      status: 'all',
      includeArchived: false,
      searchQuery: ''
    }
    this.tasks = []
    this.categories = []
    this.metrics = { total: 0, overdue: 0, today: 0, thisWeek: 0, completed: 0 }
    this.dialogOpen = false
    this.editingTask = null
    this.selectedTaskIds = []
  }

  connectedCallback() {
    super.connectedCallback()
    this._loadData()
    this.unsubscribe = taskService.subscribe(() => {
      this._loadData()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.unsubscribe) this.unsubscribe()
  }

  _loadData() {
    this.categories = taskService.getCategories()
    this.tasks = taskService.filterTasks(this.filterParams)
    this.metrics = taskService.getMetrics()
    this.requestUpdate()
  }

  render() {
    const catMap = new Map(this.categories.map(c => [c.id, c]))

    return html`
      <!-- Métricas Rápidas -->
      <div class="metrics-grid">
        <div class="metric-card" @click=${() => this._setQuickScope('overdue')}>
          <div class="metric-icon-box overdue">
            <md-icon>warning</md-icon>
          </div>
          <div class="metric-info">
            <span class="metric-value">${this.metrics.overdue}</span>
            <span class="metric-label">Atrasadas</span>
          </div>
        </div>

        <div class="metric-card" @click=${() => this._setQuickScope('today')}>
          <div class="metric-icon-box today">
            <md-icon>today</md-icon>
          </div>
          <div class="metric-info">
            <span class="metric-value">${this.metrics.today}</span>
            <span class="metric-label">Vencem Hoje</span>
          </div>
        </div>

        <div class="metric-card" @click=${() => this._setQuickScope('this_week')}>
          <div class="metric-icon-box week">
            <md-icon>date_range</md-icon>
          </div>
          <div class="metric-info">
            <span class="metric-value">${this.metrics.thisWeek}</span>
            <span class="metric-label">Esta Semana</span>
          </div>
        </div>

        <div class="metric-card" @click=${() => this._setQuickScope('all')}>
          <div class="metric-icon-box completed">
            <md-icon>check_circle</md-icon>
          </div>
          <div class="metric-info">
            <span class="metric-value">${this.metrics.completed}</span>
            <span class="metric-label">Concluídas</span>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros Avançada -->
      <task-filter-bar
        .categories=${this.categories}
        .activeDeadline=${this.filterParams.deadlineScope}
        .activeCategory=${this.filterParams.categoryId}
        .activePriority=${this.filterParams.priority}
        .activeStatus=${this.filterParams.status}
        .searchQuery=${this.filterParams.searchQuery}
        @filter-change=${this._onFilterChange}
      ></task-filter-bar>

      <!-- Cabeçalho da Lista -->
      <div class="section-header">
        <h2 class="section-title">
          <md-icon>checklist</md-icon> Tarefas (${this.tasks.length})
        </h2>
        <button class="add-task-btn" @click=${this._openCreateModal}>
          <md-icon>add</md-icon> Nova Tarefa
        </button>
      </div>

      <!-- Grade de Tarefas -->
      ${this.tasks.length === 0 ? html`
        <div class="empty-state">
          <md-icon>task_alt</md-icon>
          <h3 class="empty-title">Nenhuma tarefa encontrada</h3>
          <p>Crie uma nova tarefa ou ajuste os filtros para visualizar suas atividades.</p>
          <button class="add-task-btn" style="margin-top: 12px;" @click=${this._openCreateModal}>
            <md-icon>add</md-icon> Criar Tarefa Agora
          </button>
        </div>
      ` : html`
        <div class="tasks-grid">
          ${this.tasks.map(task => html`
            <task-card
              .task=${task}
              .category=${catMap.get(task.categoryId)}
              @toggle-complete=${this._handleToggleComplete}
              @reschedule=${this._handleReschedule}
              @edit-task=${this._handleEditTask}
              @toggle-archive=${this._handleToggleArchive}
              @delete-task=${this._handleDeleteTask}
            ></task-card>
          `)}
        </div>
      `}

      <!-- Modal de Formulário -->
      <task-form-dialog
        .open=${this.dialogOpen}
        .task=${this.editingTask}
        .categories=${this.categories}
        .isEditing=${!!this.editingTask}
        @save-task=${this._handleSaveTask}
        @close-dialog=${() => { this.dialogOpen = false; this.editingTask = null }}
      ></task-form-dialog>

      <!-- Modal de Alarme Ativo -->
      <task-alarm-dialog
        @complete-alarm-task=${this._handleCompleteAlarmTask}
      ></task-alarm-dialog>
    `
  }

  _setQuickScope(scope) {
    this.filterParams = {
      ...this.filterParams,
      deadlineScope: scope,
      status: scope === 'all' ? 'all' : 'PENDENTE'
    }
    this._loadData()
  }

  _onFilterChange(e) {
    this.filterParams = { ...this.filterParams, ...e.detail }
    this._loadData()
  }

  _openCreateModal() {
    this.editingTask = null
    this.dialogOpen = true
  }

  _handleEditTask(e) {
    this.editingTask = e.detail.task
    this.dialogOpen = true
  }

  _handleSaveTask(e) {
    const { payload, isEditing } = e.detail
    if (isEditing && payload.id) {
      taskService.updateTask(payload.id, payload)
    } else {
      taskService.createTask(payload)
    }
    this.dialogOpen = false
    this.editingTask = null
  }

  _handleToggleComplete(e) {
    taskService.toggleComplete(e.detail.taskId)
  }

  _handleReschedule(e) {
    taskService.rescheduleTask(e.detail.taskId, e.detail.days)
  }

  _handleToggleArchive(e) {
    taskService.archiveTask(e.detail.taskId, e.detail.isArchived)
  }

  _handleDeleteTask(e) {
    if (confirm('Deseja realmente excluir esta tarefa?')) {
      taskService.deleteTask(e.detail.taskId)
    }
  }

  _handleCompleteAlarmTask(e) {
    taskService.updateTask(e.detail.taskId, { status: 'CONCLUIDA' })
  }
}

customElements.define('task-today-home-view', TaskTodayHomeView)
