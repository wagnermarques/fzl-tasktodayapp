import { LitElement, html, css } from 'lit'
import { live } from 'lit/directives/live.js'
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
    _kind: { type: String, state: true },
    _description: { type: String, state: true },
    _currentDeadline: { type: String, state: true },
    _currentAlertType: { type: String, state: true },
    _currentTriggerMinutes: { type: String, state: true }
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
      align-items: center;
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
    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .clear-field-btn {
      background: none;
      border: none;
      color: var(--md-sys-color-primary, #6750a4);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      padding: 0;
      text-decoration: underline;
    }
    .clear-field-btn:hover {
      opacity: 0.8;
    }
    .optional-label {
      font-size: 0.75rem;
      font-weight: normal;
      color: var(--md-sys-color-outline, #79747e);
    }
    .field-hint {
      font-size: 0.75rem;
      color: var(--md-sys-color-outline, #79747e);
      margin: 2px 0 0 0;
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
    this._currentDeadline = ''
    this._currentAlertType = 'none'
    this._currentTriggerMinutes = ''
  }

  connectedCallback() {
    super.connectedCallback()
    this._handleKeyDown = (e) => {
      if (this.open && e.key === 'Escape') {
        this._close()
      }
    }
    window.addEventListener('keydown', this._handleKeyDown)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._handleKeyDown) {
      window.removeEventListener('keydown', this._handleKeyDown)
    }
  }

  willUpdate(changedProps) {
    if (changedProps.has('open') || changedProps.has('task')) {
      if (this.open) {
        this._description = this.task?.description || ''
        // Na edição vale o tipo do próprio item; na criação, o sugerido pela categoria em foco
        this._kind = this.task
          ? (isNote(this.task) ? ITEM_KIND_NOTE : ITEM_KIND_TASK)
          : (this.defaultKind === ITEM_KIND_NOTE ? ITEM_KIND_NOTE : ITEM_KIND_TASK)
        this._currentDeadline = this.task?.deadline ? this._formatForInput(this.task.deadline) : ''
        this._currentAlertType = this.task?.alertType || (this.task?.deadline ? 'sound' : 'none')
        this._currentTriggerMinutes = this.task?.triggerMinutes != null ? String(this.task.triggerMinutes) : ''
      } else {
        this._description = ''
        this._currentDeadline = ''
        this._currentAlertType = 'none'
        this._currentTriggerMinutes = ''
      }
    }
  }

  updated(changedProps) {
    if (changedProps.has('open') || changedProps.has('task')) {
      if (this.open) {
        this._syncFormInputs()
      } else {
        this._resetForm()
      }
    }
  }

  _syncFormInputs() {
    const t = this.task || {}
    const defaultDeadline = t.deadline ? this._formatForInput(t.deadline) : ''
    const selectedCategory = t.categoryId || this.defaultCategoryId || 'cat-cotidianas'
    const alertVal = t.alertType || (t.deadline ? 'sound' : 'none')
    const triggerVal = t.triggerMinutes != null ? String(t.triggerMinutes) : ''

    const form = this.shadowRoot?.querySelector('form')
    if (!form) return

    const titleEl = form.querySelector('#title')
    if (titleEl) titleEl.value = t.title || ''

    const descEl = form.querySelector('rich-text-editor')
    if (descEl) {
      if (typeof descEl.setValue === 'function') {
        descEl.setValue(this._description || '')
      } else {
        descEl.value = this._description || ''
      }
    }

    const catEl = form.querySelector('#categoryId')
    if (catEl) catEl.value = selectedCategory

    const prioEl = form.querySelector('#priority')
    if (prioEl) prioEl.value = t.priority || 'MEDIA'

    const dlEl = form.querySelector('#deadline')
    if (dlEl) dlEl.value = defaultDeadline

    const alertEl = form.querySelector('#alertType')
    if (alertEl) alertEl.value = alertVal

    const trigEl = form.querySelector('#triggerMinutes')
    if (trigEl) trigEl.value = triggerVal
  }

  _resetForm() {
    this._description = ''
    this._currentDeadline = ''
    this._currentAlertType = 'none'
    this._currentTriggerMinutes = ''
    const form = this.shadowRoot?.querySelector('form')
    if (form) form.reset()
    const descEl = this.shadowRoot?.querySelector('rich-text-editor')
    if (descEl && typeof descEl.setValue === 'function') {
      descEl.setValue('')
    }
  }

  _onDeadlineChange(e) {
    this._currentDeadline = e.target.value || ''
    if (!this._currentDeadline) {
      this._currentAlertType = 'none'
      this._currentTriggerMinutes = ''
    }
  }

  _clearDeadline() {
    this._currentDeadline = ''
    this._currentAlertType = 'none'
    this._currentTriggerMinutes = ''
    const dlEl = this.shadowRoot?.querySelector('#deadline')
    if (dlEl) dlEl.value = ''
    const alertEl = this.shadowRoot?.querySelector('#alertType')
    if (alertEl) alertEl.value = 'none'
    const trigEl = this.shadowRoot?.querySelector('#triggerMinutes')
    if (trigEl) trigEl.value = ''
  }

  _onAlertTypeChange(e) {
    this._currentAlertType = e.target.value
    if (this._currentAlertType === 'none') {
      this._currentTriggerMinutes = ''
    } else if (!this._currentTriggerMinutes) {
      this._currentTriggerMinutes = '15'
    }
  }

  _onTriggerChange(e) {
    this._currentTriggerMinutes = e.target.value
  }

  _handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      this._close()
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
                  : 'Tarefa tem prioridade, com prazo e alertas opcionais.'}
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
                .value=${live(t.title || '')}
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
                <select id="categoryId" name="categoryId" .value=${live(selectedCategory)} @change=${this._onCategoryChange}>
                  ${this.categories.map(
                    cat => html`<option value=${cat.id} ?selected=${selectedCategory === cat.id}>${cat.name}</option>`
                  )}
                </select>
              </div>

              ${asNote ? '' : html`
                <div class="form-group">
                  <label for="priority">Prioridade</label>
                  <select id="priority" name="priority" .value=${live(t.priority || 'MEDIA')}>
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
                <div class="field-label-row">
                  <label for="deadline">Data e Hora de Prazo (Deadline) <span class="optional-label">(opcional)</span></label>
                  ${this._currentDeadline ? html`
                    <button
                      type="button"
                      class="clear-field-btn"
                      @click=${this._clearDeadline}
                      title="Remover prazo desta tarefa"
                    >
                      Remover prazo
                    </button>
                  ` : ''}
                </div>
                <input
                  type="datetime-local"
                  id="deadline"
                  name="deadline"
                  .value=${live(this._currentDeadline)}
                  @input=${this._onDeadlineChange}
                />
              </div>

              <div class="row-2">
                <div class="form-group">
                  <label for="alertType">Tipo de Alerta <span class="optional-label">(opcional)</span></label>
                  <select
                    id="alertType"
                    name="alertType"
                    .value=${live(this._currentAlertType)}
                    @change=${this._onAlertTypeChange}
                    ?disabled=${!this._currentDeadline}
                  >
                    <option value="none" ?selected=${this._currentAlertType === 'none'}>Nenhum</option>
                    <option value="sound" ?selected=${this._currentAlertType === 'sound'}>Alarme Sonoro + Push</option>
                    <option value="notification" ?selected=${this._currentAlertType === 'notification'}>Notificação Simples</option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="triggerMinutes">Gatilho Pré-Prazo <span class="optional-label">(opcional)</span></label>
                  <select
                    id="triggerMinutes"
                    name="triggerMinutes"
                    .value=${live(this._currentTriggerMinutes)}
                    @change=${this._onTriggerChange}
                    ?disabled=${!this._currentDeadline || this._currentAlertType === 'none'}
                  >
                    <option value="" ?selected=${this._currentTriggerMinutes === ''}>Nenhum</option>
                    <option value="0" ?selected=${this._currentTriggerMinutes === '0'}>No momento exato</option>
                    <option value="5" ?selected=${this._currentTriggerMinutes === '5'}>5 minutos antes</option>
                    <option value="15" ?selected=${this._currentTriggerMinutes === '15'}>15 minutos antes</option>
                    <option value="30" ?selected=${this._currentTriggerMinutes === '30'}>30 minutos antes</option>
                    <option value="60" ?selected=${this._currentTriggerMinutes === '60'}>1 hora antes</option>
                    <option value="1440" ?selected=${this._currentTriggerMinutes === '1440'}>1 dia antes</option>
                  </select>
                </div>
              </div>
              ${!this._currentDeadline ? html`
                <p class="field-hint">Defina uma data e hora de prazo caso queira programar alarmes ou notificações.</p>
              ` : ''}
            `}

            <div class="dialog-footer">
              ${this.isEditing && this.task?.id ? html`
                <fzl-lit-button
                  type="button"
                  variant="danger"
                  size="md"
                  @fzl-click=${this._handleDelete}
                  title="Excluir ${noun}"
                >
                  <md-icon slot="icon">delete</md-icon> Excluir
                </fzl-lit-button>
              ` : ''}
              <div style="flex: 1;"></div>
              <fzl-lit-button type="button" variant="secondary" size="md" @fzl-click=${this._close}>Cancelar</fzl-lit-button>
              <fzl-lit-button type="button" variant="primary" size="md" @fzl-click=${this._triggerSubmit}>
                <md-icon slot="icon">save</md-icon> ${this.isEditing ? 'Atualizar' : `Criar ${noun}`}
              </fzl-lit-button>
            </div>
          </form>
        </div>
      </div>
    `
  }

  _handleDelete() {
    if (!this.task?.id) return
    const asNote = this._kind === ITEM_KIND_NOTE
    const noun = asNote ? 'esta anotação' : 'esta tarefa'
    if (confirm(`Deseja realmente excluir ${noun}?`)) {
      this.dispatchEvent(new CustomEvent('delete-task', {
        detail: { taskId: this.task.id, confirmed: true },
        bubbles: true,
        composed: true
      }))
      this._close()
    }
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
    this._resetForm()
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
      payload.priority = formData.get('priority') || 'MEDIA'

      const rawDeadline = formData.get('deadline')
      payload.deadline = rawDeadline ? new Date(rawDeadline).toISOString() : null

      const rawAlert = formData.get('alertType')
      payload.alertType = (!payload.deadline || !rawAlert || rawAlert === 'none') ? 'none' : rawAlert

      const rawTrigger = formData.get('triggerMinutes')
      payload.triggerMinutes = (payload.alertType === 'none' || !payload.deadline || rawTrigger === '' || rawTrigger === null || rawTrigger === undefined)
        ? null
        : Number(rawTrigger)
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
    this._resetForm()
  }
}

customElements.define('task-form-dialog', TaskFormDialog)
