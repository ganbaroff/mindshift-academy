"use client";

let isMuted = false;
const audioCache: Record<string, HTMLAudioElement> = {};

// Synthesize sounds using Web Audio API as a robust fallback if asset fails to load
function playSynthSound(type: string) {
  if (typeof window === "undefined" || isMuted) return;
  try {
    const AudioContext = window.AudioContext || (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case "success":
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
        break;
      case "crystal":
        osc.type = "triangle";
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
        break;
      case "click":
      case "tick":
        osc.type = "sine";
        osc.frequency.setValueAtTime(850, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      case "hint":
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      case "gacha":
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      case "ambient":
        osc.type = "sine";
        osc.frequency.setValueAtTime(110, now); // A2
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 1.0);
        osc.start(now);
        osc.stop(now + 1.0);
        break;
      default:
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
    }
  } catch (e) {
    console.warn("Synth fallback failed:", e);
  }
}

export const soundEngine = {
  preload: () => {
    if (typeof window === "undefined") return;
    const soundKeys = ["success", "hint", "ambient", "tick", "gacha", "crystal", "click", "level_up", "achievement", "fail"];
    soundKeys.forEach((key) => {
      try {
        const audio = new Audio(`/sounds/${key}.wav`);
        audio.preload = "auto";
        audioCache[key] = audio;
      } catch (err) {
        console.warn(`Failed to preload audio asset for key: ${key}`, err);
      }
    });
  },

  play: (key: string) => {
    if (typeof window === "undefined" || isMuted) return;
    
    const cachedAudio = audioCache[key];
    if (cachedAudio) {
      try {
        cachedAudio.currentTime = 0;
        cachedAudio.volume = key === "ambient" ? 0.2 : 0.55;
        const playPromise = cachedAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn(`Audio play failed for '${key}', falling back to synth:`, err.message);
            playSynthSound(key);
          });
        }
      } catch (err) {
        console.warn(`HTML5 Audio failed, using synth:`, err);
        playSynthSound(key);
      }
    } else {
      playSynthSound(key);
    }
  },

  toggleMute: () => {
    isMuted = !isMuted;
    Object.values(audioCache).forEach((audio) => {
      audio.muted = isMuted;
    });
    return isMuted;
  },

  isMuted: () => isMuted
};
