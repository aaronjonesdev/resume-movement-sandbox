import Phaser from 'phaser';

export type ObstacleKind = 'cone' | 'barrel';

export type CourseObstacleDefinition = {
  id: string;
  kind: ObstacleKind;
  lane: number;
  arrival: number;
};

export type CourseObstacle = CourseObstacleDefinition & {
  hit: boolean;
  passed: boolean;
  view: Phaser.GameObjects.Container;
};

export const COURSE_DURATION = 27.5;
export const FINISH_CROSSING_DELAY = 0.45;
export const OBSTACLE_LEAD_TIME = 5;

export const COURSE_SEQUENCE: CourseObstacleDefinition[] = [
  { id: 'cone-left', kind: 'cone', lane: -0.48, arrival: 6 },
  { id: 'cone-right', kind: 'cone', lane: 0.46, arrival: 9.5 },
  { id: 'barrel-center', kind: 'barrel', lane: 0, arrival: 12.6 },
  { id: 'pair-left', kind: 'cone', lane: -0.62, arrival: 15.4 },
  { id: 'pair-center', kind: 'barrel', lane: 0.12, arrival: 15.4 },
  { id: 'cone-late-right', kind: 'cone', lane: 0.5, arrival: 18 },
  { id: 'barrel-late-left', kind: 'barrel', lane: -0.42, arrival: 20.2 },
  { id: 'ending-right', kind: 'cone', lane: 0.52, arrival: 22.1 },
  { id: 'ending-left', kind: 'barrel', lane: -0.46, arrival: 23.8 },
  { id: 'final-center', kind: 'cone', lane: 0.08, arrival: 25.3 },
];

const CONE_ORANGE = 0xe87518;
const BARREL_RED = 0xb52b27;

export class DrivingEnvironment {
  private readonly roadGraphics: Phaser.GameObjects.Graphics;
  private readonly finishGraphics: Phaser.GameObjects.Graphics;
  private readonly cockpitGraphics: Phaser.GameObjects.Graphics;
  readonly obstacles: CourseObstacle[];

