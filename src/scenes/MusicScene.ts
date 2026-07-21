import Phaser from 'phaser';
import { BACKGROUND_MUSIC_KEY } from './BootScene';

const MUSIC_VOLUME = 0.25;

export class MusicScene extends Phaser.Scene {
  private music!: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
  private statusElement: HTMLElement | null = null;

  constructor() {
    super('music');
  }

  create(): void {
    this.statusElement = document.querySelector<HTMLElement>('#music-status');
    this.music = this.sound.add(BACKGROUND_MUSIC_KEY, {
      loop: true,
      volume: MUSIC_VOLUME,
      mute: this.registry.get('music-muted') === true,
    }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

    this.updateStatus();
    this.attemptPlayback();

    this.sound.once(Phaser.Sound.Events.UNLOCKED, this.attemptPlayback, this);
    window.addEventListener('pointerdown', this.attemptPlayback, { once: true });
    window.addEventListener('keydown', this.handleKeydown);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private attemptPlayback = (): void => {
    if (!this.music.isPlaying) this.music.play();
  };

  private toggleMute(): void {
    const muted = !this.music.mute;
    this.music.setMute(muted);
    this.registry.set('music-muted', muted);
    this.updateStatus();
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    this.attemptPlayback();
    if (!event.repeat && event.key.toLowerCase() === 'm') this.toggleMute();
  };

  private updateStatus(): void {
    if (!this.statusElement) return;
    this.statusElement.textContent = this.music.mute
      ? 'Press M to unmute music'
      : 'Press M to mute music';
  }

  private shutdown(): void {
    this.sound.off(Phaser.Sound.Events.UNLOCKED, this.attemptPlayback, this);
    window.removeEventListener('pointerdown', this.attemptPlayback);
    window.removeEventListener('keydown', this.handleKeydown);
  }
}
