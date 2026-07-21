import Phaser from 'phaser';
import { SandboxScene } from './scenes/SandboxScene';
import { TitleScene } from './scenes/TitleScene';
import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#ffffff',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 1500 },
      debug: false,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  scene: [TitleScene, SandboxScene],
});

document.querySelector<HTMLButtonElement>('#reset-button')?.addEventListener('click', () => {
  game.events.emit('reset-player');
});
