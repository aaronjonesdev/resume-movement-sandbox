import Phaser from 'phaser';
import {
  COURSE_DURATION,
  FINISH_CROSSING_DELAY,
  DrivingEnvironment,
  type CourseObstacle,
} from '../level/DrivingEnvironment';

type LevelState = 'countdown' | 'driving' | 'failed' | 'success' | 'complete';

const MAX_HITS = 3;
const PLAYER_STEER_SPEED = 1.15;
const AUTONOMOUS_BLEND_RATE = 1.45;

export class LevelTwoScene extends Phaser.Scene {
  private environment!: DrivingEnvironment;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'left' | 'right', Phaser.Input.Keyboard.Key>;
  private heading!: Phaser.GameObjects.Container;
  private briefing!: Phaser.GameObjects.Container;
  private countdownText!: Phaser.GameObjects.Text;
  private hitCounter!: Phaser.GameObjects.Text;
  private warning!: Phaser.GameObjects.Text;
  private failurePanel!: Phaser.GameObjects.Container;
  private successPanel!: Phaser.GameObjects.Container;
  private missionPanel!: Phaser.GameObjects.Container;
  private flash!: Phaser.GameObjects.Rectangle;

  private state: LevelState = 'countdown';
  private countdownElapsed = 0;
  private courseTime = 0;
  private successElapsed = 0;
  private feedbackElapsed = 0;
  private vehicleX = 0;
  private hits = 0;

  constructor() {
    super('level-two');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.add('is-visible');

    this.environment = new DrivingEnvironment(this);
    this.createInput();
    this.heading = this.createHeading().setDepth(10);
    this.briefing = this.createBriefing().setDepth(10);
    this.countdownText = this.makeText('3', 64, '#000000').setDepth(12);
    this.hitCounter = this.makeText('Obstacles Hit: 0 / 3', 15, '#000000').setOrigin(0, 0).setDepth(11);
    this.warning = this.makeText('', 19, '#000000').setDepth(13).setVisible(false);
    this.flash = this.add.rectangle(0, 0, 1, 1, 0xb52b27, 0).setOrigin(0).setDepth(9);
    this.failurePanel = this.createFailurePanel().setVisible(false).setDepth(20);
    this.successPanel = this.createSuccessPanel().setVisible(false).setDepth(20);
    this.missionPanel = this.createMissionPanel().setVisible(false).setDepth(21);

    this.layout(this.scale.width, this.scale.height);
    this.resetCourse();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on('reset-player', this.restartLevel, this);
    this.input.keyboard?.on('keydown-ENTER', this.continueToLevelThree, this);
    this.input.keyboard?.on('keydown-SPACE', this.retryAfterFailure, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50) / 1000;
    this.updateFeedback(delta);

    if (this.state === 'countdown') {
      this.updateCountdown(delta);
      this.environment.update(0, this.vehicleX);
      return;
    }

    if (this.state === 'driving') {
      this.updateDriving(delta);
      return;
    }

    if (this.state === 'success') {
      this.successElapsed += delta;
      this.environment.update(COURSE_DURATION + FINISH_CROSSING_DELAY, this.vehicleX);
      if (this.successElapsed >= 1.15) this.showMissionPanel();
      return;
    }

  }

  private createInput(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input is unavailable.');
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<'left' | 'right', Phaser.Input.Keyboard.Key>;
  }

  private updateCountdown(delta: number): void {
    this.countdownElapsed += delta;
    const step = Math.floor(this.countdownElapsed / 0.9);
    const labels = ['3', '2', '1', 'GO!'];
    this.countdownText.setText(labels[Math.min(step, 3)]);

    if (this.countdownElapsed >= 3.6) {
      this.state = 'driving';
      this.countdownText.setVisible(false);
      this.tweens.add({ targets: this.briefing, alpha: 0, duration: 300 });
    }
  }

