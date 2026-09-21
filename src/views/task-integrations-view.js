import { LitElement, html, css } from 'lit'
import { getStorageItem, setStorageItem } from '../services/storage.js'

export class TaskIntegrationsView extends LitElement {
  static properties = {
    backendUrl: { type: String },
    googleConnected: { type: Boolean },
    msConnected: { type: Boolean },
    syncStatus: { type: String },
    lastSyncTime: { type: String }
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
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .integration-card {
      background: var(--md-sys-color-surface-container, #f3edf7);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
    }
    .card-top {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #ffffff;
    }
    .icon-google {
      background: #ea4335;
    }
    .icon-ms {
      background: #0078d4;
    }
    .icon-karaf {
      background: #d84315;
    }
    .card-name {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      margin: 0;
    }
    .card-desc {
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      margin: 4px 0 0 0;
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
      justify-content: center;
      gap: 6px;
    }
    .btn-primary {
      background: var(--md-sys-color-primary, #6750a4);
      color: #ffffff;
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      color: var(--md-sys-color-on-surface, #1d1b20);
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
    }
    .status-connected {
      background: #e8f5e9;
      color: #2e7d32;
    }
    .status-disconnected {
      background: var(--md-sys-color-surface-variant, #e7e0ec);
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .karaf-config {
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 12px;
      padding: 20px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 10px;
    }
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    input {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      background: var(--md-sys-color-surface, #ffffff);
      color: var(--md-sys-color-on-surface, #1d1b20);
      font-size: 0.9rem;
    }
  `

  constructor() {
    super()
    this.backendUrl = getStorageItem('config:backend_url', 'https://dev/api/tasktoday')
    this.googleConnected = getStorageItem('sync:google_connected', false)
    this.msConnected = getStorageItem('sync:ms_connected', false)
    this.syncStatus = ''
    this.lastSyncTime = getStorageItem('sync:last_synced', null)
  }

  render() {
    return html`
      <div class="header">
        <h1 class="title"><md-icon>sync_alt</md-icon> Integração Multiplataforma (RF05)</h1>
        <p class="subtitle">Conecte o Task Today App a provedores externos e ao back-end Apache Karaf / Camel.</p>
      </div>

      <div class="grid">
        <!-- Google Tasks -->
        <div class="integration-card">
          <div>
            <div class="card-top">
              <div class="icon-box icon-google">
                <md-icon>task_alt</md-icon>
              </div>
              <div>
                <h3 class="card-name">Google Tasks</h3>
                <span class="status-badge ${this.googleConnected ? 'status-connected' : 'status-disconnected'}">
                  ${this.googleConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <p class="card-desc">Sincronize prazos e listas de afazeres da sua conta Google automaticamente.</p>
          </div>
          <button
            class="btn ${this.googleConnected ? 'btn-outline' : 'btn-primary'}"
            @click=${this._toggleGoogle}
          >
            <md-icon>${this.googleConnected ? 'link_off' : 'link'}</md-icon>
            ${this.googleConnected ? 'Desconectar' : 'Conectar Google'}
          </button>
        </div>

        <!-- Microsoft To Do -->
        <div class="integration-card">
          <div>
            <div class="card-top">
              <div class="icon-box icon-ms">
                <md-icon>checklist_rtl</md-icon>
              </div>
              <div>
                <h3 class="card-name">Microsoft To Do</h3>
                <span class="status-badge ${this.msConnected ? 'status-connected' : 'status-disconnected'}">
                  ${this.msConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <p class="card-desc">Integração com o Microsoft 365, Outlook Tasks e Microsoft To Do.</p>
          </div>
          <button
            class="btn ${this.msConnected ? 'btn-outline' : 'btn-primary'}"
            @click=${this._toggleMS}
          >
            <md-icon>${this.msConnected ? 'link_off' : 'link'}</md-icon>
            ${this.msConnected ? 'Desconectar' : 'Conectar Microsoft'}
          </button>
        </div>
      </div>

      <!-- Configuração de Back-end Apache Karaf -->
      <div class="karaf-config">
        <div class="card-top">
          <div class="icon-box icon-karaf">
            <md-icon>hub</md-icon>
          </div>
          <div>
            <h3 class="card-name">Serviços REST — Apache Karaf / Camel Stack</h3>
            <p class="card-desc">Comunicação direta com o bundle Camel no stack fzlbpms e persistência PostgreSQL.</p>
          </div>
        </div>

        <div class="form-group">
          <label>URL Base da API REST</label>
          <div style="display: flex; gap: 8px;">
            <input
              type="text"
              style="flex: 1;"
              .value=${this.backendUrl}
              @input=${e => this.backendUrl = e.target.value}
            />
            <button class="btn btn-primary" @click=${this._saveBackendUrl}>
              <md-icon>save</md-icon> Salvar
            </button>
          </div>
        </div>

        ${this.lastSyncTime ? html`
          <p style="font-size: 0.8rem; color: var(--md-sys-color-outline); margin-top: 12px;">
            Última sincronização com o servidor: ${new Date(this.lastSyncTime).toLocaleString()}
          </p>
        ` : ''}
      </div>
    `
  }

  _toggleGoogle() {
    this.googleConnected = !this.googleConnected
    setStorageItem('sync:google_connected', this.googleConnected)
    if (this.googleConnected) {
      alert('Simulação de autorização OAuth2 Google Tasks concluída!')
    }
  }

  _toggleMS() {
    this.msConnected = !this.msConnected
    setStorageItem('sync:ms_connected', this.msConnected)
    if (this.msConnected) {
      alert('Simulação de autorização Microsoft Graph / To Do concluída!')
    }
  }

  _saveBackendUrl() {
    setStorageItem('config:backend_url', this.backendUrl)
    setStorageItem('sync:last_synced', new Date().toISOString())
    this.lastSyncTime = new Date().toISOString()
    alert('Configuração de endpoint REST atualizada!')
  }
}

customElements.define('task-integrations-view', TaskIntegrationsView)
