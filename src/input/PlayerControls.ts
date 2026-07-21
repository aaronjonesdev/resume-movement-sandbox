import Phaser from 'phaser';

export type PlayerIntent = {
  direction: -1 | 0 | 1;
  vertical: -1 | 0 | 1;
  jumpPressed: boolean;
  interactPressed: boolean;
};

export class PlayerControls {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<'left' | 'right' | 'up' | 'down' | 'interact', Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      interact: Phaser.Input.Keyboard.KeyCodes.E,
    }) as Record<'left' | 'right' | 'up' | 'down' | 'interact', Phaser.Input.Keyboard.Key>;
  }

  read(): PlayerIntent {
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const direction = left === right ? 0 : left ? -1 : 1;
    const up = this.cursors.up.isDown || this.keys.up.isDown;
    const down = this.cursors.down.isDown || this.keys.down.isDown;
    const vertical = up === down ? 0 : up ? -1 : 1;
    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
      Phaser.Input.Keyboard.JustDown(this.keys.up);
    const interactPressed = Phaser.Input.Keyboard.JustDown(this.keys.interact);

    return { direction, vertical, jumpPressed, interactPressed };
  }
}
