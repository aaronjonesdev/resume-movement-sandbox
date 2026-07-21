import Phaser from 'phaser';

export const BACKGROUND_MUSIC_KEY = 'coffee-house-bump';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  preload(): void {
    this.load.audio(BACKGROUND_MUSIC_KEY, '/assets/audio/coffee-house-bump.mp3');
  }

  create(): void {
    if (!this.registry.has('music-muted')) this.registry.set('music-muted', false);
    this.scene.launch('music');
    this.scene.start('title');
  }
}
