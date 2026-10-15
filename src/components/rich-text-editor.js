import { LitElement, html, css } from 'lit'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { sanitizeDescriptionHtml } from '../utils/html-sanitize.js'

/**
 * Editor de texto rico (WYSIWYG) com visual Material Design 3,
 * usado para o campo de descrição/detalhes das tarefas.
 * Emite `value-changed` com HTML já sanitizado.
 */
export class RichTextEditor extends LitElement {
  static properties = {
    value: { type: String },
    label: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean }
  }

  static styles = css`
    :host {
      display: block;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .shell {
      border: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
      border-radius: 8px;
      background: var(--md-sys-color-surface-container-low, #f7f2fa);
      overflow: hidden;
      transition: border-color 0.15s, background 0.15s;
    }
    .shell.focused {
      border-color: var(--md-sys-color-primary, #6750a4);
      background: var(--md-sys-color-surface, #ffffff);
    }
    .shell.disabled {
      opacity: 0.6;
    }
    .toolbar {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 2px;
      padding: 4px 6px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant, #cac4d0);
    }
    .tbtn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }
    .tbtn md-icon {
      font-size: 18px;
    }
    .tbtn:hover {
      background: var(--md-sys-color-surface-container-high, #ece6f0);
      color: var(--md-sys-color-primary, #6750a4);
    }
    .tbtn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .sep {
      width: 1px;
      align-self: stretch;
      margin: 4px 4px;
      background: var(--md-sys-color-outline-variant, #cac4d0);
    }
    .editable {
      min-height: 84px;
      max-height: 320px;
      overflow-y: auto;
      padding: 10px 12px;
      font-size: 0.95rem;
      font-family: inherit;
      color: var(--md-sys-color-on-surface, #1d1b20);
      line-height: 1.4;
    }
    .editable:focus {
      outline: none;
    }
    .editable :is(ul, ol) {
      margin: 4px 0;
      padding-left: 22px;
    }
    .editable p {
      margin: 0 0 8px 0;
    }
    .editable p:last-child {
      margin-bottom: 0;
    }
    .editable a {
      color: var(--md-sys-color-primary, #6750a4);
    }
    .editable:empty::before {
      content: attr(data-placeholder);
      color: var(--md-sys-color-outline, #79747e);
      pointer-events: none;
    }
  `

  constructor() {
    super()
    this.value = ''
    this.label = ''
    this.placeholder = ''
    this.disabled = false
    this._focused = false
  }

  firstUpdated() {
    this._editorEl = this.renderRoot.querySelector('.editable')
    this._syncEditorFromValue()
  }

  updated(changedProps) {
    if (changedProps.has('value') && this._editorEl && !this._focused) {
      this._syncEditorFromValue()
    }
  }

  _syncEditorFromValue() {
    const clean = sanitizeDescriptionHtml(this.value)
    if (this._editorEl.innerHTML !== clean) {
      this._editorEl.innerHTML = clean
    }
  }

  render() {
    return html`
      <div class="field">
        ${this.label ? html`<span class="label">${this.label}</span>` : ''}
        <div class="shell ${this._focused ? 'focused' : ''} ${this.disabled ? 'disabled' : ''}">
          <div class="toolbar" role="toolbar" aria-label="Formatação de texto">
            ${this._toolbarButton('format_bold', 'Negrito', () => this._exec('bold'))}
            ${this._toolbarButton('format_italic', 'Itálico', () => this._exec('italic'))}
            ${this._toolbarButton('format_underlined', 'Sublinhado', () => this._exec('underline'))}
            <span class="sep"></span>
            ${this._toolbarButton('format_list_bulleted', 'Lista com marcadores', () => this._exec('insertUnorderedList'))}
            ${this._toolbarButton('format_list_numbered', 'Lista numerada', () => this._exec('insertOrderedList'))}
            <span class="sep"></span>
            ${this._toolbarButton('link', 'Inserir link', () => this._insertLink())}
            ${this._toolbarButton('format_clear', 'Limpar formatação', () => this._exec('removeFormat'))}
          </div>
          <div
            class="editable"
            contenteditable=${this.disabled ? 'false' : 'true'}
            data-placeholder=${this.placeholder || ''}
            @input=${this._onInput}
            @focus=${this._onFocus}
            @blur=${this._onBlur}
          ></div>
        </div>
      </div>
    `
  }

  _toolbarButton(icon, title, onClick) {
    return html`
      <button type="button" class="tbtn" title=${title} ?disabled=${this.disabled} @click=${onClick}>
        <md-icon>${icon}</md-icon>
      </button>
    `
  }

  _exec(command, arg = null) {
    if (this.disabled || !this._editorEl) return
    this._editorEl.focus()
    document.execCommand(command, false, arg)
    this._onInput()
  }

  _insertLink() {
    if (this.disabled) return
    const url = window.prompt('Informe a URL do link (ex: https://exemplo.com):', 'https://')
    if (!url) return
    this._exec('createLink', url)
  }

  _onInput() {
    const clean = sanitizeDescriptionHtml(this._editorEl.innerHTML)
    this.value = clean
    this.dispatchEvent(new CustomEvent('value-changed', { detail: { value: clean }, bubbles: true, composed: true }))
  }

  _onFocus() {
    this._focused = true
  }

  _onBlur() {
    this._focused = false
    this._onInput()
  }
}

customElements.define('rich-text-editor', RichTextEditor)
