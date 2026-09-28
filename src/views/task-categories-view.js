import { LitElement, html, css } from 'lit'
import { authService } from 'fzl-fund-appshell--lit'
import { taskService } from '../services/task-service.js'
import { isTaskTodayAdmin } from '../services/keycloak-provider.js'

const ICON_OPTIONS = [
  { value: 'label', label: 'Etiqueta' },
  { value: 'work', label: 'Trabalho' },
  { value: 'folder', label: 'Pasta' },
  { value: 'school', label: 'Estudos' },
  { value: 'payments', label: 'Finanças' },
  { value: 'person', label: 'Pessoal' },
  { value: 'code', label: 'Código / TI' },
  { value: 'fitness_center', label: 'Saúde / Treino' },
  { value: 'shopping_cart', label: 'Compras' },
  { value: 'flight', label: 'Viagens' },
  { value: 'home', label: 'Casa' }
]

// Mantém na lista um ícone que já está em uso mas não faz parte das opções
function iconOptions(current) {
  const options = current && !ICON_OPTIONS.some(o => o.value === current)
    ? [...ICON_OPTIONS, { value: current, label: current }]
    : ICON_OPTIONS
  return options.map(o => html`<option value=${o.value} ?selected=${o.value === current}>${o.label}</option>`)
}

