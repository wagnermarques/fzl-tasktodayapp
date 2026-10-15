/**
 * Serviço de Alarmes Sonoros e Alertas Visuais — Web Audio API & Notification API
 */

import { getStorageItem } from './storage.js'

class AlarmService {
  constructor() {
    this.audioCtx = null
    this.activeAlarmTask = null
    this.isPlaying = false
    this.oscillatorNode = null
    this.gainNode = null
    this.timerId = null
    this.listeners = new Set()
  }

  _getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass()
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  _notify(event, payload) {
    for (const listener of this.listeners) {
      try {
        listener(event, payload)
      } catch (err) {
        console.error('Erro no listener de alarme:', err)
      }
    }
  }

  /**
   * Toca um som de alarme gerado via Web Audio API.
   * @param {string} tone - 'chime', 'radar', 'bell', 'synth'
   * @param {number} volume - 0.0 a 1.0
   */
  playSound(tone = 'chime', volume = 0.8) {
    try {
      const ctx = this._getAudioContext()
      if (!ctx) return

      this.stopSound()

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(Math.max(0.01, Math.min(volume, 1.0)), ctx.currentTime)
      masterGain.connect(ctx.destination)
      this.gainNode = masterGain

      this.isPlaying = true

      if (tone === 'radar') {
        this._playRadarPattern(ctx, masterGain)
      } else if (tone === 'bell') {
        this._playBellPattern(ctx, masterGain)
      } else if (tone === 'synth') {
        this._playSynthPattern(ctx, masterGain)
      } else {
        this._playChimePattern(ctx, masterGain)
      }
    } catch (err) {
      console.warn('Não foi possível reproduzir o som de alarme:', err)
    }
  }

  _playChimePattern(ctx, gain) {
    const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      const startTime = ctx.currentTime + index * 0.15
      noteGain.gain.setValueAtTime(0.01, startTime)
      noteGain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.05)
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8)

      osc.connect(noteGain)
      noteGain.connect(gain)

      osc.start(startTime)
      osc.stop(startTime + 0.9)
    })
  }

  _playRadarPattern(ctx, gain) {
    const osc = ctx.createOscillator()
    const pulseGain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(880, ctx.currentTime) // A5

    pulseGain.gain.setValueAtTime(0.6, ctx.currentTime)
    pulseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    pulseGain.gain.setValueAtTime(0.6, ctx.currentTime + 0.3)
    pulseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)

    osc.connect(pulseGain)
    pulseGain.connect(gain)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  }

  _playBellPattern(ctx, gain) {
    const osc = ctx.createOscillator()
    const bellGain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(1200, ctx.currentTime)

    bellGain.gain.setValueAtTime(0.8, ctx.currentTime)
    bellGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)

    osc.connect(bellGain)
    bellGain.connect(gain)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 1.3)
  }

  _playSynthPattern(ctx, gain) {
    const freqs = [440, 554.37, 659.25]
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const noteGain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, ctx.currentTime)

      const start = ctx.currentTime + idx * 0.1
      noteGain.gain.setValueAtTime(0.2, start)
      noteGain.gain.exponentialRampToValueAtTime(0.01, start + 0.4)

      osc.connect(noteGain)
      noteGain.connect(gain)

      osc.start(start)
      osc.stop(start + 0.45)
    })
  }

  stopSound() {
    this.isPlaying = false
    if (this.gainNode) {
      try {
        this.gainNode.gain.setValueAtTime(0, this.audioCtx?.currentTime || 0)
      } catch (_) {}
    }
  }

  /**
   * Dispara um alarme para uma tarefa específica.
   */
  triggerAlarm(task) {
    const settings = getStorageItem('settings:alerts', { soundTone: 'chime', volume: 0.8, soundEnabled: true })
    this.activeAlarmTask = task

    if (task.alertType === 'sound' || settings.soundEnabled) {
      this.playSound(settings.soundTone, settings.volume)
    }

    if (Notification.permission === 'granted') {
      new Notification(`Alarme: ${task.title}`, {
        body: task.description || 'O prazo para esta tarefa está próximo ou venceu!',
        icon: '/favicon.svg',
        tag: `task-alarm-${task.id}`
      })
    }

    this._notify('ALARM_TRIGGERED', { task })
  }

  dismissAlarm() {
    this.stopSound()
    const task = this.activeAlarmTask
    this.activeAlarmTask = null
    this._notify('ALARM_DISMISSED', { task })
  }

  snoozeAlarm(minutes = 5) {
    this.stopSound()
    const task = this.activeAlarmTask
    this.activeAlarmTask = null
    this._notify('ALARM_SNOOZED', { task, minutes })
  }

  /**
   * Inicia o monitoramento em segundo plano de tarefas para disparar alarmes no prazo.
   */
  startTicker(taskCheckerCallback) {
    if (this.timerId) clearInterval(this.timerId)
    this.timerId = setInterval(() => {
      if (typeof taskCheckerCallback === 'function') {
        taskCheckerCallback(this)
      }
    }, 15000) // Checagem a cada 15s
  }

  stopTicker() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }
}

export const alarmService = new AlarmService()
