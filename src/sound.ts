import { load, store } from './pieces.ts';

let on = load('sound') !== 'off';
let audio: AudioContext | undefined;

export const sound = {
  get on() { return on; },
  set(value: boolean) { on = value; store('sound', value ? '' : 'off'); },
  /** short synthesized knock; lower and louder for captures */
  play(capture: boolean) {
    // browsers block audio before first click
    if (!on || !navigator.userActivation?.hasBeenActive) return;
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const now = audio.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(capture ? 220 : 340, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);
    gain.gain.setValueAtTime(capture ? 0.35 : 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  },
};
