import Phaser from 'phaser';

export type PlayerPose = {
  facing: -1 | 1;
  walkCycle: number;
  grounded: boolean;
};

/** A future hard hat, vest, headphones, or tool can implement this interface. */
export interface PlayerAccessory {
  readonly displayObject: Phaser.GameObjects.GameObject;
  updatePose(pose: PlayerPose): void;
}
