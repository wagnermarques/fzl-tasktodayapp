import { LitElement, html, css } from 'lit'
import { taskService } from '../services/task-service.js'

export class TaskCategoriesView extends LitElement {
  static properties = {
    categories: { type: Array },
    newCategoryName: { type: String },
    newCategoryColor: { type: String },
    newCategoryIcon: { type: String }
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
  `

  constructor() {
    super()
    this.categories = []
    this.newCategoryName = ''
    this.newCategoryColor = '#6750a4'
    this.newCategoryIcon = 'label'
  }

  connectedCallback() {
    super.connectedCallback()
    this.categories = taskService.getCategories()
    this.unsubscribe = taskService.subscribe(() => {
      this.categories = taskService.getCategories()
      this.requestUpdate()
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.unsubscribe) this.unsubscribe()
  }

  render() {
    return html`
      <div class="header">
        <h1 class="title"><md-icon>category</md-icon> Categorização Multiescopo (RF02)</h1>
        <p class="subtitle">Gerencie as categorias nativas do sistema e crie categorias personalizadas para organizar suas tarefas.</p>
      </div>

      <div class="add-category-card">
        <h3 class="card-title">Criar Nova Categoria Personalizada</h3>
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
              <option value="label">Etiqueta</option>
              <option value="work">Trabalho</option>
              <option value="folder">Pasta</option>
              <option value="code">Código / TI</option>
              <option value="fitness_center">Saúde / Treino</option>
              <option value="shopping_cart">Compras</option>
              <option value="flight">Viagens</option>
              <option value="home">Casa</option>
            </select>
          </div>

          <button type="submit" class="btn-add">
            <md-icon>add</md-icon> Adicionar
          </button>
        </form>
      </div>

      <div class="categories-list">
        ${this.categories.map(cat => html`
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
            ${!cat.isNative ? html`
              <button class="btn-del" @click=${() => this._deleteCategory(cat.id)} title="Excluir Categoria">
                <md-icon>delete</md-icon>
              </button>
            ` : ''}
          </div>
        `)}
      </div>
    `
  }

  _handleAddCategory(e) {
    e.preventDefault()
    if (!this.newCategoryName.trim()) return

    taskService.addCategory({
      name: this.newCategoryName.trim(),
      color: this.newCategoryColor,
      icon: this.newCategoryIcon
    })

    this.newCategoryName = ''
  }

  _deleteCategory(id) {
    if (confirm('Deseja excluir esta categoria personalizada?')) {
      taskService.deleteCategory(id)
    }
  }
}

customElements.define('task-categories-view', TaskCategoriesView)
