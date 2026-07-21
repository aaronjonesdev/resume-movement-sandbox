import Phaser from 'phaser';
import { PlayerControls } from '../input/PlayerControls';
import { CableTechEnvironment } from '../level/CableTechEnvironment';
import { LadderAccessory } from '../player/LadderAccessory';
import { StickFigurePlayer } from '../player/StickFigurePlayer';

const CLIMB_SPEED = 155;

export class LevelOneScene extends Phaser.Scene {
  private player!: StickFigurePlayer;
  private controls!: PlayerControls;
  private environment!: CableTechEnvironment;
  private carriedLadder!: LadderAccessory;
  private ground!: Phaser.GameObjects.Rectangle;
  private prompt!: Phaser.GameObjects.Text;
  private levelHeading!: Phaser.GameObjects.Container;
  private missionPanel!: Phaser.GameObjects.Container;
  private climbing = false;
  private completed = false;

  constructor() {
    super('level-one');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.add('is-visible');

    this.environment = new CableTechEnvironment(this);
    this.ground = this.add.rectangle(0, 0, 1, 2, 0xffffff, 0);
    this.physics.add.existing(this.ground, true);

    this.player = new StickFigurePlayer(this, 80, 100);
    this.carriedLadder = new LadderAccessory(this);
    this.player.addAccessory(this.carriedLadder);
    this.controls = new PlayerControls(this);
    this.physics.add.collider(this.player, this.ground);

    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setVisible(false);

    this.levelHeading = this.createLevelHeading().setDepth(6);
    this.missionPanel = this.createMissionPanel().setVisible(false).setDepth(10);
    this.layoutWorld(this.scale.width, this.scale.height, true);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on('reset-player', this.restartLevel, this);
    this.input.keyboard?.on('keydown-ENTER', this.continueToLevelTwo, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.game.events.off('reset-player', this.restartLevel, this);
      this.input.keyboard?.off('keydown-ENTER', this.continueToLevelTwo, this);
    });
  }

  update(_time: number, delta: number): void {
    if (this.completed) {
      this.player.body.setVelocity(0, 0);
      return;
    }

    const intent = this.controls.read();

    if (this.climbing) {
      this.updateClimbing(intent.vertical, delta);
    } else if (this.environment.isAtLadderBase(this.player.x, this.player.y) && intent.vertical < 0) {
      this.climbing = true;
      this.player.setClimbing(true);
      this.player.alignForClimb(
        this.environment.ladderXAt(this.environment.climbBottomY),
        this.environment.climbBottomY,
      );
      this.updateClimbing(intent.vertical, delta);
    } else {
      this.player.updateFromIntent(intent, delta);
    }

    if (intent.interactPressed) this.handleInteraction();
    this.updatePrompt();
  }

  private handleInteraction(): void {
    if (this.environment.isNearPlacement(this.player.x, this.player.y)) {
      this.environment.placeLadder();
      this.carriedLadder.setCarried(false);
      return;
    }

    if (this.environment.isNearCable(this.player.x, this.player.y)) {
      this.environment.connectCable(() => this.completeMission());
    }
  }

  private updateClimbing(direction: -1 | 0 | 1, delta: number): void {
    if (direction === 0) {
      this.player.updateClimbingPose(direction, delta);
      return;
    }

    const nextY = Phaser.Math.Clamp(
      this.player.y + direction * CLIMB_SPEED * (delta / 1000),
      this.environment.climbTopY,
      this.environment.climbBottomY,
    );

    if (nextY !== this.player.y) {
      this.player.alignForClimb(this.environment.ladderXAt(nextY), nextY);
    }
    this.player.updateClimbingPose(direction, delta);

    if (nextY >= this.environment.climbBottomY && direction > 0) {
      this.climbing = false;
      this.player.setClimbing(false);
    }
  }

  private updatePrompt(): void {
    let text = '';

    if (this.environment.isNearPlacement(this.player.x, this.player.y)) {
      text = 'Press E to Place Ladder';
    } else if (this.environment.isAtLadderBase(this.player.x, this.player.y)) {
      text = 'Press W or ↑ to Climb';
    } else if (this.environment.isNearCable(this.player.x, this.player.y)) {
      text = 'Press E to Connect Cable';
    }

    this.prompt
      .setText(text)
      .setPosition(this.player.x, Math.max(28, this.player.y - 70))
      .setVisible(text.length > 0);
  }

  private completeMission(): void {
    this.completed = true;
    this.climbing = false;
    this.player.setClimbing(true);
    this.prompt.setVisible(false);
    this.levelHeading.setAlpha(0.25);
    this.missionPanel.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.missionPanel, alpha: 1, duration: 220 });
  }

  private createMissionPanel(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 680, 265, 0xffffff, 0.96).setStrokeStyle(3, 0x000000);
    const mission = this.makeCenteredText(-100, 'MISSION COMPLETE', 24, '#000000');
    const company = this.makeCenteredText(-59, 'COX COMMUNICATIONS', 18, '#000000');
    const role = this.makeCenteredText(-25, 'Cable Technician / Sales Representative', 14, '#000000');
    const dates = this.makeCenteredText(7, '2017–2019', 14, '#000000');
    const detail = this.makeCenteredText(
      52,
      'Installed and configured residential and business\nnetwork infrastructure.',
      14,
      '#000000',
    );
    const next = this.makeCenteredText(105, 'Press ENTER to Continue', 13, '#000000');
    panel.add([background, mission, company, role, dates, detail, next]);
    return panel;
  }

  private createLevelHeading(): Phaser.GameObjects.Container {
    const heading = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 540, 66, 0xffffff, 0.94).setStrokeStyle(2, 0x000000);
    const title = this.makeCenteredText(-12, 'LEVEL 1 — COX COMMUNICATIONS', 19, '#000000');
    const subtitle = this.makeCenteredText(17, 'Cable Technician • 2017–2019', 13, '#000000');
    heading.add([background, title, subtitle]);
    return heading;
  }

  private makeCenteredText(y: number, text: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(0, y, text, {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        align: 'center',
        lineSpacing: 5,
      })
      .setOrigin(0.5);
  }

  private layoutWorld(width: number, height: number, resetPlayer: boolean): void {
    this.physics.world.setBounds(0, 0, width, height);
    this.environment.layout(width, height);

    this.ground.setPosition(width / 2, this.environment.groundY + 1).setSize(width, 2);
    this.ground.displayWidth = width;
    this.ground.displayHeight = 2;
    (this.ground.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    const panelScale = Math.min(1, (width - 32) / 680);
    this.missionPanel.setPosition(width / 2, height / 2).setScale(Math.max(0.48, panelScale));
    const headingScale = Math.min(1, (width - 24) / 540);
    this.levelHeading.setPosition(width / 2, 48).setScale(Math.max(0.5, headingScale));

    if (resetPlayer) {
      this.player.resetTo(Math.max(55, width * 0.16), this.environment.groundY - 37);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layoutWorld(gameSize.width, gameSize.height, false);
  }

  private restartLevel(): void {
    this.scene.restart();
  }

  private continueToLevelTwo(): void {
    if (!this.completed) return;
    console.info('Level 2 placeholder: continuing the career journey.');
    this.scene.start('level-two');
  }
}
