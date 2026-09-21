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

class PushService {
  constructor() {
    this.subscription = null
    // Chave pública VAPID padrão para testes / desenvolvimento
    this.vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
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

  async subscribe(vapidKey = this.vapidPublicKey) {
    if (!this.isSupported()) {
      throw new Error('Web Push não é suportado neste navegador.')
    }

    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Permissão para notificações não foi concedida.')
    }

    try {
      const reg = await navigator.serviceWorker.ready
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey)

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
