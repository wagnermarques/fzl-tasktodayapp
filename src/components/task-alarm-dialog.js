import { LitElement, html, css } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import '@fzl/webcomponents-lit/button'
import { alarmService } from '../services/alarm-service.js'
import { DescriptionSanitizer } from '../utils/html-sanitize.js'

export class TaskAlarmDialog extends LitElement {
  static properties = {
    open: { type: Boolean },
    task: { type: Object }
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
      background: rgba(186, 26, 26, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease-in-out;
      padding: 16px;
      box-sizing: border-box;
    }
    .dialog-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }
    .dialog-box {
      background: var(--md-sys-color-surface, #ffffff);
      border-radius: 20px;
      width: 100%;
      max-width: 480px;
      max-height: 85vh;
      overflow-y: auto;
      box-sizing: border-box;
      padding: 24px;
      box-shadow: 0 12px 36px rgba(186, 26, 26, 0.35);
      border: 2px solid var(--md-sys-color-error, #ba1a1a);
      display: flex;
      flex-direction: column;
      gap: 16px;
      text-align: center;
      animation: pulse 1.5s infinite alternate;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      100% { transform: scale(1.01); }
    }
    .alarm-icon {
      font-size: 54px;
      color: var(--md-sys-color-error, #ba1a1a);
      margin: 0 auto;
    }
    .alarm-title {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--md-sys-color-error, #ba1a1a);
    }
    .task-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 4px 0;
      word-break: break-word;
    }
    .task-desc {
      font-size: 0.9rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 0;
      max-height: 240px;
      overflow-y: auto;
      text-align: left;
      line-height: 1.5;
      word-break: break-word;
      padding: 12px 14px;
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      border-radius: 10px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }
    .task-desc p {
      margin: 0 0 8px 0;
    }
    .task-desc p:last-child {
      margin-bottom: 0;
    }
    .task-desc :is(ul, ol) {
      margin: 6px 0;
      padding-left: 20px;
    }
    .task-desc a {
      color: var(--md-sys-color-primary, #6750a4);
      word-break: break-all;
    }
    .task-desc :is(div, span) {
      max-width: 100%;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .btn-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    button {
      padding: 12px;
      border-radius: 24px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: opacity 0.15s;
    }
    button:hover {
      opacity: 0.9;
    }
    .btn-primary {
      background: var(--md-sys-color-primary, #6750a4);
      color: #ffffff;
    }
    .btn-snooze {
      background: var(--md-sys-color-secondary-container, #e8def8);
      color: var(--md-sys-color-on-secondary-container, #1d192b);
    }
    .btn-dismiss {
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
  `

  constructor() {
    super()
    this.open = false
    this.task = null
  }

  connectedCallback() {
    super.connectedCallback()
    this.unsubscribe = alarmService.subscribe((event, payload) => {
      if (event === 'ALARM_TRIGGERED') {
        this.task = payload.task
        this.open = true
      } else if (event === 'ALARM_DISMISSED' || event === 'ALARM_SNOOZED') {
        this.open = false
        this.task = null
      }
    })
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.unsubscribe) this.unsubscribe()
  }

  render() {
    if (!this.task) return html``

    return html`
      <div class="dialog-backdrop ${this.open ? 'open' : ''}">
        <div class="dialog-box">
          <md-icon class="alarm-icon">alarm_on</md-icon>
          <h2 class="alarm-title">ALERTA DE PRAZO!</h2>
          <div class="task-title">${this.task.title}</div>
          ${this.task.description ? html`
            <div class="task-desc">
              ${unsafeHTML(DescriptionSanitizer.sanitize(this.task.description))}
            </div>
          ` : ''}

          <div class="actions">
            <fzl-lit-button variant="primary" size="lg" style="width: 100%; justify-content: center;" @fzl-click=${this._completeTask}>
              <md-icon>check_circle</md-icon> Concluir Tarefa
            </fzl-lit-button>
            <div class="btn-row" style="display: flex; gap: 8px; width: 100%; justify-content: center;">
              <fzl-lit-button variant="secondary" size="md" style="flex: 1;" @fzl-click=${() => this._snooze(5)}>
                <md-icon>snooze</md-icon> Adiar 5 min
              </fzl-lit-button>
              <fzl-lit-button variant="secondary" size="md" style="flex: 1;" @fzl-click=${() => this._snooze(15)}>
                <md-icon>snooze</md-icon> Adiar 15 min
              </fzl-lit-button>
            </div>
            <fzl-lit-button variant="danger" size="md" style="width: 100%; justify-content: center;" @fzl-click=${this._dismiss}>
              <md-icon>close</md-icon> Dispensar Alarme
            </fzl-lit-button>
          </div>
        </div>
      </div>
    `
  }

  _dismiss() {
    alarmService.dismissAlarm()
  }

  _snooze(minutes) {
    alarmService.snoozeAlarm(minutes)
  }

  _completeTask() {
    if (this.task) {
      this.dispatchEvent(
        new CustomEvent('complete-alarm-task', {
          detail: { taskId: this.task.id },
          bubbles: true,
          composed: true
        })
      )
    }
    alarmService.dismissAlarm()
  }
}

customElements.define('task-alarm-dialog', TaskAlarmDialog)