  private width = 0;
  private height = 0;
  private horizonY = 0;
  private vehicleY = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.roadGraphics = scene.add.graphics();
    this.finishGraphics = scene.add.graphics().setDepth(3);
    this.cockpitGraphics = scene.add.graphics().setDepth(5);
    this.obstacles = COURSE_SEQUENCE.map((definition) => ({
      ...definition,
      hit: false,
      passed: false,
      view: this.createObstacleView(definition.kind),
    }));
  }

  layout(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.horizonY = Math.max(130, height * 0.27);
    this.vehicleY = height * 0.88;
    this.drawRoad();
  }

  update(courseTime: number, vehicleX: number): void {
    this.obstacles.forEach((obstacle) => this.updateObstacle(obstacle, courseTime));
    this.drawFinish(courseTime);
    this.drawCockpit(vehicleX);
  }

  reset(): void {
    this.obstacles.forEach((obstacle) => {
      obstacle.hit = false;
      obstacle.passed = false;
      obstacle.view.setVisible(false).setAlpha(1);
    });
    this.finishGraphics.clear();
  }

  nextGuidanceTarget(courseTime: number): number {
    const next = this.obstacles.find(
      (obstacle) => !obstacle.hit && !obstacle.passed && obstacle.arrival - courseTime > 0,
    );
    if (!next || next.arrival - courseTime > 2.3) return 0;
    return next.lane * 0.72;
  }

  checkCollision(courseTime: number, vehicleX: number): CourseObstacle | undefined {
    return this.obstacles.find((obstacle) => {
      if (obstacle.hit || obstacle.passed) return false;
      const remaining = obstacle.arrival - courseTime;
      if (remaining < -0.12) {
        obstacle.passed = true;
        obstacle.view.setVisible(false);
        return false;
      }
      if (remaining > 0.14) return false;
      const threshold = obstacle.kind === 'barrel' ? 0.24 : 0.21;
      return Math.abs(vehicleX - obstacle.lane) < threshold;
    });
  }

  registerHit(obstacle: CourseObstacle): void {
    obstacle.hit = true;
    obstacle.view.setVisible(false);
  }

  private drawRoad(): void {
    const g = this.roadGraphics;
    const center = this.width / 2;
    const bottomHalf = this.bottomRoadHalf;
    const horizonHalf = Math.min(58, this.width * 0.12);

    g.clear();
    g.fillStyle(0xf7f7f7, 1);
    g.fillRect(0, 0, this.width, this.height);
    g.fillStyle(0xd8d8d8, 1);
    g.fillTriangle(center - horizonHalf, this.horizonY, center + horizonHalf, this.horizonY, center + bottomHalf, this.height);
    g.fillTriangle(center - horizonHalf, this.horizonY, center - bottomHalf, this.height, center + bottomHalf, this.height);
    g.lineStyle(3, 0x000000, 1);
    g.lineBetween(center - horizonHalf, this.horizonY, center - bottomHalf, this.height);
    g.lineBetween(center + horizonHalf, this.horizonY, center + bottomHalf, this.height);
    g.lineStyle(2, 0xffffff, 1);
    g.lineBetween(center, this.horizonY, center, this.height);

    for (let y = this.horizonY + 35; y < this.height; y += 92) {
      const perspective = (y - this.horizonY) / (this.height - this.horizonY);
      const dash = 8 + perspective * 26;
      g.lineBetween(center, y, center, Math.min(this.height, y + dash));
    }

    g.lineStyle(2, 0x000000, 1);
    g.lineBetween(0, this.horizonY, this.width, this.horizonY);
  }

  private updateObstacle(obstacle: CourseObstacle, courseTime: number): void {
    if (obstacle.hit || obstacle.passed) {
      obstacle.view.setVisible(false);
      return;
    }

    const remaining = obstacle.arrival - courseTime;
    if (remaining > OBSTACLE_LEAD_TIME || remaining < -0.15) {
      if (remaining < -0.15) obstacle.passed = true;
      obstacle.view.setVisible(false);
      return;
    }

    const depth = Phaser.Math.Clamp(1 - remaining / OBSTACLE_LEAD_TIME, 0, 1);
    const easedDepth = depth * depth;
    const y = Phaser.Math.Linear(this.horizonY + 8, this.vehicleY, easedDepth);
    const roadHalf = Phaser.Math.Linear(48, this.bottomRoadHalf * 0.88, easedDepth);
    const x = this.width / 2 + obstacle.lane * roadHalf;
    const scale = Phaser.Math.Linear(0.18, 1.22, easedDepth);

    obstacle.view.setVisible(true).setPosition(x, y).setScale(scale).setDepth(2 + depth);
  }

  private drawFinish(courseTime: number): void {
    const remaining = COURSE_DURATION - courseTime;
    const g = this.finishGraphics;
    g.clear();
    if (remaining > OBSTACLE_LEAD_TIME || remaining < -FINISH_CROSSING_DELAY) return;

    const approachDepth = Phaser.Math.Clamp(1 - remaining / OBSTACLE_LEAD_TIME, 0, 1);
    const easedDepth = approachDepth * approachDepth;
    const crossingDepth = Phaser.Math.Clamp(-remaining / FINISH_CROSSING_DELAY, 0, 1);
    const y = remaining >= 0
      ? Phaser.Math.Linear(this.horizonY + 6, this.vehicleY, easedDepth)
      : Phaser.Math.Linear(this.vehicleY, this.height + 24, crossingDepth);
    const halfWidth = remaining >= 0
      ? Phaser.Math.Linear(48, this.bottomRoadHalf * 0.88, easedDepth)
      : Phaser.Math.Linear(this.bottomRoadHalf * 0.88, this.bottomRoadHalf, crossingDepth);
    const tileWidth = (halfWidth * 2) / 12;
    const tileHeight = remaining >= 0
      ? Phaser.Math.Linear(3, 18, easedDepth)
      : Phaser.Math.Linear(18, 24, crossingDepth);

    for (let i = 0; i < 12; i += 1) {
      g.fillStyle(i % 2 === 0 ? 0x000000 : 0xffffff, 1);
      g.fillRect(this.width / 2 - halfWidth + i * tileWidth, y, tileWidth + 1, tileHeight);
    }
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(this.width / 2 - halfWidth, y, halfWidth * 2, tileHeight);
  }

  private drawCockpit(vehicleX: number): void {
    const g = this.cockpitGraphics;
    const centerX = this.width / 2 + vehicleX * this.bottomRoadHalf * 0.72;
    const baseY = this.height;
    const hoodHalf = Phaser.Math.Clamp(this.width * 0.18, 116, 224);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.lineStyle(4, 0x000000, 1);
    g.beginPath();
    g.moveTo(centerX - hoodHalf, baseY);
    g.lineTo(centerX - hoodHalf * 0.72, baseY - 54);
    g.lineTo(centerX + hoodHalf * 0.72, baseY - 54);
    g.lineTo(centerX + hoodHalf, baseY);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(2, 0x000000, 1);
    g.lineBetween(0, baseY - 10, centerX - hoodHalf, baseY - 10);
    g.lineBetween(centerX + hoodHalf, baseY - 10, this.width, baseY - 10);
    g.strokeCircle(centerX, baseY - 22, 20);
    g.lineBetween(centerX - 17, baseY - 22, centerX + 17, baseY - 22);
    g.lineBetween(centerX, baseY - 22, centerX, baseY - 4);
  }

  private get bottomRoadHalf(): number {
    return Math.max(80, this.width / 2 - 10);
  }

  private createObstacleView(kind: ObstacleKind): Phaser.GameObjects.Container {
    const graphics = this.scene.add.graphics();

    if (kind === 'cone') {
      graphics.fillStyle(CONE_ORANGE, 1);
      graphics.fillTriangle(0, -28, -17, 18, 17, 18);
      graphics.lineStyle(2, 0x000000, 1);
      graphics.beginPath();
      graphics.moveTo(0, -28);
      graphics.lineTo(-17, 18);
      graphics.lineTo(17, 18);
      graphics.closePath();
      graphics.strokePath();
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(-23, 18, 46, 7);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(-10, 2, 20, 5);
    } else {
      graphics.fillStyle(BARREL_RED, 1);
      graphics.fillRect(-22, -31, 44, 58);
      graphics.lineStyle(3, 0x000000, 1);
      graphics.strokeRect(-22, -31, 44, 58);
      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(-20, -13, 40, 9);
      graphics.fillRect(-20, 8, 40, 9);
      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(-25, -34, 50, 5);
      graphics.fillRect(-25, 27, 50, 5);
    }

    return this.scene.add.container(0, 0, [graphics]).setVisible(false);
  }
}
