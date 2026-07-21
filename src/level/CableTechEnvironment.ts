import Phaser from 'phaser';

const POLE_BROWN = 0x8b5a2b;
const LADDER_ORANGE = 0xe87518;

export class CableTechEnvironment {
  private readonly worldGraphics: Phaser.GameObjects.Graphics;
  private readonly cableGraphics: Phaser.GameObjects.Graphics;
  private readonly checkmark: Phaser.GameObjects.Graphics;
  private readonly spark: Phaser.GameObjects.Graphics;
  private cableConnection = { progress: 0 };

  poleX = 0;
  groundY = 0;
  poleTopY = 0;
  ladderPlaced = false;
  cableConnected = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.worldGraphics = scene.add.graphics();
    this.cableGraphics = scene.add.graphics();
    this.checkmark = scene.add.graphics().setVisible(false);
    this.spark = scene.add.graphics().setVisible(false);
  }

  layout(width: number, height: number): void {
    this.groundY = Math.max(420, height - 54);
    this.poleX = Phaser.Math.Clamp(width * 0.72, 220, width - 64);
    this.poleTopY = this.groundY - Math.min(350, this.groundY - 90);
    this.drawWorld(width);
    this.drawCables();
    if (this.cableConnected) this.drawCheckmark();
  }

  placeLadder(): void {
    this.ladderPlaced = true;
    this.drawWorld(this.scene.scale.width);
  }

  isNearPlacement(x: number, y: number): boolean {
    return !this.ladderPlaced && Math.abs(x - this.poleX) < 105 && y > this.groundY - 100;
  }

  isNearLadder(x: number, y: number): boolean {
    if (!this.ladderPlaced) return false;
    return Math.abs(x - this.ladderXAt(y)) < 38 && y >= this.climbTopY - 20 && y <= this.climbBottomY + 25;
  }

  isAtLadderBase(x: number, y: number): boolean {
    return (
      this.ladderPlaced &&
      Math.abs(x - this.ladderXAt(this.climbBottomY)) < 58 &&
      y >= this.climbBottomY - 36
    );
  }

  isNearCable(x: number, y: number): boolean {
    return this.ladderPlaced && !this.cableConnected && Math.abs(x - (this.poleX - 30)) < 75 && y < this.poleTopY + 105;
  }

  ladderXAt(y: number): number {
    const progress = Phaser.Math.Clamp(
      (this.climbBottomY - y) / (this.climbBottomY - this.climbTopY),
      0,
      1,
    );
    return Phaser.Math.Linear(this.poleX - 72, this.poleX - 20, progress);
  }

  get climbBottomY(): number {
    return this.groundY - 38;
  }

  get climbTopY(): number {
    return this.poleTopY + 62;
  }

  connectCable(onComplete: () => void): void {
    if (this.cableConnected) return;

    this.cableConnected = true;
    this.scene.tweens.add({
      targets: this.cableConnection,
      progress: 1,
      duration: 260,
      ease: 'Back.out',
      onUpdate: () => this.drawCables(),
      onComplete: () => {
        this.flashSpark();
        this.drawCheckmark();
        onComplete();
      },
    });
  }

  private drawWorld(width: number): void {
    const g = this.worldGraphics;
    g.clear();

    g.lineStyle(3, 0x000000, 1);
    g.lineBetween(0, this.groundY, width, this.groundY);

    g.fillStyle(POLE_BROWN, 1);
    g.fillRect(this.poleX - 9, this.poleTopY, 18, this.groundY - this.poleTopY);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(this.poleX - 9, this.poleTopY, 18, this.groundY - this.poleTopY);
    g.lineBetween(this.poleX - 54, this.poleTopY + 30, this.poleX + 54, this.poleTopY + 30);

    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(this.poleX - 35, this.poleTopY + 25, 10, 10);
    g.fillStyle(0x000000, 1);
    g.fillRect(this.poleX + 25, this.poleTopY + 25, 10, 10);

    if (this.ladderPlaced) this.drawPlacedLadder(g);
  }

  private drawPlacedLadder(g: Phaser.GameObjects.Graphics): void {
    const bottomX = this.poleX - 78;
    const topX = this.poleX - 25;
    const bottomY = this.groundY;
    const topY = this.poleTopY + 48;
    const dx = bottomX - topX;
    const dy = bottomY - topY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const offsetX = (-dy / length) * 6;
    const offsetY = (dx / length) * 6;

    g.lineStyle(4, LADDER_ORANGE, 1);
    g.lineBetween(bottomX + offsetX, bottomY + offsetY, topX + offsetX, topY + offsetY);
    g.lineBetween(bottomX - offsetX, bottomY - offsetY, topX - offsetX, topY - offsetY);

    for (let step = 0.1; step < 0.95; step += 0.105) {
      const x = Phaser.Math.Linear(bottomX, topX, step);
      const y = Phaser.Math.Linear(bottomY, topY, step);
      g.lineBetween(x + offsetX, y + offsetY, x - offsetX, y - offsetY);
    }
  }

  private drawCables(): void {
    const g = this.cableGraphics;
    const connectorY = this.poleTopY + 30;
    const leftConnectorX = this.poleX - 30;
    const rightConnectorX = this.poleX + 30;
    const looseEndX = Phaser.Math.Linear(leftConnectorX - 12, leftConnectorX, this.cableConnection.progress);
    const looseEndY = Phaser.Math.Linear(connectorY + 14, connectorY, this.cableConnection.progress);
    const leftCableEndX = leftConnectorX - 30;

    g.clear();
    g.lineStyle(3, 0x000000, 1);
    g.lineBetween(0, connectorY, leftCableEndX, connectorY);
    g.lineBetween(leftCableEndX, connectorY, looseEndX, looseEndY);
    g.lineBetween(rightConnectorX, connectorY, this.scene.scale.width, connectorY);

    g.fillStyle(0x000000, 1);
    g.fillRect(looseEndX - 4, looseEndY - 4, 8, 8);
  }

  private drawCheckmark(): void {
    this.checkmark.clear();
    this.checkmark.lineStyle(4, 0x238823, 1);
    this.checkmark.beginPath();
    this.checkmark.moveTo(this.poleX - 41, this.poleTopY + 10);
    this.checkmark.lineTo(this.poleX - 34, this.poleTopY + 17);
    this.checkmark.lineTo(this.poleX - 21, this.poleTopY + 2);
    this.checkmark.strokePath();
    this.checkmark.setVisible(true);
  }

  private flashSpark(): void {
    const x = this.poleX - 30;
    const y = this.poleTopY + 30;

    this.spark.clear();
    this.spark.lineStyle(2, 0x000000, 1);
    this.spark.lineBetween(x - 9, y - 9, x - 4, y - 4);
    this.spark.lineBetween(x + 4, y - 5, x + 9, y - 10);
    this.spark.lineBetween(x - 9, y + 8, x - 4, y + 4);
    this.spark.setVisible(true);
    this.scene.time.delayedCall(100, () => this.spark.setVisible(false));
  }
}
