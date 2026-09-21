import { LitElement, html, css } from 'lit'
import { getStorageItem, setStorageItem, DEFAULT_ALERT_SETTINGS } from '../services/storage.js'
import { alarmService } from '../services/alarm-service.js'
import { pushService } from '../services/push-service.js'

export class TaskAlarmsConfigView extends LitElement {
  static properties = {
    settings: { type: Object },
    pushPermission: { type: String },
    isSubscribedToPush: { type: Boolean },
    vapidKey: { type: String },
    statusMessage: { type: String }
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
    .card {
      background: var(--md-sys-color-surface-container, #f3edf7);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
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
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    select, input[type="text"] {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #1d1b20);
      font-size: 0.9rem;
      outline: none;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--md-sys-color-primary, #6750a4);
      color: #ffffff;
    }
    .btn-secondary {
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .btn-success {
      background: #2e7d32;
      color: #ffffff;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .status-granted {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .status-denied {
      background: #ffebee;
      color: #c62828;
    }
    .status-default {
      background: #fff3e0;
      color: #ef6c00;
    }
    .info-box {
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      border-left: 4px solid var(--md-sys-color-primary, #6750a4);
      padding: 10px 14px;
      border-radius: 4px;
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .msg-toast {
      padding: 10px 16px;
      border-radius: 8px;
      background: #322f35;
      color: #ffffff;
      font-size: 0.88rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `

  constructor() {
    super()
    this.settings = getStorageItem('settings:alerts', DEFAULT_ALERT_SETTINGS)
    this.pushPermission = 'default'
    this.isSubscribedToPush = false
    this.vapidKey = pushService.vapidPublicKey
    this.statusMessage = ''
  }

  async connectedCallback() {
    super.connectedCallback()
    this.pushPermission = await pushService.getPermissionStatus()
    const sub = await pushService.getExistingSubscription()
    this.isSubscribedToPush = !!sub
  }

  render() {
    return html`
      <div class="header">
        <h1 class="title"><md-icon>notifications_active</md-icon> Configuração de Alertas e Alarmes (RF04 & RF08)</h1>
        <p class="subtitle">Personalize os avisos sonoros gerados via Web Audio API e ative notificações push em tempo real.</p>
      </div>

      ${this.statusMessage ? html`
        <div class="msg-toast" style="margin-bottom: 16px;">
          <md-icon>info</md-icon> ${this.statusMessage}
        </div>
      ` : ''}

      <!-- Painel de Alarmes Sonoros -->
      <div class="card">
        <h2 class="card-title"><md-icon>volume_up</md-icon> Alarmes Sonoros (Web Audio API)</h2>
        
        <div class="row">
          <div class="form-group">
            <label>Tom do Alarme</label>
            <select .value=${this.settings.soundTone} @change=${this._onToneChange}>
              <option value="chime">Chime Harmônico (Padrão)</option>
              <option value="radar">Pulso Radar</option>
              <option value="bell">Sino Suave</option>
              <option value="synth">Sintetizador Triplo</option>
            </select>
          </div>

          <div class="form-group">
            <label>Volume (${Math.round(this.settings.volume * 100)}%)</label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              .value=${String(this.settings.volume)}
              @input=${this._onVolumeChange}
            />
          </div>

          <button class="btn btn-secondary" style="margin-top: 18px;" @click=${this._testSound}>
            <md-icon>play_arrow</md-icon> Testar Som
          </button>
        </div>

        <div class="row">
          <div class="form-group">
            <label>Gatilho Padrão Global</label>
            <select .value=${String(this.settings.defaultTriggerMinutes)} @change=${this._onTriggerChange}>
              <option value="0">No momento do deadline</option>
              <option value="5">5 minutos antes</option>
              <option value="15">15 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="1440">1 dia antes</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Painel de Notificações Push & VAPID -->
      <div class="card">
        <h2 class="card-title"><md-icon>send_to_mobile</md-icon> Notificações Push & Service Worker (RF08)</h2>
        <div class="info-box">
          A <strong>Push API</strong> e o <strong>Service Worker</strong> permitem que o Task Today App receba notificações mesmo se o aplicativo estiver fechado.
        </div>

        <div class="row">
          <div>
            <span style="font-size: 0.85rem; font-weight: 600;">Status de Permissão:</span>
            <span class="status-badge status-${this.pushPermission}">
              ${this.pushPermission === 'granted' ? 'Permitido' : this.pushPermission === 'denied' ? 'Bloqueado' : 'Pendente'}
            </span>
          </div>
        </div>

        <div class="row">
          ${this.isSubscribedToPush ? html`
            <button class="btn btn-secondary" @click=${this._unsubscribePush}>
              <md-icon>notifications_off</md-icon> Desativar Push
            </button>
          ` : html`
            <button class="btn btn-primary" @click=${this._subscribePush}>
              <md-icon>notifications_active</md-icon> Ativar Inscrição Web Push
            </button>
          `}

          <button class="btn btn-success" @click=${this._testPushNotification}>
            <md-icon>notifications</md-icon> Enviar Notificação de Teste
          </button>
        </div>

        <div class="form-group" style="margin-top: 10px;">
          <label>Chave Pública VAPID (Assinatura Criptográfica)</label>
          <input
            type="text"
            readonly
            .value=${this.vapidKey}
            style="font-family: monospace; font-size: 0.8rem; background: var(--md-sys-color-surface-container-low, #f7f2fa);"
          />
        </div>
      </div>
    `
  }

  _onToneChange(e) {
    this.settings = { ...this.settings, soundTone: e.target.value }
    setStorageItem('settings:alerts', this.settings)
  }

  _onVolumeChange(e) {
    this.settings = { ...this.settings, volume: Number(e.target.value) }
    setStorageItem('settings:alerts', this.settings)
    this.requestUpdate()
  }

  _onTriggerChange(e) {
    this.settings = { ...this.settings, defaultTriggerMinutes: Number(e.target.value) }
    setStorageItem('settings:alerts', this.settings)
  }

  _testSound() {
    alarmService.playSound(this.settings.soundTone, this.settings.volume)
    this._showMessage('Reproduzindo tom de alarme...')
  }

  async _subscribePush() {
    try {
      await pushService.subscribe(this.vapidKey)
      this.pushPermission = await pushService.getPermissionStatus()
      this.isSubscribedToPush = true
      this._showMessage('Inscrição Web Push realizada com sucesso!')
    } catch (err) {
      this._showMessage(`Falha ao ativar Push: ${err.message}`)
    }
  }

  async _unsubscribePush() {
    try {
      await pushService.unsubscribe()
      this.isSubscribedToPush = false
      this._showMessage('Inscrição Web Push cancelada.')
    } catch (err) {
      this._showMessage(`Erro ao cancelar: ${err.message}`)
    }
  }

  async _testPushNotification() {
    try {
      await pushService.sendTestNotification('Task Today App', 'O sistema de alertas está ativo e monitorando seus prazos!')
      this._showMessage('Notificação de teste disparada!')
    } catch (err) {
      this._showMessage(`Erro no disparo: ${err.message}`)
    }
  }

  _showMessage(msg) {
    this.statusMessage = msg
    setTimeout(() => {
      if (this.statusMessage === msg) {
        this.statusMessage = ''
      }
    }, 4000)
  }
}

customElements.define('task-alarms-config-view', TaskAlarmsConfigView)
