/**
 * Web Audio API synthesizer for Questly game sound effects.
 * Zero external audio assets required; zero latency; works offline and across all browsers.
 */

const STORAGE_KEY = 'questly_sound_effects'

let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null

  if (!sharedAudioContext) {
    const AudioContextClass = window.AudioContext
      || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AudioContextClass) {
      sharedAudioContext = new AudioContextClass()
    }
  }

  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    void sharedAudioContext.resume()
  }

  return sharedAudioContext
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const item = localStorage.getItem(STORAGE_KEY)
    return item === null ? true : item === 'true'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent('questly_sound_changed', { detail: { enabled } }))
  } catch {}
}

/**
 * Cheerful, bright chime (C5 -> E5 -> G5) for correct answers.
 */
export function playCorrectSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const notes = [
      { freq: 523.25, start: 0.00, dur: 0.12 }, // C5
      { freq: 659.25, start: 0.09, dur: 0.14 }, // E5
      { freq: 783.99, start: 0.18, dur: 0.32 }, // G5
    ]

    for (const note of notes) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(note.freq, now + note.start)

      gain.gain.setValueAtTime(0.001, now + note.start)
      gain.gain.linearRampToValueAtTime(0.22, now + note.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + note.start)
      osc.stop(now + note.start + note.dur)
    }
  } catch {}
}

/**
 * Soft, gentle downward boop for incorrect answers.
 */
export function playIncorrectSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(220, now)
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.28)

    gain.gain.setValueAtTime(0.001, now)
    gain.gain.linearRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.28)
  } catch {}
}

/**
 * Celebratory fanfare arpeggio (C5 -> E5 -> G5 -> C6) for completing lessons, levels, and claiming chests.
 */
export function playFanfareSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const chords = [
      { freq: 523.25, start: 0.00, dur: 0.14, vol: 0.2 }, // C5
      { freq: 659.25, start: 0.11, dur: 0.14, vol: 0.2 }, // E5
      { freq: 783.99, start: 0.22, dur: 0.18, vol: 0.22 }, // G5
      { freq: 1046.50, start: 0.35, dur: 0.55, vol: 0.25 }, // C6
      { freq: 1318.51, start: 0.42, dur: 0.45, vol: 0.15 }, // E6 harmonic shimmer
    ]

    for (const note of chords) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(note.freq, now + note.start)

      gain.gain.setValueAtTime(0.001, now + note.start)
      gain.gain.linearRampToValueAtTime(note.vol, now + note.start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now + note.start)
      osc.stop(now + note.start + note.dur)
    }
  } catch {}
}

/**
 * Magical sparkle rumble for opening a treasure chest.
 */
export function playChestOpenSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    // Warm ascending creak/sweep
    const sweep = ctx.createOscillator()
    const sweepGain = ctx.createGain()
    sweep.type = 'sawtooth'
    sweep.frequency.setValueAtTime(140, now)
    sweep.frequency.exponentialRampToValueAtTime(320, now + 0.3)
    sweepGain.gain.setValueAtTime(0.01, now)
    sweepGain.gain.linearRampToValueAtTime(0.08, now + 0.05)
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3)
    sweep.connect(sweepGain)
    sweepGain.connect(ctx.destination)
    sweep.start(now)
    sweep.stop(now + 0.3)

    // Sparkle chimes
    const sparkles = [659.25, 783.99, 987.77, 1174.66, 1318.51]
    sparkles.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = 0.2 + idx * 0.06
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now + start)
      gain.gain.setValueAtTime(0.001, now + start)
      gain.gain.linearRampToValueAtTime(0.12, now + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.25)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now + start)
      osc.stop(now + start + 0.25)
    })
  } catch {}
}

/**
 * Clean subtle tick/pop for button interactions.
 */
export function playClickSound(): void {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, now)
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04)
    gain.gain.setValueAtTime(0.06, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.04)
  } catch {}
}

