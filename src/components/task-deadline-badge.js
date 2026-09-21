import { LitElement, html, css } from 'lit'

export class TaskDeadlineBadge extends LitElement {
  static properties = {
    deadline: { type: String },
    status: { type: String }
  }

  static styles = css`
    :host {
      display: inline-flex;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge md-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .badge.overdue {
      background-color: var(--md-sys-color-error-container, #ffdad6);
      color: var(--md-sys-color-on-error-container, #410002);
    }
    .badge.today {
      background-color: #fff3e0;
      color: #b26a00;
    }
    .badge.upcoming {
      background-color: var(--md-sys-color-secondary-container, #e8def8);
      color: var(--md-sys-color-on-secondary-container, #1d192b);
    }
    .badge.completed {
      background-color: #e8f5e9;
      color: #2e7d32;
    }
    .badge.none {
      background-color: var(--md-sys-color-surface-variant, #e7e0ec);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
  `

  render() {
    if (!this.deadline) {
      return html`<span class="badge none"><md-icon>event_busy</md-icon> Sem prazo</span>`
    }

    if (this.status === 'CONCLUIDA') {
      const d = new Date(this.deadline)
      return html`<span class="badge completed"><md-icon>check_circle</md-icon> ${this._formatDate(d)}</span>`
    }

    const now = new Date()
    const d = new Date(this.deadline)
    const isOverdue = d < now
    const isToday = d.toDateString() === now.toDateString()

    let className = 'upcoming'
    let icon = 'schedule'
    let label = this._formatDate(d)

    if (isOverdue) {
      className = 'overdue'
      icon = 'warning'
      label = `Atrasada (${this._formatDate(d)})`
    } else if (isToday) {
      className = 'today'
      icon = 'today'
      label = `Hoje às ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }

    return html`
      <span class="badge ${className}">
        <md-icon>${icon}</md-icon>
        ${label}
      </span>
    `
  }

  _formatDate(date) {
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }
}

customElements.define('task-deadline-badge', TaskDeadlineBadge)
