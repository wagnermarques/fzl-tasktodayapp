import { LitElement, html, css } from 'lit'
import './task-deadline-badge.js'

export class TaskCard extends LitElement {
  static properties = {
    task: { type: Object },
    category: { type: Object }
  }

  static styles = css`
    :host {
      display: block;
    }
    .card {
      background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: box-shadow 0.2s, border-color 0.2s, transform 0.1s;
    }
    .card:hover {
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
      border-color: var(--md-sys-color-outline, #79747e);
    }
    .card.completed {
      opacity: 0.7;
      background-color: var(--md-sys-color-surface-container, #f3edf7);
    }
    .card.completed .title {
      text-decoration: line-through;
      color: var(--md-sys-color-outline, #79747e);
    }
    .header-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .checkbox-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-primary, #6750a4);
      margin-top: 2px;
    }
    .checkbox-btn md-icon {
      font-size: 24px;
    }
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    .title-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0;
      word-break: break-word;
    }
    .priority-pill {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .priority-URGENTE {
      background: #b3261e;
      color: #ffffff;
    }
    .priority-ALTA {
      background: #e65100;
      color: #ffffff;
    }
    .priority-MEDIA {
      background: #f9a825;
      color: #212121;
    }
    .priority-BAIXA {
      background: #78909c;
      color: #ffffff;
    }
    .description {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 0;
      line-height: 1.4;
      white-space: pre-line;
      word-break: break-word;
    }
    .meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    .category-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 0.75rem;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      color: #ffffff;
    }
    .category-chip md-icon {
      font-size: 13px;
    }
    .actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--md-sys-color-outline-variant, #e7e0ec);
      padding-top: 8px;
      margin-top: 2px;
    }
    .quick-reschedule {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .action-btn {
      background: transparent;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 6px;
      font-size: 0.72rem;
      padding: 3px 6px;
      cursor: pointer;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      display: inline-flex;
      align-items: center;
      gap: 2px;
      transition: background 0.15s;
    }
    .action-btn:hover {
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-primary, #6750a4);
    }
    .action-btn.icon-only {
      border: none;
      padding: 4px;
      border-radius: 50%;
    }
    .right-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  `

  render() {
    if (!this.task) return html``

    const isCompleted = this.task.status === 'CONCLUIDA'
    const catColor = this.category?.color || '#6750a4'
    const catIcon = this.category?.icon || 'label'
    const catName = this.category?.name || 'Geral'

    return html`
      <div class="card ${isCompleted ? 'completed' : ''}">
        <div class="header-row">
          <button
            class="checkbox-btn"
            @click=${this._toggleComplete}
            title=${isCompleted ? 'Marcar como pendente' : 'Concluir tarefa'}
          >
            <md-icon>${isCompleted ? 'check_box' : 'check_box_outline_blank'}</md-icon>
          </button>
          <div class="content-area">
            <div class="title-line">
              <h3 class="title">${this.task.title}</h3>
              <span class="priority-pill priority-${this.task.priority || 'MEDIA'}">${this.task.priority || 'MÉDIA'}</span>
            </div>
            ${this.task.description ? html`<p class="description">${this.task.description}</p>` : ''}
            
            <div class="meta-row">
              <span class="category-chip" style="background-color: ${catColor}">
                <md-icon>${catIcon}</md-icon>
                ${catName}
              </span>
              <task-deadline-badge
                .deadline=${this.task.deadline}
                .status=${this.task.status}
              ></task-deadline-badge>
              ${this.task.alertType === 'sound' ? html`
                <span class="action-btn" title="Alarme sonoro ativo">
                  <md-icon style="font-size: 13px;">volume_up</md-icon> ${this.task.triggerMinutes}m
                </span>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="actions-row">
          <div class="quick-reschedule">
            <span style="font-size: 0.72rem; color: var(--md-sys-color-outline);">Adiar:</span>
            <button class="action-btn" @click=${() => this._reschedule(1)} title="Adiar 1 dia">+1 dia</button>
            <button class="action-btn" @click=${() => this._reschedule(7)} title="Adiar 1 semana">+7 dias</button>
          </div>
          <div class="right-actions">
            <button class="action-btn icon-only" @click=${this._editTask} title="Editar">
              <md-icon style="font-size: 18px;">edit</md-icon>
            </button>
            <button class="action-btn icon-only" @click=${this._toggleArchive} title=${this.task.isArchived ? 'Desarquivar' : 'Arquivar'}>
              <md-icon style="font-size: 18px;">${this.task.isArchived ? 'unarchive' : 'archive'}</md-icon>
            </button>
            <button class="action-btn icon-only" @click=${this._deleteTask} title="Excluir" style="color: var(--md-sys-color-error, #ba1a1a);">
              <md-icon style="font-size: 18px;">delete</md-icon>
            </button>
          </div>
        </div>
      </div>
    `
  }

  _toggleComplete() {
    this.dispatchEvent(new CustomEvent('toggle-complete', { detail: { taskId: this.task.id }, bubbles: true, composed: true }))
  }

  _reschedule(days) {
    this.dispatchEvent(new CustomEvent('reschedule', { detail: { taskId: this.task.id, days }, bubbles: true, composed: true }))
  }

  _editTask() {
    this.dispatchEvent(new CustomEvent('edit-task', { detail: { task: this.task }, bubbles: true, composed: true }))
  }

  _toggleArchive() {
    this.dispatchEvent(new CustomEvent('toggle-archive', { detail: { taskId: this.task.id, isArchived: !this.task.isArchived }, bubbles: true, composed: true }))
  }

  _deleteTask() {
    this.dispatchEvent(new CustomEvent('delete-task', { detail: { taskId: this.task.id }, bubbles: true, composed: true }))
  }
}

customElements.define('task-card', TaskCard)
