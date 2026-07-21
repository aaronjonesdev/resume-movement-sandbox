import Phaser from 'phaser';
import { PlayerControls } from '../input/PlayerControls';
import { DataCenterEnvironment } from '../level/DataCenterEnvironment';
import { StickFigurePlayer } from '../player/StickFigurePlayer';
import { HardHatAccessory } from '../player/HardHatAccessory';
import { TechnicianCarryAccessory, type TechnicianItem } from '../player/TechnicianCarryAccessory';

type LevelState = 'playing' | 'animating' | 'cinematic' | 'success' | 'complete';

const TASKS: Array<{ item: TechnicianItem; objective: string; pickup: string; action: string }> = [
  { item: 'server', objective: 'Install Server', pickup: 'Pick Up Server', action: 'Install Server' },
  { item: 'fiber', objective: 'Connect Fiber', pickup: 'Pick Up Fiber', action: 'Connect Fiber' },
  { item: 'copper', objective: 'Connect Copper', pickup: 'Pick Up Copper', action: 'Connect Copper' },
];

export class LevelThreeScene extends Phaser.Scene {
  private environment!: DataCenterEnvironment;
  private player!: StickFigurePlayer;
  private controls!: PlayerControls;
  private carryAccessory!: TechnicianCarryAccessory;
  private ground!: Phaser.GameObjects.Rectangle;
  private heading!: Phaser.GameObjects.Container;
  private briefing!: Phaser.GameObjects.Container;
  private objective!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private successPanel!: Phaser.GameObjects.Container;
  private missionPanel!: Phaser.GameObjects.Container;
  private state: LevelState = 'playing';
  private step = 0;
  private carriedItem: TechnicianItem | null = null;
  private audioContext: AudioContext | null = null;
  private hum: { oscillator: OscillatorNode; gain: GainNode } | null = null;

