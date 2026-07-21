import Phaser from 'phaser';
import type { PlayerIntent } from '../input/PlayerControls';
import type { PlayerAccessory, PlayerPose } from './PlayerAccessory';

const BODY_WIDTH = 32;
const BODY_HEIGHT = 74;
const MOVE_SPEED = 260;
const GROUND_ACCELERATION = 2100;
const AIR_ACCELERATION = 1200;
const GROUND_DRAG = 2400;
const JUMP_SPEED = 600;

export class StickFigurePlayer extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly figure: Phaser.GameObjects.Graphics;
  private readonly accessories: PlayerAccessory[] = [];
  private facing: -1 | 1 = 1;
  private walkCycle = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.figure = scene.add.graphics();
    this.add(this.figure);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(BODY_WIDTH, BODY_HEIGHT);
    this.setDepth(1);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(MOVE_SPEED, 900);
    this.drawFigure(0, false);
  }

  addAccessory(accessory: PlayerAccessory): this {
    this.accessories.push(accessory);
    this.add(accessory.displayObject);
    return this;
  }

  updateFromIntent(intent: PlayerIntent, deltaMs: number): void {
    const grounded = this.body.blocked.down || this.body.touching.down;

    if (intent.direction !== 0) {
      this.facing = intent.direction;
      this.body.setAccelerationX(intent.direction * (grounded ? GROUND_ACCELERATION : AIR_ACCELERATION));
      this.body.setDragX(0);
    } else {
      this.body.setAccelerationX(0);
      this.body.setDragX(grounded ? GROUND_DRAG : 120);
    }

    if (intent.jumpPressed && grounded) {
      this.body.setVelocityY(-JUMP_SPEED);
    }

    const walking = grounded && Math.abs(this.body.velocity.x) > 12;
    if (walking) {
      this.walkCycle += (deltaMs / 1000) * (8 + Math.abs(this.body.velocity.x) / 45);
    } else if (grounded) {
      this.walkCycle = Phaser.Math.Linear(this.walkCycle, 0, Math.min(1, deltaMs / 90));
    }

    const pose: PlayerPose = { facing: this.facing, walkCycle: this.walkCycle, grounded };
    this.drawFigure(walking ? Math.sin(this.walkCycle) : 0, !grounded);
    this.accessories.forEach((accessory) => accessory.updatePose(pose));
  }

  resetTo(x: number, y: number): void {
    this.setPosition(x, y);
    this.body.reset(x, y);
    this.body.setAcceleration(0, 0);
    this.walkCycle = 0;
    this.drawFigure(0, false);
  }

  private drawFigure(stride: number, airborne: boolean): void {
    const g = this.figure;
    const direction = this.facing;
    const hipY = 12;
    const shoulderY = -13;
    const limbSwing = airborne ? 6 : stride * 9;
    const armSwing = airborne ? -5 : stride * 8;

    g.clear();
    g.lineStyle(3, 0x000000, 1);

    // Head and a short nose make the facing direction legible.
    g.strokeCircle(0, -27, 9);
    g.beginPath();
    g.moveTo(direction * 8, -28);
    g.lineTo(direction * 12, -26);
    g.strokePath();

    // Torso.
    g.beginPath();
    g.moveTo(0, -18);
    g.lineTo(0, hipY);
    g.strokePath();

    // Arms swing opposite the legs.
    g.beginPath();
    g.moveTo(0, shoulderY);
    g.lineTo(direction * (10 + armSwing), 0);
    g.lineTo(direction * (14 + armSwing), 11);
    g.moveTo(0, shoulderY);
    g.lineTo(direction * (-10 - armSwing), -1);
    g.lineTo(direction * (-14 - armSwing), 10);
    g.strokePath();

    // Legs use two segments each for a simple, readable gait.
    g.beginPath();
    g.moveTo(0, hipY);
    g.lineTo(direction * (7 + limbSwing), 27);
    g.lineTo(direction * (9 + limbSwing), 37);
    g.moveTo(0, hipY);
    g.lineTo(direction * (-7 - limbSwing), 27);
    g.lineTo(direction * (-9 - limbSwing), 37);
    g.strokePath();
  }
}
