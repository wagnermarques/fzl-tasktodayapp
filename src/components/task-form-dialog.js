import { LitElement, html, css } from 'lit'

export class TaskFormDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    task: { type: Object },
    categories: { type: Array },
    isEditing: { type: Boolean }
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
  `

  constructor() {
    super()
    this.open = false
    this.task = null
    this.categories = []
    this.isEditing = false
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

    return html`
      <div class="dialog-backdrop ${this.open ? 'open' : ''}">
        <div class="dialog-box">
          <div class="dialog-header">
            <h2 class="dialog-title">${this.isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            <button class="close-btn" @click=${this._close}>
              <md-icon>close</md-icon>
            </button>
          </div>

          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label for="title">Título da Tarefa *</label>
              <input
                type="text"
                id="title"
                name="title"
                required
                placeholder="Ex: Concluir relatório financeiro"
                .value=${t.title || ''}
              />
            </div>

            <div class="form-group">
              <label for="description">Descrição / Detalhes</label>
              <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="Detalhes opcionais..."
                .value=${t.description || ''}
              ></textarea>
            </div>

            <div class="row-2">
              <div class="form-group">
                <label for="categoryId">Categoria (Multiescopo)</label>
                <select id="categoryId" name="categoryId" .value=${t.categoryId || 'cat-cotidianas'}>
                  ${this.categories.map(
                    cat => html`<option value=${cat.id} ?selected=${t.categoryId === cat.id}>${cat.name}</option>`
                  )}
                </select>
              </div>

              <div class="form-group">
                <label for="priority">Prioridade</label>
                <select id="priority" name="priority" .value=${t.priority || 'MEDIA'}>
                  <option value="BAIXA" ?selected=${t.priority === 'BAIXA'}>Baixa</option>
                  <option value="MEDIA" ?selected=${t.priority === 'MEDIA' || !t.priority}>Média</option>
                  <option value="ALTA" ?selected=${t.priority === 'ALTA'}>Alta</option>
                  <option value="URGENTE" ?selected=${t.priority === 'URGENTE'}>Urgente</option>
                </select>
              </div>
            </div>

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

            <div class="dialog-footer">
              <button type="button" class="btn btn-secondary" @click=${this._close}>Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <md-icon>save</md-icon> ${this.isEditing ? 'Atualizar' : 'Criar Tarefa'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `
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
      title: formData.get('title'),
      description: formData.get('description'),
      categoryId: formData.get('categoryId'),
      priority: formData.get('priority'),
      deadline: formData.get('deadline') || null,
      alertType: formData.get('alertType'),
      triggerMinutes: Number(formData.get('triggerMinutes')) || 15
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
