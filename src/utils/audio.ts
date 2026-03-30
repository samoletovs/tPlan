/** Play a short beep using Web Audio API. Safe to call without user gesture on most browsers after first interaction. */
export function playBeep(frequency = 880, durationMs = 200) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    osc.onended = () => ctx.close();
  } catch {
    // Audio not available — silent fallback
  }
}

/** Trigger device vibration if available. */
export function vibrate(pattern: number | number[] = 200) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration not available — silent fallback
  }
}

/** Play beep + vibrate — used when a timer completes. */
export function timerAlert() {
  playBeep(880, 150);
  setTimeout(() => playBeep(880, 150), 200);
  vibrate([100, 50, 100]);
}
