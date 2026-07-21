import Phaser from 'phaser';
import { PlayerControls } from '../input/PlayerControls';
import { StickFigurePlayer } from '../player/StickFigurePlayer';

const GROUND_OFFSET = 54;
const GROUND_THICKNESS = 2;

export class SandboxScene extends Phaser.Scene {
  private player!: StickFigurePlayer;
  private controls!: PlayerControls;
  private ground!: Phaser.GameObjects.Rectangle;
  private groundLine!: Phaser.GameObjects.Graphics;

  constructor() {
    super('sandbox');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.add('is-visible');
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    this.groundLine = this.add.graphics();
    this.ground = this.add.rectangle(0, 0, 1, 1, 0xffffff, 0);
    this.physics.add.existing(this.ground, true);

    this.player = new StickFigurePlayer(this, this.scale.width / 2, 100);
    this.controls = new PlayerControls(this);
    this.physics.add.collider(this.player, this.ground);

    this.layoutWorld(this.scale.width, this.scale.height, true);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on('reset-player', this.resetPlayer, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.game.events.off('reset-player', this.resetPlayer, this);
    });
  }

  update(_time: number, delta: number): void {
    this.player.updateFromIntent(this.controls.read(), delta);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layoutWorld(gameSize.width, gameSize.height, false);
  }

  private layoutWorld(width: number, height: number, resetPlayer: boolean): void {
    const groundY = Math.max(120, height - GROUND_OFFSET);

    this.physics.world.setBounds(0, 0, width, height);
    this.ground.setPosition(width / 2, groundY + GROUND_THICKNESS / 2);
    this.ground.setSize(width, GROUND_THICKNESS);
    this.ground.displayWidth = width;
    this.ground.displayHeight = GROUND_THICKNESS;
    (this.ground.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.groundLine.clear();
    this.groundLine.lineStyle(GROUND_THICKNESS, 0x000000, 1);
    this.groundLine.lineBetween(0, groundY, width, groundY);

    if (resetPlayer || this.player.y > groundY - 37) {
      this.player.resetTo(width / 2, groundY - 37);
    }
  }

  private resetPlayer(): void {
    const groundY = Math.max(120, this.scale.height - GROUND_OFFSET);
    this.player.resetTo(this.scale.width / 2, groundY - 37);
  }
}
