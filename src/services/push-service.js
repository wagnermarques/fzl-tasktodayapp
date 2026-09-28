/**
 * Serviço de Gerenciamento de Notificações Web Push & Chaves VAPID
 */

import { getStorageItem, setStorageItem } from './storage.js'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function sameKey(buffer, bytes) {
  if (!buffer) return false
  const current = new Uint8Array(buffer)
  return current.length === bytes.length && current.every((b, i) => b === bytes[i])
}

class PushService {
  constructor() {
    this.subscription = null
    // Chave pública VAPID do servidor (GET /push/vapid-public-key); carregada sob demanda
    this.vapidPublicKey = null
  }

  /**
   * Busca a chave pública VAPID no back-end. Precisa ser a do servidor:
   * inscrições feitas com outra chave nunca recebem push.
   */
  async fetchVapidPublicKey() {
    if (this.vapidPublicKey) return this.vapidPublicKey

    const baseUrl = import.meta.env.VITE_REST_API_BASE_URL
    if (!baseUrl) {
      throw new Error('VITE_REST_API_BASE_URL não está configurada.')
    }

    const response = await fetch(`${baseUrl}/push/vapid-public-key`)
    if (!response.ok) {
      throw new Error(`Não foi possível obter a chave VAPID do servidor (HTTP ${response.status}).`)
    }
    const { publicKey } = await response.json()
    this.vapidPublicKey = publicKey
    return publicKey
  }

  isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }

  async getPermissionStatus() {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  }

  async requestPermission() {
    if (!('Notification' in window)) return 'unsupported'
    const permission = await Notification.requestPermission()
    return permission
  }

  async getExistingSubscription() {
    if (!this.isSupported()) return null
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      this.subscription = sub
      return sub
    } catch (err) {
      console.warn('Erro ao buscar inscrição push existente:', err)
      return null
    }
  }

  async subscribe(vapidKey) {
    if (!this.isSupported()) {
      throw new Error('Web Push não é suportado neste navegador.')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permissão para notificações não foi concedida.')
    }

    try {
      const key = vapidKey || await this.fetchVapidPublicKey()
      const reg = await navigator.serviceWorker.ready
      const convertedVapidKey = urlBase64ToUint8Array(key)

      // Uma inscrição feita com outra chave (ex.: a antiga chave de exemplo)
      // impede o subscribe() com a chave nova, então é descartada antes.
      const existing = await reg.pushManager.getSubscription()
      if (existing && !sameKey(existing.options.applicationServerKey, convertedVapidKey)) {
        await existing.unsubscribe()
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      })

      this.subscription = subscription
      setStorageItem('push:subscription', subscription.toJSON())

      return subscription
    } catch (err) {
      console.error('Falha ao inscrever para notificações push:', err)
      throw err
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      await this.getExistingSubscription()
    }
    if (this.subscription) {
      await this.subscription.unsubscribe()
      this.subscription = null
      setStorageItem('push:subscription', null)
      return true
    }
    return false
  }

  async sendTestNotification(title = 'Task Today App — Teste', message = 'Notificação push funcionando com sucesso!') {
    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body: message,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200],
            data: { url: window.location.href }
          })
          return
        }
      }
      new Notification(title, { body: message, icon: '/favicon.svg' })
    } else {
      throw new Error('Permissão de notificação não concedida.')
    }
  }
}

export const pushService = new PushService()