  private updateDriving(delta: number): void {
    const completionTime = COURSE_DURATION + FINISH_CROSSING_DELAY;
    this.courseTime = Math.min(completionTime, this.courseTime + delta);
    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const steering = left === right ? 0 : left ? -1 : 1;

    if (steering !== 0) {
      this.vehicleX += steering * PLAYER_STEER_SPEED * delta;
    } else {
      const target = this.environment.nextGuidanceTarget(this.courseTime);
      const blend = 1 - Math.exp(-AUTONOMOUS_BLEND_RATE * delta);
      this.vehicleX = Phaser.Math.Linear(this.vehicleX, target, blend);
    }
    this.vehicleX = Phaser.Math.Clamp(this.vehicleX, -0.88, 0.88);

    this.environment.update(this.courseTime, this.vehicleX);
    const collision = this.environment.checkCollision(this.courseTime, this.vehicleX);
    if (collision) this.registerHit(collision);

    if (this.courseTime >= completionTime && this.state === 'driving') this.passTest();
  }

  private registerHit(obstacle: CourseObstacle): void {
    this.environment.registerHit(obstacle);
    this.hits += 1;
    this.hitCounter.setText(`Obstacles Hit: ${this.hits} / ${MAX_HITS}`);
    this.warning.setText(`OBSTACLE HIT!\nObstacles Hit: ${this.hits} / ${MAX_HITS}`).setVisible(true);
    this.feedbackElapsed = 0.8;
    this.flash.setAlpha(0.18);
    this.cameras.main.shake(100, 0.004);

    if (this.hits >= MAX_HITS) this.failTest();
  }

  private updateFeedback(delta: number): void {
    if (this.feedbackElapsed <= 0) return;
    this.feedbackElapsed = Math.max(0, this.feedbackElapsed - delta);
    this.flash.setAlpha((this.feedbackElapsed / 0.8) * 0.18);
    if (this.feedbackElapsed === 0) this.warning.setVisible(false);
  }

