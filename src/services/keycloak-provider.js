/**
 * Provedor de autenticação Keycloak (OIDC, authorization code + PKCE) para o appshell.
 *
 * O login acontece na página do Keycloak (redirect: true); a sessão volta pelo init()
 * quando o navegador retorna ao app. Configuração via VITE_KEYCLOAK_URL,
 * VITE_KEYCLOAK_REALM e VITE_KEYCLOAK_CLIENT_ID.
 */

import Keycloak from 'keycloak-js'
import { storageManager } from './storage.js'

// Marca que houve login neste navegador: só então o init() pergunta ao Keycloak
// pela sessão (check-sso redireciona a página, o que não se quer para quem nunca entrou)
const SESSION_HINT_KEY = 'auth:keycloak-session'

class KeycloakAuthProvider {
  static ADMIN_ROLE = 'tasktoday-admin'

  constructor() {
    this.config = {
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
    }
    this.keycloak = this.isConfigured() ? new Keycloak(this.config) : null
    this.ready = Promise.resolve(false)
    this.signOutListeners = new Set()
  }

  isConfigured() {
    return Boolean(this.config.url && this.config.realm && this.config.clientId)
  }

  // Sem o hash: as rotas do app usam #/..., e a resposta do Keycloak vem na query
  _redirectUri() {
    return window.location.origin + window.location.pathname
  }

  _toUser() {
    const t = this.keycloak.tokenParsed || {}
    return {
      id: t.sub,
      name: t.name || t.preferred_username || t.email || 'Usuário',
      email: t.email || ''
    }
  }

  /** Token de acesso válido (renovado se faltar menos de 30 s), ou null sem sessão. */
  async getAccessToken() {
    if (!this.keycloak) return null
    await this.ready.catch(() => false)
    if (!this.keycloak.authenticated) return null
    try {
      await this.keycloak.updateToken(30)
      return this.keycloak.token
    } catch {
      return null
    }
  }

  /** true quando o usuário logado tem o papel de administrador do Task Today
   *  (cria, edita e exclui categorias nativas). */
  isAdmin() {
    return Boolean(this.keycloak?.authenticated && this.keycloak.hasRealmRole(KeycloakAuthProvider.ADMIN_ROLE))
  }

  /** Chamado antes do logout, para limpar os dados locais do usuário. */
  onSignOut(listener) {
    this.signOutListeners.add(listener)
    return () => this.signOutListeners.delete(listener)
  }

  init({ setUser }) {
    const hadSession = storageManager.getItem(SESSION_HINT_KEY, false)

    this.keycloak.onAuthLogout = () => setUser(null)
    this.keycloak.onTokenExpired = () => {
      this.keycloak.updateToken(30).catch(() => setUser(null))
    }

    this.ready = this.keycloak.init({
      onLoad: hadSession && navigator.onLine ? 'check-sso' : undefined,
      pkceMethod: 'S256',
      responseMode: 'query',
      checkLoginIframe: false,
      redirectUri: this._redirectUri()
    })

    this.ready
      .then((authenticated) => {
        storageManager.setItem(SESSION_HINT_KEY, authenticated || null)
        setUser(authenticated ? this._toUser() : null)
      })
      .catch((err) => {
        // Keycloak fora do ar: segue deslogado, mas mantém a marca para tentar de novo
        console.warn('Falha ao iniciar o Keycloak:', err)
        setUser(null)
      })

    return () => {
      this.keycloak.onAuthLogout = null
      this.keycloak.onTokenExpired = null
    }
  }

  async signIn() {
    await this.ready.catch(() => false)
    await this.keycloak.login({ redirectUri: this._redirectUri() })
  }

  async signOut() {
    for (const listener of this.signOutListeners) listener()
    storageManager.setItem(SESSION_HINT_KEY, null)
    await this.keycloak.logout({ redirectUri: this._redirectUri() })
  }
}

const keycloakAuthProvider = new KeycloakAuthProvider()

export const TASKTODAY_ADMIN_ROLE = KeycloakAuthProvider.ADMIN_ROLE

export function isKeycloakConfigured() {
  return keycloakAuthProvider.isConfigured()
}

export async function getAccessToken() {
  return keycloakAuthProvider.getAccessToken()
}

export function isTaskTodayAdmin() {
  return keycloakAuthProvider.isAdmin()
}

export function onSignOut(listener) {
  return keycloakAuthProvider.onSignOut(listener)
}

/** Objeto simples exigido pelo appshell como auth provider (propriedades próprias
 *  `redirect`/`init`/`signIn`/`signOut`), delegando para a instância da classe. */
export const keycloakProvider = {
  redirect: true,
  init: (...args) => keycloakAuthProvider.init(...args),
  signIn: (...args) => keycloakAuthProvider.signIn(...args),
  signOut: (...args) => keycloakAuthProvider.signOut(...args)
}
