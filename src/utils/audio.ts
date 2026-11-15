/**
 * Web Audio API synthesizer for Stadium Referee Whistle & Goal Horn Alerts
 * Zero external audio files required - works instantly and offline
 */

class SoundEffectsController {
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public vibrationEnabled: boolean = true;
  private stadiumGainNode: GainNode | null = null;
  private stadiumSourceNode: AudioBufferSourceNode | null = null;
  private stadiumSwellOsc: OscillatorNode | null = null;
  private isAmbienceRunning: boolean = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Play crisp stadium whistle (e.g. Goal confirmed / Kickoff)
   */
  public playWhistle(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      // Trill frequencies between 2400Hz and 2800Hz
      osc1.frequency.setValueAtTime(2600, now);
      osc1.frequency.setValueAtTime(2850, now + 0.08);
      osc1.frequency.setValueAtTime(2600, now + 0.16);
      osc1.frequency.setValueAtTime(2900, now + 0.24);

      osc2.frequency.setValueAtTime(2650, now);
      osc2.frequency.setValueAtTime(2800, now + 0.08);
      osc2.frequency.setValueAtTime(2650, now + 0.16);
      osc2.frequency.setValueAtTime(2850, now + 0.24);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);

      if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([80, 50, 120]);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  /**
   * Play celebratory Goal Alert fanfare / stadium horn
   */
  public playGoalAlert(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Chord frequencies for stadium horn (F major chord: F4, A4, C5, F5)
      const freqs = [349.23, 440.0, 523.25, 698.46];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 1.05, now + 0.6);

        // Lowpass filter for warm brass timbre
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain.gain.setValueAtTime(0.12, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.85);
      });

      // Also trigger a whistle after short burst
      setTimeout(() => {
        this.playWhistle();
      }, 350);

      if (this.vibrationEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120, 60, 200, 60, 300]);
      }
    } catch (e) {
      console.warn('Goal sound error:', e);
    }
  }

  /**
   * Play tactile tap / click feedback
   */
  public playTap(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Start authentic stadium crowd background ambience
   */
  public startStadiumAmbience(volume: number = 0.35): void {
    if (!this.soundEnabled || this.isAmbienceRunning) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      // 1. Generate 3 seconds of stereo crowd noise
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          // Pink noise approximation
          const white = Math.random() * 2 - 1;
          const pink = (lastOut + 0.02 * white) / 1.02;
          lastOut = pink;
          data[i] = pink * 0.25;
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // Dual filters for stadium crowd roar resonance
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(650, ctx.currentTime);

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(320, ctx.currentTime);
      bandpass.Q.setValueAtTime(1.8, ctx.currentTime);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);

      // Low frequency oscillator for stadium cheering swell waves
      const swellOsc = ctx.createOscillator();
      const swellGain = ctx.createGain();
      swellOsc.frequency.setValueAtTime(0.25, ctx.currentTime); // Wave every 4 seconds
      swellGain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);

      swellOsc.connect(swellGain.gain);
      noiseSource.connect(lowpass);
      lowpass.connect(bandpass);
      bandpass.connect(masterGain);
      masterGain.connect(ctx.destination);

      noiseSource.start();
      swellOsc.start();

      this.stadiumSourceNode = noiseSource;
      this.stadiumGainNode = masterGain;
      this.stadiumSwellOsc = swellOsc;
      this.isAmbienceRunning = true;
    } catch (e) {
      console.warn('Failed to start stadium ambience:', e);
    }
  }

  /**
   * Stop stadium crowd background ambience
   */
  public stopStadiumAmbience(): void {
    if (!this.isAmbienceRunning) return;
    try {
      if (this.stadiumGainNode && this.audioCtx) {
        this.stadiumGainNode.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.4);
      }
      setTimeout(() => {
        try {
          this.stadiumSourceNode?.stop();
          this.stadiumSwellOsc?.stop();
          this.stadiumSourceNode?.disconnect();
          this.stadiumSwellOsc?.disconnect();
        } catch (_) {}
        this.stadiumSourceNode = null;
        this.stadiumGainNode = null;
        this.stadiumSwellOsc = null;
        this.isAmbienceRunning = false;
      }, 500);
    } catch (_) {
      this.isAmbienceRunning = false;
    }
  }

  public setStadiumVolume(volume: number): void {
    if (this.stadiumGainNode && this.audioCtx) {
      this.stadiumGainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.audioCtx.currentTime);
    }
  }

  public isAmbienceActive(): boolean {
    return this.isAmbienceRunning;
  }

  /**
   * Speak live Thai football commentary through browser speech synthesizer
   */
  public speakCommentary(text: string): void {
    if (!this.soundEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'th-TH';
      utter.rate = 1.05;
      utter.pitch = 1.1;
      utter.volume = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }
}

export const soundManager = new SoundEffectsController();

