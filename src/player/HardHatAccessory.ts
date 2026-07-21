import Phaser from 'phaser';
import type { PlayerAccessory, PlayerPose } from './PlayerAccessory';

const HARD_HAT_YELLOW = 0xf2c500;

export class HardHatAccessory implements PlayerAccessory {
  readonly displayObject: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const hat = scene.add.graphics();
    hat.fillStyle(HARD_HAT_YELLOW, 1);
    hat.beginPath();
    hat.moveTo(-10, 2);
    hat.lineTo(-8, -4);
    hat.lineTo(-4, -9);
    hat.lineTo(4, -9);
    hat.lineTo(8, -4);
    hat.lineTo(10, 2);
    hat.closePath();
    hat.fillPath();
    hat.fillRect(-14, 1, 28, 5);
    hat.lineStyle(2, 0x000000, 1);
    hat.beginPath();
    hat.moveTo(-10, 2);
    hat.lineTo(-8, -4);
    hat.lineTo(-4, -9);
    hat.lineTo(4, -9);
    hat.lineTo(8, -4);
    hat.lineTo(10, 2);
    hat.strokePath();
    hat.lineBetween(-14, 1, 14, 1);
    hat.lineBetween(-14, 6, 14, 6);
    hat.lineBetween(-14, 1, -14, 6);
    hat.lineBetween(14, 1, 14, 6);
    hat.lineBetween(0, -9, 0, 1);
    this.displayObject = scene.add.container(0, -37, [hat]).setDepth(3);
  }

  updatePose(_pose: PlayerPose): void {
    this.displayObject.setPosition(0, -37);
  }
}