export class TaskCategoriesView extends LitElement {
  static properties = {
    categories: { type: Array },
    newCategoryName: { type: String },
    newCategoryColor: { type: String },
    newCategoryIcon: { type: String },
    newCategoryNative: { type: Boolean },
    isAdmin: { type: Boolean },
    editing: { type: Object }
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      margin-bottom: 20px;
    }
    .title {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .subtitle {
      font-size: 0.9rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 0;
    }
    .add-category-card {
      background: var(--md-sys-color-surface-container, #f3edf7);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .card-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0 0 12px 0;
    }
    .form-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-end;
    }
    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-field.grow {
      flex: 1;
      min-width: 200px;
    }
    label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    input, select {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #1d1b20);
      font-size: 0.9rem;
    }
    input[type="color"] {
      padding: 2px;
      width: 48px;
      height: 38px;
      cursor: pointer;
    }
    .btn-add {
      background: var(--md-sys-color-primary, #6750a4);
      color: #ffffff;
      border: none;
      border-radius: 20px;
      padding: 8px 18px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 38px;
    }
    .categories-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .category-item {
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .category-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cat-badge {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
    }
    .cat-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }
    .cat-type {
      font-size: 0.72rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .btn-del {
      background: none;
      border: none;
      color: var(--md-sys-color-error, #ba1a1a);
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
    }
    .btn-del:hover {
      background: rgba(186, 26, 26, 0.1);
    }
    .item-actions {
      display: flex;
      gap: 2px;
    }
    .btn-icon {
      background: none;
      border: none;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
    }
    .btn-icon:hover {
      background: rgba(103, 80, 164, 0.1);
    }
    .category-item.editing {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }
    .edit-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .edit-row input[type="text"] {
      flex: 1;
      min-width: 140px;
    }
    .edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .btn-text {
      background: none;
      border: none;
      color: var(--md-sys-color-primary, #6750a4);
      font-weight: 600;
      cursor: pointer;
      padding: 6px 12px;
      border-radius: 16px;
    }
    .native-option {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .admin-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--md-sys-color-on-tertiary-container, #31111d);
      background: var(--md-sys-color-tertiary-container, #ffd8e4);
      border-radius: 12px;
      padding: 2px 10px;
      margin-top: 8px;
    }
  `

  constructor() {
    super()
    this.categories = []
    this.newCategoryName = ''
    this.newCategoryColor = '#6750a4'
    this.newCategoryIcon = 'label'
    this.newCategoryNative = false
    this.isAdmin = false
    this.editing = null
  }

  connectedCallback() {
    super.connectedCallback()
    this.categories = taskService.getCategories()
    this.unsubscribe = taskService.subscribe(() => {
      this.categories = taskService.getCategories()
      this.requestUpdate()
    })
    // O papel de administrador vem do token: reavalia a cada login/logout
    this.unsubscribeAuth = authService.subscribe(() => {
      this.isAdmin = isTaskTodayAdmin()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.unsubscribe) this.unsubscribe()
    if (this.unsubscribeAuth) this.unsubscribeAuth()
  }

  render() {
    return html`
      <div class="header">
        <h1 class="title"><md-icon>category</md-icon> Categorização Multiescopo (RF02)</h1>
        <p class="subtitle">Gerencie as categorias nativas do sistema e crie categorias personalizadas para organizar suas tarefas.</p>
        ${this.isAdmin ? html`
          <span class="admin-badge"><md-icon>admin_panel_settings</md-icon> Administrador: você pode criar, editar e excluir categorias nativas</span>
        ` : ''}
      </div>

      <div class="add-category-card">
        <h3 class="card-title">Criar Nova Categoria</h3>
        <form @submit=${this._handleAddCategory} class="form-row">
          <div class="form-field grow">
            <label>Nome da Categoria</label>
            <input
              type="text"
              required
              placeholder="Ex: Projetos FzlSoft, Saúde, etc."
              .value=${this.newCategoryName}
              @input=${e => this.newCategoryName = e.target.value}
            />
          </div>

          <div class="form-field">
            <label>Cor</label>
            <input
              type="color"
              .value=${this.newCategoryColor}
              @input=${e => this.newCategoryColor = e.target.value}
            />
          </div>

          <div class="form-field">
            <label>Ícone</label>
            <select
              .value=${this.newCategoryIcon}
              @change=${e => this.newCategoryIcon = e.target.value}
            >
              ${iconOptions(this.newCategoryIcon)}
            </select>
          </div>

          <button type="submit" class="btn-add">
            <md-icon>add</md-icon> Adicionar
          </button>
        </form>
        ${this.isAdmin ? html`
          <label class="native-option">
            <input
              type="checkbox"
              .checked=${this.newCategoryNative}
              @change=${e => this.newCategoryNative = e.target.checked}
            />
            Categoria nativa (visível para todos os usuários)
          </label>
        ` : ''}
      </div>

      <div class="categories-list">
        ${this.categories.map(cat => this.editing?.id === cat.id ? this._renderEditItem() : html`
          <div class="category-item">
            <div class="category-info">
              <div class="cat-badge" style="background-color: ${cat.color}">
                <md-icon>${cat.icon || 'label'}</md-icon>
              </div>
              <div>
                <div class="cat-name">${cat.name}</div>
                <div class="cat-type">${cat.isNative ? 'Categoria Nativa' : 'Personalizada'}</div>
              </div>
            </div>
            ${taskService.canManageCategory(cat) ? html`
              <div class="item-actions">
                <button class="btn-icon" @click=${() => this._startEdit(cat)} title="Editar Categoria">
                  <md-icon>edit</md-icon>
                </button>
                <button class="btn-del" @click=${() => this._deleteCategory(cat)} title="Excluir Categoria">
                  <md-icon>delete</md-icon>
                </button>
              </div>
            ` : ''}
          </div>
        `)}
      </div>
    `
  }

  _renderEditItem() {
    const e = this.editing
    return html`
      <form class="category-item editing" @submit=${this._saveEdit}>
        <div class="edit-row">
          <input
            type="text"
            required
            maxlength="120"
            aria-label="Nome da Categoria"
            .value=${e.name}
            @input=${ev => this.editing = { ...this.editing, name: ev.target.value }}
          />
          <input
            type="color"
            aria-label="Cor"
            .value=${e.color}
            @input=${ev => this.editing = { ...this.editing, color: ev.target.value }}
          />
          <select
            aria-label="Ícone"
            @change=${ev => this.editing = { ...this.editing, icon: ev.target.value }}
          >
            ${iconOptions(e.icon)}
          </select>
        </div>
        ${e.isNative ? html`<div class="cat-type">Categoria nativa: a alteração vale para todos os usuários.</div>` : ''}
        <div class="edit-actions">
          <button type="button" class="btn-text" @click=${() => this.editing = null}>Cancelar</button>
          <button type="submit" class="btn-add"><md-icon>check</md-icon> Salvar</button>
        </div>
      </form>
    `
  }

  _startEdit(cat) {
    this.editing = { id: cat.id, name: cat.name, color: cat.color || '#6750a4', icon: cat.icon || 'label', isNative: cat.isNative }
  }

  _saveEdit(e) {
    e.preventDefault()
    const { id, name, color, icon } = this.editing
    if (!name.trim()) return
    taskService.updateCategory(id, { name: name.trim(), color, icon })
    this.editing = null
  }

  _handleAddCategory(e) {
    e.preventDefault()
    if (!this.newCategoryName.trim()) return

    taskService.addCategory({
      name: this.newCategoryName.trim(),
      color: this.newCategoryColor,
      icon: this.newCategoryIcon,
      isNative: this.newCategoryNative
    })

    this.newCategoryName = ''
    this.newCategoryNative = false
  }

  _deleteCategory(cat) {
    const message = cat.isNative
      ? `Excluir a categoria nativa "${cat.name}"?\n\nEla some para TODOS os usuários, e as tarefas de todos que a usavam ficam sem categoria. Esta ação não pode ser desfeita.`
      : `Deseja excluir a categoria "${cat.name}"? As tarefas dela ficam sem categoria.`
    if (confirm(message)) {
      taskService.deleteCategory(cat.id)
    }
  }
}

customElements.define('task-categories-view', TaskCategoriesView)
