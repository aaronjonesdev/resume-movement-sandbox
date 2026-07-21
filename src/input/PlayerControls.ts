import Phaser from 'phaser';

export type PlayerIntent = {
  direction: -1 | 0 | 1;
  jumpPressed: boolean;
};

export class PlayerControls {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<'left' | 'right' | 'jump', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
    }) as Record<'left' | 'right' | 'jump', Phaser.Input.Keyboard.Key>;
  }

  read(): PlayerIntent {
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const direction = left === right ? 0 : left ? -1 : 1;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.jump);

    return { direction, jumpPressed };
  }
}
