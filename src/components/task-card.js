import { LitElement, html, css } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import '@fzl/webcomponents-lit/button'
import '@fzl/webcomponents-lit/card'
import './task-deadline-badge.js'
import { DescriptionSanitizer } from '../utils/html-sanitize.js'
import { isNote } from '../services/storage.js'

export class TaskCard extends LitElement {
  static properties = {
    task: { type: Object },
    category: { type: Object },
    expanded: { type: Boolean }
  }

  static styles = css`
    :host {
      display: block;
    }
    fzl-lit-card {
      width: 100%;
    }
    fzl-lit-card::part(card) {
      background-color: var(--md-sys-color-surface-container-low, #f7f2fa);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 12px 14px;
      transition: box-shadow 0.2s, border-color 0.2s, transform 0.1s;
    }
    fzl-lit-card::part(card):hover {
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
      border-color: var(--md-sys-color-outline, #79747e);
    }
    fzl-lit-card.completed::part(card) {
      opacity: 0.7;
      background-color: var(--md-sys-color-surface-container, #f3edf7);
    }
    fzl-lit-card.note::part(card) {
      background-color: var(--md-sys-color-tertiary-container, #ffd8e4);
      border-color: var(--md-sys-color-tertiary, #7d5260);
      border-left-width: 4px;
    }
    fzl-lit-card::part(card-footer) {
      border-top: 1px solid var(--md-sys-color-outline-variant, #e7e0ec);
      padding-top: 8px;
      margin-top: 4px;
    }
    .title-row {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex-wrap: wrap;
    }
    .title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0;
      word-break: break-word;
      line-height: 1.3;
      cursor: pointer;
      user-select: none;
      transition: color 0.15s ease, text-decoration 0.15s ease;
    }
    .title:hover {
      color: var(--md-sys-color-primary, #6750a4);
      text-decoration: underline;
    }
    .title:focus-visible {
      outline: 2px solid var(--md-sys-color-primary, #6750a4);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .title.completed {
      text-decoration: line-through;
      color: var(--md-sys-color-outline, #79747e);
    }
    .checkbox-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-primary, #6750a4);
      flex-shrink: 0;
    }
    .checkbox-btn md-icon {
      font-size: 22px;
    }
    .note-icon {
      color: var(--md-sys-color-tertiary, #7d5260);
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    .note-icon md-icon {
      font-size: 20px;
    }
    .header-badges {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
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
    .kind-pill {
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: var(--md-sys-color-tertiary, #7d5260);
      color: var(--md-sys-color-on-tertiary, #ffffff);
      white-space: nowrap;
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
    .description {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 0 0 8px 0;
      line-height: 1.4;
      white-space: pre-line;
      word-break: break-word;
    }
    .description p {
      margin: 0 0 6px 0;
    }
    .description p:last-child {
      margin-bottom: 0;
    }
    .description :is(ul, ol) {
      margin: 4px 0;
      padding-left: 20px;
    }
    .description a {
      color: var(--md-sys-color-primary, #6750a4);
    }
    .meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }
    .actions-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .actions-row.note-actions {
      justify-content: flex-end;
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

    const asNote = isNote(this.task)
    const isCompleted = !asNote && this.task.status === 'CONCLUIDA'
    const catColor = this.category?.color || '#6750a4'
    const catIcon = this.category?.icon || 'label'
    const catName = this.category?.name || 'Geral'

    return html`
      <fzl-lit-card
        class="task-card-wrapper ${isCompleted ? 'completed' : ''} ${asNote ? 'note' : ''}"
        collapsible
        body-max-height="180px"
      >
        <div slot="title" class="title-row">
          ${asNote ? html`
            <span class="note-icon" title="Anotação" @click=${this._stopProp}>
              <md-icon>sticky_note_2</md-icon>
            </span>
          ` : html`
            <button
              type="button"
              class="checkbox-btn"
              @click=${this._toggleComplete}
              title=${isCompleted ? 'Marcar como pendente' : 'Concluir tarefa'}
            >
              <md-icon>${isCompleted ? 'check_box' : 'check_box_outline_blank'}</md-icon>
            </button>
          `}
          <h3
            class="title ${isCompleted ? 'completed' : ''}"
            role="button"
            tabindex="0"
            title="Abrir tarefa"
            @click=${this._editTask}
            @keydown=${(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this._editTask(e);
              }
            }}
          >${this.task.title}</h3>
        </div>

        <div slot="header-actions" class="header-badges">
          ${asNote
            ? html`<span class="kind-pill">Anotação</span>`
            : html`<span class="priority-pill priority-${this.task.priority || 'MEDIA'}">${this.task.priority || 'MÉDIA'}</span>`}
          <span class="category-chip" style="background-color: ${catColor}">
            <md-icon>${catIcon}</md-icon>
            ${catName}
          </span>
          <button
            type="button"
            class="action-btn icon-only"
            @click=${this._deleteTask}
            title="Excluir ${asNote ? 'anotação' : 'tarefa'}"
            style="color: var(--md-sys-color-error, #ba1a1a);"
          >
            <md-icon style="font-size: 18px;">delete</md-icon>
          </button>
        </div>

        ${this.task.description ? html`
          <div class="description">${unsafeHTML(DescriptionSanitizer.sanitize(this.task.description))}</div>
        ` : ''}

        <div class="meta-row">
          ${asNote ? '' : html`
            <task-deadline-badge
              .deadline=${this.task.deadline}
              .status=${this.task.status}
            ></task-deadline-badge>
            ${this.task.alertType === 'sound' && this.task.deadline ? html`
              <span class="action-btn" title="Alarme sonoro ativo">
                <md-icon style="font-size: 13px;">volume_up</md-icon>${this.task.triggerMinutes != null ? ` ${this.task.triggerMinutes}m` : ''}
              </span>
            ` : ''}
          `}
        </div>

        <div slot="footer" class="actions-row ${asNote ? 'note-actions' : ''}">
          ${asNote ? '' : html`
            <div class="quick-reschedule">
              <span style="font-size: 0.72rem; color: var(--md-sys-color-outline);">Adiar:</span>
              <fzl-lit-button size="sm" variant="secondary" @fzl-click=${(e) => this._reschedule(1, e)} title="Adiar 1 dia">+1 dia</fzl-lit-button>
              <fzl-lit-button size="sm" variant="secondary" @fzl-click=${(e) => this._reschedule(7, e)} title="Adiar 1 semana">+7 dias</fzl-lit-button>
            </div>
          `}
          <div class="right-actions">
            <button type="button" class="action-btn icon-only" @click=${this._editTask} title="Editar">
              <md-icon style="font-size: 18px;">edit</md-icon>
            </button>
            <button type="button" class="action-btn icon-only" @click=${this._toggleArchive} title=${this.task.isArchived ? 'Desarquivar' : 'Arquivar'}>
              <md-icon style="font-size: 18px;">${this.task.isArchived ? 'unarchive' : 'archive'}</md-icon>
            </button>
            <button type="button" class="action-btn icon-only" @click=${this._deleteTask} title="Excluir" style="color: var(--md-sys-color-error, #ba1a1a);">
              <md-icon style="font-size: 18px;">delete</md-icon>
            </button>
          </div>
        </div>
      </fzl-lit-card>
    `
  }

  _stopProp(e) {
    e?.stopPropagation()
  }

  _toggleComplete(e) {
    e?.stopPropagation()
    this.dispatchEvent(new CustomEvent('toggle-complete', { detail: { taskId: this.task.id }, bubbles: true, composed: true }))
  }

  _reschedule(days, e) {
    e?.stopPropagation()
    this.dispatchEvent(new CustomEvent('reschedule', { detail: { taskId: this.task.id, days }, bubbles: true, composed: true }))
  }

  _editTask(e) {
    e?.stopPropagation()
    this.dispatchEvent(new CustomEvent('edit-task', { detail: { task: this.task }, bubbles: true, composed: true }))
  }

  _toggleArchive(e) {
    e?.stopPropagation()
    this.dispatchEvent(new CustomEvent('toggle-archive', { detail: { taskId: this.task.id, isArchived: !this.task.isArchived }, bubbles: true, composed: true }))
  }

  _deleteTask(e) {
    e?.stopPropagation()
    this.dispatchEvent(new CustomEvent('delete-task', { detail: { taskId: this.task.id }, bubbles: true, composed: true }))
  }
}

customElements.define('task-card', TaskCard)