  private failTest(): void {
    this.state = 'failed';
    this.failurePanel.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.failurePanel, alpha: 1, duration: 180 });
  }

  private passTest(): void {
    this.state = 'success';
    this.successElapsed = 0;
    this.warning.setVisible(false);
    this.successPanel.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.successPanel, alpha: 1, duration: 220 });
  }

  private showMissionPanel(): void {
    if (this.state !== 'success') return;
    this.state = 'complete';
    this.successPanel.setVisible(false);
    this.heading.setAlpha(0.22);
    this.missionPanel.setVisible(true).setAlpha(0);
    const result = this.missionPanel.getByName('result') as Phaser.GameObjects.Text;
    result.setText(`Test Result: PASS  •  Obstacle Contacts: ${this.hits} / ${MAX_HITS}`);
    this.tweens.add({ targets: this.missionPanel, alpha: 1, duration: 240 });
  }

  private resetCourse(): void {
    this.state = 'countdown';
    this.countdownElapsed = 0;
    this.courseTime = 0;
    this.successElapsed = 0;
    this.feedbackElapsed = 0;
    this.vehicleX = 0;
    this.hits = 0;
    this.environment.reset();
    this.hitCounter.setText('Obstacles Hit: 0 / 3');
    this.countdownText.setText('3').setVisible(true);
    this.briefing.setVisible(true).setAlpha(1);
    this.warning.setVisible(false);
    this.failurePanel.setVisible(false);
    this.successPanel.setVisible(false);
    this.missionPanel.setVisible(false);
    this.flash.setAlpha(0);
  }

  private createHeading(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 690, 68, 0xffffff, 0.95).setStrokeStyle(2, 0x000000);
    const title = this.makeText('LEVEL 2 — KETT ENGINEERING', 20, '#000000').setPosition(0, -12);
    const subtitle = this.makeText('Autonomous Vehicle Test Driver/Operator • 2022–2024', 13, '#000000').setPosition(0, 18);
    panel.add([background, title, subtitle]);
    return panel;
  }

  private createBriefing(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 440, 130, 0xffffff, 0.95).setStrokeStyle(2, 0x000000);
    const text = this.makeText(
      'Objective:\nDon’t hit the obstacles!\n\nControls:\nA / ←  Swerve Left     D / →  Swerve Right',
      14,
      '#000000',
    ).setLineSpacing(4);
    panel.add([background, text]);
    return panel;
  }

  private createFailurePanel(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 480, 180, 0xffffff, 0.98).setStrokeStyle(3, 0x000000);
    const title = this.makeText('TEST FAILED', 27, '#000000').setPosition(0, -48);
    const detail = this.makeText('Too many obstacle contacts.', 15, '#000000').setPosition(0, 0);
    const retry = this.makeText('Press SPACE to Retry', 14, '#000000').setPosition(0, 50);
    panel.add([background, title, detail, retry]);
    return panel;
  }

  private createSuccessPanel(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 520, 150, 0xffffff, 0.98).setStrokeStyle(3, 0x000000);
    const check = this.add.graphics();
    check.lineStyle(7, 0x238823, 1);
    check.beginPath();
    check.moveTo(-208, -6);
    check.lineTo(-193, 10);
    check.lineTo(-166, -22);
    check.strokePath();
    const title = this.makeText('AUTONOMOUS TEST PASSED', 22, '#000000').setPosition(45, -5);
    panel.add([background, check, title]);
    return panel;
  }

  private createMissionPanel(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 760, 430, 0xffffff, 0.98).setStrokeStyle(3, 0x000000);
    const mission = this.makeText('MISSION COMPLETE', 25, '#000000').setPosition(0, -180);
    const company = this.makeText('KETT ENGINEERING', 19, '#000000').setPosition(0, -140);
    const role = this.makeText('Autonomous Vehicle Test Driver/Operator', 15, '#000000').setPosition(0, -105);
    const dates = this.makeText('04/2022 – 05/2024', 14, '#000000').setPosition(0, -74);
    const experience = this.makeText(
      '• Logged over 20,000 autonomous vehicle test miles.\n' +
        '• Monitored system performance and escalated issues to engineering teams.\n' +
        '• Collected test data and prepared detailed analytical reports.\n' +
        '• Collaborated with engineers to improve reliability, safety, and system performance.',
      13,
      '#000000',
    )
      .setOrigin(0.5)
      .setAlign('left')
      .setLineSpacing(9)
      .setPosition(0, 20);
    const result = this.makeText('', 12, '#000000').setName('result').setPosition(0, 135);
    const next = this.makeText('Press ENTER to Continue', 13, '#000000').setPosition(0, 178);
    panel.add([background, mission, company, role, dates, experience, result, next]);
    return panel;
  }

  private makeText(text: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add
      .text(0, 0, text, {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private layout(width: number, height: number): void {
    this.environment.layout(width, height);
    const headingScale = Math.min(1, (width - 24) / 690);
    this.heading.setPosition(width / 2, 46).setScale(Math.max(0.46, headingScale));
    const briefingScale = Math.min(1, (width - 24) / 440);
    this.briefing.setPosition(width / 2, Math.max(145, height * 0.32)).setScale(Math.max(0.52, briefingScale));
    this.countdownText.setPosition(width / 2, height * 0.58);
    this.hitCounter.setPosition(14, 88);
    this.warning.setPosition(width / 2, height * 0.53);
    this.flash.setSize(width, height);

    const overlayScale = Math.min(1, (width - 28) / 520);
    this.failurePanel.setPosition(width / 2, height / 2).setScale(Math.max(0.52, overlayScale));
    this.successPanel.setPosition(width / 2, height / 2).setScale(Math.max(0.52, overlayScale));
    const missionScale = Math.min(1, (width - 28) / 760, (height - 28) / 430);
    this.missionPanel.setPosition(width / 2, height / 2).setScale(Math.max(0.43, missionScale));
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private restartLevel(): void {
    this.scene.restart();
  }

  private continueToLevelThree(): void {
    if (this.state === 'complete') this.scene.start('level-three');
  }

  private retryAfterFailure(): void {
    if (this.state === 'failed') this.scene.restart();
  }

  private shutdown(): void {
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off('reset-player', this.restartLevel, this);
    this.input.keyboard?.off('keydown-ENTER', this.continueToLevelThree, this);
    this.input.keyboard?.off('keydown-SPACE', this.retryAfterFailure, this);
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
