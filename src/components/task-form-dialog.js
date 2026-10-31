import { LitElement, html, css } from 'lit'
import '@fzl/webcomponents-lit/button'
import './rich-text-editor.js'
import { ITEM_KIND_TASK, ITEM_KIND_NOTE, isNote } from '../services/storage.js'

export class TaskFormDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    task: { type: Object },
    categories: { type: Array },
    isEditing: { type: Boolean },
    /** Tipo pré-selecionado ao abrir para criação (vem da categoria em foco) */
    defaultKind: { type: String },
    /** Categoria pré-selecionada ao abrir para criação (a que está em foco na lista) */
    defaultCategoryId: { type: String },
    _kind: { type: String, state: true }
  }

  static styles = css`
    :host {
      display: block;
    }
    .dialog-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease-in-out;
    }
    .dialog-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .dialog-box {
      background: var(--md-sys-color-surface, #ffffff);
      border-radius: 16px;
      width: 90%;
      max-width: 520px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      gap: 16px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dialog-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
    }
    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      padding: 4px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    input[type="text"], input[type="datetime-local"], textarea, select {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      color: var(--md-sys-color-on-surface, #1d1b20);
      font-size: 0.95rem;
      font-family: inherit;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: var(--md-sys-color-primary, #6750a4);
      background: var(--md-sys-color-surface, #ffffff);
    }
    .row-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 8px;
    }
    .btn {
      padding: 10px 18px;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-secondary {
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .btn-primary {
      background: var(--md-sys-color-primary, #6750a4);
      color: var(--md-sys-color-on-primary, #ffffff);
    }
    .btn-primary:hover {
      opacity: 0.92;
    }
    /* Seletor de tipo: tarefa (com prazo e alarme) ou anotação (só conteúdo) */
    .kind-switch {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      border-radius: 22px;
      padding: 4px;
    }
    .kind-option {
      background: none;
      border: none;
      border-radius: 18px;
      padding: 8px 10px;
      font-size: 0.88rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s, color 0.15s;
    }
    .kind-option md-icon {
      font-size: 18px;
    }
    .kind-option.selected {
      background: var(--md-sys-color-primary, #6750a4);
      color: var(--md-sys-color-on-primary, #ffffff);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    }
    .kind-hint {
      font-size: 0.78rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 0;
    }
  `

  constructor() {
    super()
    this.open = false
    this.task = null
    this.categories = []
    this.isEditing = false
    this.defaultKind = ITEM_KIND_TASK
    this.defaultCategoryId = ''
    this._kind = ITEM_KIND_TASK
    this._description = ''
  }

  updated(changedProps) {
    if (changedProps.has('open') && this.open) {
      this._description = this.task?.description || ''
      // Na edição vale o tipo do próprio item; na criação, o sugerido pela categoria em foco
      this._kind = this.task
        ? (isNote(this.task) ? ITEM_KIND_NOTE : ITEM_KIND_TASK)
        : (this.defaultKind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK)
    }
  }

  _formatForInput(isoString) {
    if (!isoString) return ''
    const d = new Date(isoString)
    const pad = n => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  render() {
    const t = this.task || {}
    const defaultDeadline = t.deadline ? this._formatForInput(t.deadline) : ''
    const asNote = this._kind === ITEM_KIND_NOTE
    const noun = asNote ? 'Anotação' : 'Tarefa'
    const selectedCategory = t.categoryId || this.defaultCategoryId || 'cat-cotidianas'

    return html`
      <div class="dialog-backdrop ${this.open ? 'open' : ''}">
        <div class="dialog-box">
          <div class="dialog-header">
            <h2 class="dialog-title">${this.isEditing ? `Editar ${noun}` : `Nova ${noun}`}</h2>
            <button class="close-btn" @click=${this._close}>
              <md-icon>close</md-icon>
            </button>
          </div>

          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <div class="kind-switch" role="radiogroup" aria-label="Tipo de item">
                <button
                  type="button"
                  class="kind-option ${asNote ? '' : 'selected'}"
                  role="radio"
                  aria-checked=${!asNote}
                  @click=${() => this._kind = ITEM_KIND_TASK}
                >
                  <md-icon>checklist</md-icon> Tarefa
                </button>
                <button
                  type="button"
                  class="kind-option ${asNote ? 'selected' : ''}"
                  role="radio"
                  aria-checked=${asNote}
                  @click=${() => this._kind = ITEM_KIND_NOTE}
                >
                  <md-icon>sticky_note_2</md-icon> Anotação
                </button>
              </div>
              <p class="kind-hint">
                ${asNote
                  ? 'Anotação guarda só título e conteúdo — sem prazo, prioridade ou alarme.'
                  : 'Tarefa tem prazo, prioridade e alarme pré-prazo.'}
              </p>
            </div>

            <div class="form-group">
              <label for="title">Título da ${noun} *</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                placeholder=${asNote ? 'Ex: Ideias para a próxima sprint' : 'Ex: Concluir relatório financeiro'}
                .value=${t.title || ''}
              />
            </div>

            <div class="form-group">
              <rich-text-editor
                label=${asNote ? 'Conteúdo da Anotação' : 'Descrição / Detalhes'}
                placeholder="Detalhes opcionais... use a barra para negrito, listas e links"
                .value=${this._description}
                @value-changed=${this._onDescriptionChange}
              ></rich-text-editor>
            </div>

            <div class="${asNote ? 'form-group' : 'row-2'}">
              <div class="form-group">
                <label for="categoryId">Categoria (Multiescopo)</label>
                <select id="categoryId" name="categoryId" .value=${selectedCategory} @change=${this._onCategoryChange}>
                  ${this.categories.map(
                    cat => html`<option value=${cat.id} ?selected=${selectedCategory === cat.id}>${cat.name}</option>`
                  )}
                </select>
              </div>

              ${asNote ? '' : html`
                <div class="form-group">
                  <label for="priority">Prioridade</label>
                  <select id="priority" name="priority" .value=${t.priority || 'MEDIA'}>
                    <option value="BAIXA" ?selected=${t.priority === 'BAIXA'}>Baixa</option>
                    <option value="MEDIA" ?selected=${t.priority === 'MEDIA' || !t.priority}>Média</option>
                    <option value="ALTA" ?selected=${t.priority === 'ALTA'}>Alta</option>
                    <option value="URGENTE" ?selected=${t.priority === 'URGENTE'}>Urgente</option>
                  </select>
                </div>
              `}
            </div>

            ${asNote ? '' : html`
              <div class="form-group">
                <label for="deadline">Data e Hora de Prazo (Deadline)</label>
                <input
                  type="datetime-local"
                  id="deadline"
                  name="deadline"
                  .value=${defaultDeadline}
                />
              </div>

              <div class="row-2">
                <div class="form-group">
                  <label for="alertType">Tipo de Alerta</label>
                  <select id="alertType" name="alertType" .value=${t.alertType || 'sound'}>
                    <option value="sound" ?selected=${t.alertType === 'sound' || !t.alertType}>Alarme Sonoro + Push</option>
                    <option value="notification" ?selected=${t.alertType === 'notification'}>Notificação Simples</option>
                    <option value="none" ?selected=${t.alertType === 'none'}>Nenhum</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="triggerMinutes">Gatilho Pré-Prazo</label>
                  <select id="triggerMinutes" name="triggerMinutes" .value=${String(t.triggerMinutes ?? 15)}>
                    <option value="0" ?selected=${t.triggerMinutes === 0}>No momento exato</option>
                    <option value="5" ?selected=${t.triggerMinutes === 5}>5 minutos antes</option>
                    <option value="15" ?selected=${t.triggerMinutes === 15 || t.triggerMinutes === undefined}>15 minutos antes</option>
                    <option value="30" ?selected=${t.triggerMinutes === 30}>30 minutos antes</option>
                    <option value="60" ?selected=${t.triggerMinutes === 60}>1 hora antes</option>
                    <option value="1440" ?selected=${t.triggerMinutes === 1440}>1 dia antes</option>
                  </select>
                </div>
              </div>
            `}

            <div class="dialog-footer">
              <fzl-lit-button variant="secondary" size="md" @fzl-click=${this._close}>Cancelar</fzl-lit-button>
              <fzl-lit-button variant="primary" size="md" @fzl-click=${this._triggerSubmit}>
                <md-icon>save</md-icon> ${this.isEditing ? 'Atualizar' : `Criar ${noun}`}
              </fzl-lit-button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  _triggerSubmit() {
    const form = this.shadowRoot.querySelector('form')
    if (form) form.requestSubmit()
  }

  /** A categoria sugere o tipo: escolher uma categoria de anotações já troca o seletor. */
  _onCategoryChange(e) {
    const category = this.categories.find(c => c.id === e.target.value)
    if (category?.defaultKind) {
      this._kind = category.defaultKind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK
    }
  }

  _onDescriptionChange(e) {
    this._description = e.detail.value
  }

  _close() {
    this.open = false
    this.dispatchEvent(new CustomEvent('close-dialog', { bubbles: true, composed: true }))
  }

  _handleSubmit(e) {
    e.preventDefault()
    const form = e.target
    const formData = new FormData(form)

    const payload = {
      kind: this._kind,
      title: formData.get('title'),
      description: this._description,
      categoryId: formData.get('categoryId')
    }

    // Prazo, prioridade e alarme existem só na tarefa
    if (this._kind !== ITEM_KIND_NOTE) {
      payload.priority = formData.get('priority')
      payload.deadline = formData.get('deadline') || null
      payload.alertType = formData.get('alertType')
      payload.triggerMinutes = Number(formData.get('triggerMinutes'))
    }

    if (this.isEditing && this.task?.id) {
      payload.id = this.task.id
    }

    this.dispatchEvent(
      new CustomEvent('save-task', {
        detail: { payload, isEditing: this.isEditing },
        bubbles: true,
        composed: true
      })
    )

    this.open = false
  }
}

customElements.define('task-form-dialog', TaskFormDialog)
