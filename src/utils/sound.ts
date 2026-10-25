// Procedural Web Audio API sound effects + Background Music MP3 for этаTractor

const BGM_SRC = '/assets/aistudio/Workers-Resources-SnapYT.App_d4452c3d.mp3';

class SoundController {
  private ctx: AudioContext | null = null;
  private bgm: HTMLAudioElement | null = null;
  public musicVolume: number = 0.5;
  public sfxVolume: number = 0.8;
  public musicMuted: boolean = false;
  public sfxMuted: boolean = false;

  private ensureBGM(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.bgm) {
      this.bgm = new Audio(BGM_SRC);
      this.bgm.loop = true;
      this.bgm.volume = this.musicMuted ? 0 : this.musicVolume;
      this.bgm.muted = this.musicMuted;
      this.bgm.preload = 'auto';
    }
    return this.bgm;
  }

  public startBGM() {
    const audio = this.ensureBGM();
    if (!audio) return;
    audio.muted = this.musicMuted;
    audio.volume = this.musicMuted ? 0 : this.musicVolume;
    if (!this.musicMuted && this.musicVolume > 0 && audio.paused) {
      audio.play().catch(() => {
        // Browser autoplay blocked until first user gesture
      });
    }
  }

  public setMusicVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.musicVolume = clamped;
    this.musicMuted = clamped === 0;
    const audio = this.ensureBGM();
    if (!audio) return;
    audio.volume = this.musicMuted ? 0 : clamped;
    audio.muted = this.musicMuted;
    if (this.musicMuted) {
      audio.pause();
    } else if (audio.paused) {
      audio.play().catch(() => {});
    }
  }

  public setMusicMuted(nextMuted: boolean) {
    this.musicMuted = nextMuted;
    const audio = this.ensureBGM();
    if (!audio) return;
    audio.muted = nextMuted;
    audio.volume = nextMuted ? 0 : this.musicVolume;
    if (nextMuted) {
      audio.pause();
    } else if (this.musicVolume > 0) {
      audio.play().catch(() => {});
    }
  }

  public setSfxVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.sfxVolume = clamped;
    this.sfxMuted = clamped === 0;
  }

  public setSfxMuted(nextMuted: boolean) {
    this.sfxMuted = nextMuted;
  }

  private getSfxScale(): number {
    if (this.sfxMuted || this.sfxVolume <= 0) return 0;
    return this.sfxVolume;
  }

  private getContext(): AudioContext | null {
    if (this.getSfxScale() <= 0) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playMove(isMud: boolean = false, isRoad: boolean = false) {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Diesel tractor chug
    osc.type = 'sawtooth';
    const baseFreq = isMud ? 58 : isRoad ? 92 : 74;
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, now + 0.09);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.88, now + 0.18);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, now);

    gain.gain.setValueAtTime(Math.max(0.002, 0.08 * scale), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.19);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playPlow() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.16);

    gain.gain.setValueAtTime(Math.max(0.002, 0.14 * scale), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.17);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPlant() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.12);

    gain.gain.setValueAtTime(Math.max(0.002, 0.12 * scale), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playHarvest() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(Math.max(0.002, 0.11 * scale), now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.055 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.19);
    });
  }

  public playRefuel() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(480, now + 0.25);

    gain.gain.setValueAtTime(Math.max(0.002, 0.12 * scale), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.26);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playEquip() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.setValueAtTime(260, now + 0.06);

    gain.gain.setValueAtTime(Math.max(0.002, 0.07 * scale), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playUnlock() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(Math.max(0.002, 0.14 * scale), now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }

  public playError() {
    const ctx = this.getContext();
    const scale = this.getSfxScale();
    if (!ctx || scale <= 0) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(95, now + 0.22);

    gain.gain.setValueAtTime(Math.max(0.002, 0.12 * scale), now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playDeliver() {
    this.playUnlock();
  }
}

export const soundFX = new SoundController();

