import { LitElement, html, css } from 'lit'

export class TaskFilterBar extends LitElement {
  static properties = {
    categories: { type: Array },
    activeDeadline: { type: String },
    activeCategory: { type: String },
    activePriority: { type: String },
    activeStatus: { type: String },
    searchQuery: { type: String }
  }

  static styles = css`
    :host {
      display: block;
    }
    .filter-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--md-sys-color-surface-container, #f3edf7);
      padding: 12px 16px;
      border-radius: 12px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }
    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .filter-chip {
      background: var(--md-sys-color-surface, #ffffff);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--md-sys-color-on-surface, #1d1b20);
      transition: all 0.2s;
    }
    .filter-chip:hover {
      background: var(--md-sys-color-surface-container-high, #ece6f0);
    }
    .filter-chip.active {
      background: var(--md-sys-color-primary, #6750a4);
      color: var(--md-sys-color-on-primary, #ffffff);
      border-color: var(--md-sys-color-primary, #6750a4);
    }
    .filter-chip.active md-icon {
      color: var(--md-sys-color-on-primary, #ffffff);
    }
    .filter-chip md-icon {
      font-size: 16px;
      color: var(--md-sys-color-primary, #6750a4);
    }
    .filter-chip.overdue.active {
      background: #ba1a1a;
      border-color: #ba1a1a;
    }
    .filter-chip.today.active {
      background: #e65100;
      border-color: #e65100;
    }
    .dropdowns-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .select-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.82rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    select, input {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #1d1b20);
      font-size: 0.85rem;
      outline: none;
    }
    select:focus, input:focus {
      border-color: var(--md-sys-color-primary, #6750a4);
    }
    .search-input {
      flex: 1;
      min-width: 180px;
    }
  `

  constructor() {
    super()
    this.categories = []
    this.activeDeadline = 'all'
    this.activeCategory = 'all'
    this.activePriority = 'all'
    this.activeStatus = 'all'
    this.searchQuery = ''
  }

  render() {
    return html`
      <div class="filter-container">
        <div class="chips-row">
          <button
            class="filter-chip ${this.activeDeadline === 'all' ? 'active' : ''}"
            @click=${() => this._setDeadline('all')}
          >
            <md-icon>dashboard</md-icon> Todas
          </button>
          <button
            class="filter-chip overdue ${this.activeDeadline === 'overdue' ? 'active' : ''}"
            @click=${() => this._setDeadline('overdue')}
          >
            <md-icon>warning</md-icon> Atrasadas
          </button>
          <button
            class="filter-chip today ${this.activeDeadline === 'today' ? 'active' : ''}"
            @click=${() => this._setDeadline('today')}
          >
            <md-icon>today</md-icon> Vencem Hoje
          </button>
          <button
            class="filter-chip ${this.activeDeadline === 'this_week' ? 'active' : ''}"
            @click=${() => this._setDeadline('this_week')}
          >
            <md-icon>date_range</md-icon> Esta Semana
          </button>
        </div>

        <div class="dropdowns-row">
          <div class="select-wrapper">
            <label>Categoria:</label>
            <select .value=${this.activeCategory} @change=${this._onCategoryChange}>
              <option value="all">Todas as Categorias</option>
              ${this.categories.map(
                cat => html`<option value=${cat.id}>${cat.name}</option>`
              )}
            </select>
          </div>

          <div class="select-wrapper">
            <label>Prioridade:</label>
            <select .value=${this.activePriority} @change=${this._onPriorityChange}>
              <option value="all">Todas</option>
              <option value="URGENTE">Urgente</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
          </div>

          <div class="select-wrapper">
            <label>Status:</label>
            <select .value=${this.activeStatus} @change=${this._onStatusChange}>
              <option value="all">Todos (Não Arquivadas)</option>
              <option value="PENDENTE">Pendentes</option>
              <option value="CONCLUIDA">Concluídas</option>
              <option value="ARQUIVADAS">Arquivadas</option>
            </select>
          </div>

          <input
            type="search"
            class="search-input"
            placeholder="Buscar por título ou descrição..."
            .value=${this.searchQuery}
            @input=${this._onSearchInput}
          />
        </div>
      </div>
    `
  }

  _setDeadline(scope) {
    this.activeDeadline = scope
    this._emitFilterChange()
  }

  _onCategoryChange(e) {
    this.activeCategory = e.target.value
    this._emitFilterChange()
  }

  _onPriorityChange(e) {
    this.activePriority = e.target.value
    this._emitFilterChange()
  }

  _onStatusChange(e) {
    this.activeStatus = e.target.value
    this._emitFilterChange()
  }

  _onSearchInput(e) {
    this.searchQuery = e.target.value
    this._emitFilterChange()
  }

  _emitFilterChange() {
    this.dispatchEvent(
      new CustomEvent('filter-change', {
        detail: {
          deadlineScope: this.activeDeadline,
          categoryId: this.activeCategory,
          priority: this.activePriority,
          status: this.activeStatus === 'ARQUIVADAS' ? 'all' : this.activeStatus,
          includeArchived: this.activeStatus === 'ARQUIVADAS' ? 'only' : false,
          searchQuery: this.searchQuery
        },
        bubbles: true,
        composed: true
      })
    )
  }
}

customElements.define('task-filter-bar', TaskFilterBar)
