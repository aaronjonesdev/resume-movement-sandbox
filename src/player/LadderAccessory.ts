import Phaser from 'phaser';
import type { PlayerAccessory, PlayerPose } from './PlayerAccessory';

const LADDER_ORANGE = 0xe87518;

export class LadderAccessory implements PlayerAccessory {
  readonly displayObject: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    const ladder = scene.add.graphics();
    ladder.lineStyle(4, LADDER_ORANGE, 1);
    ladder.lineBetween(-42, -7, 42, -7);
    ladder.lineBetween(-42, 7, 42, 7);

    for (let x = -34; x <= 34; x += 17) {
      ladder.lineBetween(x, -7, x, 7);
    }

    this.displayObject = scene.add.container(0, 0, [ladder]).setPosition(28, -2).setDepth(-1);
  }

  updatePose(pose: PlayerPose): void {
    this.displayObject.setPosition(28 * pose.facing, -2).setScale(pose.facing, 1);
  }

  setCarried(carried: boolean): void {
    this.displayObject.setVisible(carried);
  }
}
