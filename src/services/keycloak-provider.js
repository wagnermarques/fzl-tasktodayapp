/**
 * Provedor de autenticação Keycloak (OIDC, authorization code + PKCE) para o appshell.
 *
 * O login acontece na página do Keycloak (redirect: true); a sessão volta pelo init()
 * quando o navegador retorna ao app. Configuração via VITE_KEYCLOAK_URL,
 * VITE_KEYCLOAK_REALM e VITE_KEYCLOAK_CLIENT_ID.
 */

import Keycloak from 'keycloak-js'
import { getStorageItem, setStorageItem } from './storage.js'

// Marca que houve login neste navegador: só então o init() pergunta ao Keycloak
// pela sessão (check-sso redireciona a página, o que não se quer para quem nunca entrou)
const SESSION_HINT_KEY = 'auth:keycloak-session'

const config = {
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID
}

export function isKeycloakConfigured() {
  return Boolean(config.url && config.realm && config.clientId)
}

const keycloak = isKeycloakConfigured() ? new Keycloak(config) : null
let ready = Promise.resolve(false)
const signOutListeners = new Set()

// Sem o hash: as rotas do app usam #/..., e a resposta do Keycloak vem na query
function redirectUri() {
  return window.location.origin + window.location.pathname
}

function toUser() {
  const t = keycloak.tokenParsed || {}
  return {
    id: t.sub,
    name: t.name || t.preferred_username || t.email || 'Usuário',
    email: t.email || ''
  }
}

/** Token de acesso válido (renovado se faltar menos de 30 s), ou null sem sessão. */
export async function getAccessToken() {
  if (!keycloak) return null
  await ready.catch(() => false)
  if (!keycloak.authenticated) return null
  try {
    await keycloak.updateToken(30)
    return keycloak.token
  } catch {
    return null
  }
}

/** Chamado antes do logout, para limpar os dados locais do usuário. */
export function onSignOut(listener) {
  signOutListeners.add(listener)
  return () => signOutListeners.delete(listener)
}

export const keycloakProvider = {
  redirect: true,

  init({ setUser }) {
    const hadSession = getStorageItem(SESSION_HINT_KEY, false)

    keycloak.onAuthLogout = () => setUser(null)
    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => setUser(null))
    }

    ready = keycloak.init({
      onLoad: hadSession && navigator.onLine ? 'check-sso' : undefined,
      pkceMethod: 'S256',
      responseMode: 'query',
      checkLoginIframe: false,
      redirectUri: redirectUri()
    })

    ready
      .then((authenticated) => {
        setStorageItem(SESSION_HINT_KEY, authenticated || null)
        setUser(authenticated ? toUser() : null)
      })
      .catch((err) => {
        // Keycloak fora do ar: segue deslogado, mas mantém a marca para tentar de novo
        console.warn('Falha ao iniciar o Keycloak:', err)
        setUser(null)
      })

    return () => {
      keycloak.onAuthLogout = null
      keycloak.onTokenExpired = null
    }
  },

  async signIn() {
    await ready.catch(() => false)
    await keycloak.login({ redirectUri: redirectUri() })
  },

  async signOut() {
    for (const listener of signOutListeners) listener()
    setStorageItem(SESSION_HINT_KEY, null)
    await keycloak.logout({ redirectUri: redirectUri() })
  }
}
