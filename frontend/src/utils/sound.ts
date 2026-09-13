// Web Audio API Synthesizer & Audio Unlocker for Store Sound Notifications
// 100% Mobile & Laptop compatible (iOS Safari, Android Chrome, Desktop)

export type SoundTone = "CHIME" | "SIREN" | "BELL" | "DIGITAL";

let audioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

// Loop interval and timeout references for 10s alarm limit
let adminAlarmInterval: any = null;
let adminAlarmTimeout: any = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Mobile Audio Unlocker: iOS Safari & Android Chrome require a direct touch event
 * to unlock AudioContext. This function attaches global listeners to unlock seamlessly.
 */
export function initAudioUnlocker() {
  if (typeof window === "undefined" || isAudioUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      ctx.resume().then(() => {
        isAudioUnlocked = true;
        // Play a 1ms silent buffer to permanently unlock mobile audio
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }).catch(() => {});
    }
    window.removeEventListener("touchstart", unlock);
    window.removeEventListener("click", unlock);
  };

  window.addEventListener("touchstart", unlock, { passive: true });
  window.addEventListener("click", unlock, { passive: true });
}

/**
 * Play a synthesized tone with frequency, start time, duration, and wave type.
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.3,
  type: OscillatorType = "sine"
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  } catch (e) {
    console.error("Audio play error", e);
  }
}

/**
 * Single shot notification generator based on sound type
 */
export function playSound(tone: SoundTone = "CHIME", volume = 0.35) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  switch (tone) {
    case "SIREN":
      // Urgent high-low repeating siren pulse
      playTone(ctx, 880, now, 0.15, volume, "sawtooth");
      playTone(ctx, 660, now + 0.15, 0.2, volume, "sawtooth");
      playTone(ctx, 880, now + 0.35, 0.15, volume, "sawtooth");
      break;

    case "BELL":
      // Classic brass shop bell sound
      playTone(ctx, 1200, now, 0.5, volume, "sine");
      playTone(ctx, 2400, now, 0.3, volume * 0.4, "sine");
      break;

    case "DIGITAL":
      // Modern high tech double pulse
      playTone(ctx, 1046.5, now, 0.1, volume, "square");
      playTone(ctx, 1318.5, now + 0.1, 0.15, volume, "square");
      break;

    case "CHIME":
    default:
      // Pleasant double chime (E5 -> B5)
      playTone(ctx, 659.25, now, 0.35, volume, "sine");
      playTone(ctx, 987.77, now + 0.12, 0.5, volume, "sine");
      break;
  }
}

/**
 * Rings alarm for Admin when a new order arrives, auto-stopping after durationMs (default: 10s).
 */
export function startAdminAlarm(tone: SoundTone = "SIREN", durationMs = 10000) {
  stopAdminAlarm();
  playSound(tone);
  adminAlarmInterval = setInterval(() => {
    playSound(tone);
  }, 1200);

  // Automatically silence alarm after durationMs (10 seconds)
  adminAlarmTimeout = setTimeout(() => {
    stopAdminAlarm();
  }, durationMs);
}

/**
 * Stops the alarm immediately.
 */
export function stopAdminAlarm() {
  if (adminAlarmInterval) {
    clearInterval(adminAlarmInterval);
    adminAlarmInterval = null;
  }
  if (adminAlarmTimeout) {
    clearTimeout(adminAlarmTimeout);
    adminAlarmTimeout = null;
  }
}

/**
 * Customer Packed Order Chime
 */
export function playPackedOrderSound(tone: SoundTone = "CHIME") {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  // Ring celebratory chime sequence for ~3 seconds (3 repeats spaced 900ms apart)
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.9;
    const now = ctx.currentTime + delay;

    if (tone === "BELL") {
      playTone(ctx, 1000, now, 0.4, 0.4, "sine");
      playTone(ctx, 1500, now + 0.2, 0.5, 0.4, "sine");
    } else if (tone === "DIGITAL") {
      playTone(ctx, 783.99, now, 0.1, 0.3, "square");
      playTone(ctx, 1046.5, now + 0.1, 0.2, 0.3, "square");
    } else {
      // 3-tone celebration chime (C5 -> E5 -> G5)
      playTone(ctx, 523.25, now, 0.25, 0.35, "sine");
      playTone(ctx, 659.25, now + 0.1, 0.25, 0.35, "sine");
      playTone(ctx, 783.99, now + 0.2, 0.45, 0.4, "sine");
    }
  }
}
