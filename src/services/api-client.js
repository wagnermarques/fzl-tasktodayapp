/**
 * Cliente REST do back-end Task Today (fzlbpms /api/tasktoday).
 * Contrato: fzlbpms/src-projects/karaf_bundles/blueprint-osgi-camel-bundles/tasktoday/README.org
 */

import { getAccessToken } from './keycloak-provider.js'

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function getApiBaseUrl() {
  return import.meta.env.VITE_REST_API_BASE_URL || ''
}

/**
 * Chamada à API. Erros HTTP viram ApiError ({"error","message"} do servidor);
 * falha de rede propaga o TypeError do fetch.
 */
export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new Error('VITE_REST_API_BASE_URL não está configurada.')
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = await getAccessToken()
    if (!token) throw new ApiError(401, 'unauthorized', 'Entre na sua conta para sincronizar.')
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, data?.error, data?.message || `HTTP ${response.status}`)
  }
  return data
}
