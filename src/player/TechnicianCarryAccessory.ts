import Phaser from 'phaser';
import type { PlayerAccessory, PlayerPose } from './PlayerAccessory';

export type TechnicianItem = 'server' | 'fiber' | 'copper';

export class TechnicianCarryAccessory implements PlayerAccessory {
  readonly displayObject: Phaser.GameObjects.Container;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private item: TechnicianItem | null = null;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.displayObject = scene.add.container(0, 0, [this.graphics]).setVisible(false).setDepth(2);
  }

  carry(item: TechnicianItem | null): void {
    this.item = item;
    this.displayObject.setVisible(item !== null);
    this.draw();
  }

  updatePose(pose: PlayerPose): void {
    this.displayObject.setPosition(16 * pose.facing, 6).setScale(pose.facing, 1);
  }

  private draw(): void {
    const g = this.graphics;
    g.clear();
    if (this.item === 'server') {
      g.fillStyle(0xd8d8d8, 1);
      g.fillRect(-22, -12, 44, 24);
      g.lineStyle(2, 0x000000, 1);
      g.strokeRect(-22, -12, 44, 24);
      g.fillStyle(0x000000, 1);
      g.fillCircle(13, 0, 3);
    } else if (this.item === 'fiber') {
      g.lineStyle(5, 0xe5b900, 1);
      g.strokeCircle(0, 0, 13);
      g.strokeCircle(0, 0, 7);
    } else if (this.item === 'copper') {
      g.lineStyle(5, 0x235f9e, 1);
      g.strokeCircle(0, 0, 13);
      g.strokeCircle(0, 0, 7);
    }
  }
}