  constructor() {
    super('level-three');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.add('is-visible');
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.add('is-visible');

    this.environment = new DataCenterEnvironment(this);
    this.ground = this.add.rectangle(0, 0, 1, 2, 0xffffff, 0);
    this.physics.add.existing(this.ground, true);
    this.player = new StickFigurePlayer(this, 80, 100);
    this.carryAccessory = new TechnicianCarryAccessory(this);
    this.player.addAccessory(this.carryAccessory);
    this.player.addAccessory(new HardHatAccessory(this));
    this.controls = new PlayerControls(this);
    this.physics.add.collider(this.player, this.ground);

    this.heading = this.createHeading().setDepth(10);
    this.briefing = this.createBriefing().setDepth(10);
    this.objective = this.makeText('OBJECTIVE: INSTALL SERVER', 15, '#000000')
      .setOrigin(0, 0.5).setBackgroundColor('#ffffff').setPadding(6, 4).setDepth(10);
    this.prompt = this.makeText('', 14, '#000000')
      .setBackgroundColor('#ffffff').setPadding(6, 4).setDepth(10).setVisible(false);
    this.successPanel = this.createSuccessPanel().setVisible(false).setDepth(20);
    this.missionPanel = this.createMissionPanel().setVisible(false).setDepth(21);

    this.layout(this.scale.width, this.scale.height, true);
    this.resetLevel();
    this.time.delayedCall(2600, () => {
      if (this.state === 'playing') this.tweens.add({ targets: this.briefing, alpha: 0, duration: 300 });
    });
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.on('reset-player', this.restartLevel, this);
    this.game.events.on('skip-level', this.skipToMission, this);
    this.input.keyboard?.on('keydown-E', this.interactFromKeyboard, this);
    this.input.keyboard?.on('keydown-ENTER', this.continueJourney, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  update(_time: number, deltaMs: number): void {
    this.environment.update(deltaMs);
    if (this.state !== 'playing') {
      this.player.body.setVelocityX(0);
      return;
    }

    const intent = this.controls.read();
    this.player.updateFromIntent(intent, deltaMs);
    this.updatePrompt();
  }

  private interactFromKeyboard(): void {
    if (this.state === 'playing') this.handleInteraction();
  }

  private handleInteraction(): void {
    if (this.environment.isNearActiveItem(this.player.x, this.player.y)) {
      this.carriedItem = this.environment.pickupActiveItem();
      this.carryAccessory.carry(this.carriedItem);
      return;
    }
    if (!this.carriedItem || !this.environment.isNearRack(this.player.x, this.player.y)) return;

    this.state = 'animating';
    this.player.body.setVelocity(0, 0);
    this.player.body.setAcceleration(0, 0);
    this.prompt.setVisible(false);
    const item = this.carriedItem;
    this.carriedItem = null;
    this.carryAccessory.carry(null);
    const complete = () => this.completeTask();
    if (item === 'server') this.environment.installServer(complete);
    else if (item === 'fiber') this.environment.connectFiber(complete);
    else this.environment.connectCopper(complete);
  }

  private completeTask(): void {
    this.playConfirmation();
    if (this.step >= TASKS.length - 1) {
      this.beginCinematic();
      return;
    }
    this.step += 1;
    this.environment.activate(TASKS[this.step].item);
    this.objective.setText(`OBJECTIVE: ${TASKS[this.step].objective.toUpperCase()}`);
    this.state = 'playing';
  }

  private updatePrompt(): void {
    const task = TASKS[this.step];
    let text = '';
    if (this.environment.isNearActiveItem(this.player.x, this.player.y)) text = `Press E to ${task.pickup}`;
    else if (this.carriedItem && this.environment.isNearRack(this.player.x, this.player.y)) text = `Press E to ${task.action}`;
    this.prompt.setText(text).setPosition(this.player.x, Math.max(110, this.player.y - 72)).setVisible(text.length > 0);
  }

  private beginCinematic(): void {
    this.state = 'cinematic';
    this.player.body.setVelocity(0, 0);
    this.player.body.setAcceleration(0, 0);
    this.heading.setVisible(false);
    this.briefing.setVisible(false);
    this.objective.setVisible(false);
    this.prompt.setVisible(false);
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.remove('is-visible');
    this.cameras.main.fadeOut(360, 0, 0, 0);
    this.time.delayedCall(380, () => this.runCinematicShot(1));
  }

  private runCinematicShot(shot: 1 | 2 | 3): void {
    this.environment.showCinematicShot(shot);
    if (shot === 1) this.startHum();
    this.cameras.main.fadeIn(300, 0, 0, 0);
    const hold = shot === 3 ? 2100 : 1700;
    this.time.delayedCall(hold, () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(320, () => {
        if (shot < 3) this.runCinematicShot((shot + 1) as 1 | 2 | 3);
        else this.finishCinematic();
      });
    });
  }

  private finishCinematic(): void {
    this.stopHum();
    this.environment.hideCinematic();
    this.state = 'success';
    this.successPanel.setVisible(true).setAlpha(0);
    this.cameras.main.fadeIn(280, 0, 0, 0);
    this.tweens.add({ targets: this.successPanel, alpha: 1, duration: 220 });
    this.time.delayedCall(1400, () => this.showMissionPanel());
  }

  private showMissionPanel(): void {
    if (this.state !== 'success') return;
    this.state = 'complete';
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.remove('is-visible');
    this.successPanel.setVisible(false);
    this.missionPanel.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.missionPanel, alpha: 1, duration: 240 });
  }

  private resetLevel(): void {
    this.state = 'playing';
    this.step = 0;
    this.carriedItem = null;
    this.environment.reset();
    this.carryAccessory.carry(null);
    this.heading.setVisible(true).setAlpha(1);
    this.briefing.setVisible(true).setAlpha(1);
    this.objective.setText('OBJECTIVE: INSTALL SERVER').setVisible(true);
    this.prompt.setVisible(false);
    this.successPanel.setVisible(false);
    this.missionPanel.setVisible(false);
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.add('is-visible');
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.add('is-visible');
  }

  private createHeading(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 600, 68, 0xffffff, 0.95).setStrokeStyle(2, 0x000000);
    const title = this.makeText('LEVEL 3 — LOGICALIS', 20, '#000000').setPosition(0, -12);
    const subtitle = this.makeText('Data Center Technician • 2025–2026', 13, '#000000').setPosition(0, 18);
    panel.add([background, title, subtitle]);
    return panel;
  }

  private createBriefing(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 430, 112, 0xffffff, 0.95).setStrokeStyle(2, 0x000000);
    const text = this.makeText('Objective:\nCommission Rack R12\n\nControls:\nA / D or ← / → Move     E Interact', 14, '#000000').setLineSpacing(4);
    panel.add([background, text]);
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
    const title = this.makeText('RACK R12 COMMISSIONED', 22, '#000000').setPosition(45, -5);
    panel.add([background, check, title]);
    return panel;
  }

  private createMissionPanel(): Phaser.GameObjects.Container {
    const panel = this.add.container(0, 0);
    const background = this.add.rectangle(0, 0, 760, 430, 0xffffff, 0.98).setStrokeStyle(3, 0x000000);
    const mission = this.makeText('MISSION COMPLETE', 25, '#000000').setPosition(0, -180);
    const company = this.makeText('LOGICALIS', 19, '#000000').setPosition(0, -140);
    const role = this.makeText('Data Center Technician', 15, '#000000').setPosition(0, -105);
    const dates = this.makeText('02/2025 – 07/2026', 14, '#000000').setPosition(0, -74);
    const experience = this.makeText(
      '• Staged and deployed data center hardware.\n' +
        '• Performed rack-and-stack installation.\n' +
        '• Routed, dressed, patched, and labeled fiber and copper cabling.\n' +
        '• Supported IDF and colocation buildouts.\n' +
        '• Followed quality, safety, security, and documentation standards.',
      13,
      '#000000',
    ).setAlign('left').setLineSpacing(9).setPosition(0, 12);
    const next = this.makeText('Press ENTER to Continue', 13, '#000000').setPosition(0, 178);
    panel.add([background, mission, company, role, dates, experience, next]);
    return panel;
  }

  private makeText(text: string, size: number, color: string): Phaser.GameObjects.Text {
    return this.add.text(0, 0, text, {
      fontFamily: '"Courier New", Courier, monospace', fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center',
    }).setOrigin(0.5);
  }

  private layout(width: number, height: number, resetPlayer: boolean): void {
    this.physics.world.setBounds(0, 0, width, height);
    this.environment.layout(width, height);
    this.ground.setPosition(width / 2, this.environment.groundY + 1).setSize(width, 2);
    this.ground.displayWidth = width;
    this.ground.displayHeight = 2;
    (this.ground.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    this.heading.setPosition(width / 2, 46).setScale(Math.max(0.46, Math.min(1, (width - 24) / 600)));
    this.briefing.setPosition(width / 2, 142).setScale(Math.max(0.52, Math.min(1, (width - 24) / 430)));
    this.objective.setPosition(14, 92);
    const overlayScale = Math.min(1, (width - 28) / 520);
    this.successPanel.setPosition(width / 2, height / 2).setScale(Math.max(0.52, overlayScale));
    const missionScale = Math.min(1, (width - 28) / 760, (height - 28) / 430);
    this.missionPanel.setPosition(width / 2, height / 2).setScale(Math.max(0.43, missionScale));
    if (resetPlayer) this.player.resetTo(Math.max(55, width * 0.11), this.environment.groundY - 37);
  }

  private playConfirmation(): void {
    const context = this.getAudioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.09);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.1);
  }

  private startHum(): void {
    const context = this.getAudioContext();
    if (!context || this.hum) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 72;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.018, context.currentTime + 0.8);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    this.hum = { oscillator, gain };
  }

  private stopHum(): void {
    if (!this.hum || !this.audioContext) return;
    this.hum.gain.gain.linearRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);
    this.hum.oscillator.stop(this.audioContext.currentTime + 0.26);
    this.hum = null;
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return null;
    this.audioContext = new AudioContextClass();
    void this.audioContext.resume();
    return this.audioContext;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height, false);
  }

  private restartLevel(): void {
    this.scene.restart();
  }

  private continueJourney(): void {
    if (this.state === 'complete') this.scene.start('title');
  }

  private skipToMission(): void {
    if (this.state === 'complete') return;
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.state = 'complete';
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.remove('is-visible');
    this.stopHum();
    this.environment.hideCinematic();
    this.player.body.setVelocity(0, 0);
    this.player.body.setAcceleration(0, 0);
    this.heading.setVisible(false);
    this.briefing.setVisible(false);
    this.objective.setVisible(false);
    this.prompt.setVisible(false);
    this.successPanel.setVisible(false);
    this.missionPanel.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: this.missionPanel, alpha: 1, duration: 240 });
  }

  private shutdown(): void {
    this.stopHum();
    void this.audioContext?.close();
    this.audioContext = null;
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.remove('is-visible');
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.game.events.off('reset-player', this.restartLevel, this);
    this.game.events.off('skip-level', this.skipToMission, this);
    this.input.keyboard?.off('keydown-E', this.interactFromKeyboard, this);
    this.input.keyboard?.off('keydown-ENTER', this.continueJourney, this);
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
