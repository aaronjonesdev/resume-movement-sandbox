import Phaser from 'phaser';
import type { TechnicianItem } from '../player/TechnicianCarryAccessory';

type TaskItem = {
  container: Phaser.GameObjects.Container;
  marker: Phaser.GameObjects.Rectangle;
};

const GREEN = 0x238823;
const YELLOW = 0xe5b900;
const BLUE = 0x235f9e;

export class DataCenterEnvironment {
  private readonly world: Phaser.GameObjects.Graphics;
  private readonly cables: Phaser.GameObjects.Graphics;
  private readonly cinematic: Phaser.GameObjects.Graphics;
  private readonly installedServer: Phaser.GameObjects.Container;
  private readonly items: Record<TechnicianItem, TaskItem>;
  private readonly rackLeds: Phaser.GameObjects.Rectangle[] = [];
  private readonly fanGraphics: Phaser.GameObjects.Graphics;
  private readonly rackLabel: Phaser.GameObjects.Text;
  private activeItem: TechnicianItem = 'server';
  private carriedItem: TechnicianItem | null = null;
  private fanAngle = 0;
  private ledElapsed = 0;
  private poweredLedCount = 0;
  private fiberConnected = false;
  private copperConnected = false;
  private serverInstalled = false;
  private cinematicShot: 0 | 1 | 2 | 3 = 0;
  private cinematicElapsed = 0;

  width = 0;
  height = 0;
  groundY = 0;
  cartX = 0;
  rackX = 0;

  private get destinationRackX(): number {
    return this.rackX > this.width / 2 ? this.rackX - 165 : this.rackX + 165;
  }

  private get trayY(): number {
    return Math.max(112, this.groundY - 330);
  }

  constructor(private readonly scene: Phaser.Scene) {
    this.world = scene.add.graphics();
    this.cables = scene.add.graphics().setDepth(2);
    this.cinematic = scene.add.graphics().setDepth(3);
    this.fanGraphics = scene.add.graphics().setDepth(4);
    this.rackLabel = scene.add.text(0, 0, 'R12', {
      fontFamily: '"Courier New", Courier, monospace', fontSize: '14px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setDepth(2);
    this.installedServer = this.createServer().setVisible(false).setDepth(3);
    this.items = {
      server: this.createStagedItem(this.createServer()),
      fiber: this.createStagedItem(this.createFiber()),
      copper: this.createStagedItem(this.createCopper()),
    };
    for (let i = 0; i < 8; i += 1) {
      this.rackLeds.push(scene.add.rectangle(0, 0, 5, 5, GREEN).setVisible(false).setDepth(4));
    }
  }

  layout(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.groundY = Math.max(430, height - 54);
    this.cartX = Phaser.Math.Clamp(width * 0.2, 110, width - 350);
    this.rackX = Phaser.Math.Clamp(width * 0.76, 390, width - 92);
    this.drawWorld();
    this.layoutItems();
    this.drawCables();
    this.layoutLeds();
    this.drawFans();
  }

  update(deltaMs: number): void {
    this.ledElapsed += deltaMs;
    if (this.poweredLedCount > 0) {
      this.fanAngle += deltaMs * 0.012;
      if (this.cinematicShot === 0) {
        this.drawFans();
        this.rackLeds.forEach((led, index) => {
          if (index >= this.poweredLedCount) return;
          led.setVisible(Math.floor(this.ledElapsed / (170 + index * 31)) % 2 === index % 2);
        });
      }
    }
    if (this.cinematicShot !== 0) {
      this.cinematicElapsed += deltaMs;
      this.drawCinematicFrame();
    }
  }

  reset(): void {
    this.activeItem = 'server';
    this.carriedItem = null;
    this.poweredLedCount = 0;
    this.fiberConnected = false;
    this.copperConnected = false;
    this.serverInstalled = false;
    this.installedServer.setVisible(false);
    this.rackLeds.forEach((led) => led.setVisible(false));
    (Object.keys(this.items) as TechnicianItem[]).forEach((item) => {
      this.items[item].container.setVisible(true).setAlpha(item === 'server' ? 1 : 0.28);
      this.items[item].marker.setVisible(item === 'server');
    });
    this.drawCables();
    this.drawFans();
  }

  isNearActiveItem(x: number, y: number): boolean {
    const itemX = this.itemX(this.activeItem);
    return !this.carriedItem && this.items[this.activeItem].container.visible && Math.abs(x - itemX) < 58 && y > this.groundY - 110;
  }

  isNearRack(x: number, y: number): boolean {
    return this.carriedItem !== null && Math.abs(x - this.rackX) < 86 && y > this.groundY - 115;
  }

  pickupActiveItem(): TechnicianItem {
    const item = this.activeItem;
    this.carriedItem = item;
    this.items[item].container.setVisible(false);
    this.items[item].marker.setVisible(false);
    return item;
  }

  installServer(onComplete: () => void): void {
    this.carriedItem = null;
    this.serverInstalled = true;
    this.installedServer.setVisible(true).setPosition(this.rackX + 82, this.groundY - 180).setAlpha(0.45);
    this.scene.tweens.add({
      targets: this.installedServer,
      x: this.rackX,
      alpha: 1,
      duration: 520,
      ease: 'Sine.out',
      onComplete: () => {
        this.poweredLedCount = 1;
        onComplete();
      },
    });
  }

  connectFiber(onComplete: () => void): void {
    this.carriedItem = null;
    const route = { progress: 0 };
    this.scene.tweens.add({
      targets: route,
      progress: 1,
      duration: 650,
      ease: 'Sine.inOut',
      onUpdate: () => this.drawCableRoute('fiber', route.progress),
      onComplete: () => {
        this.fiberConnected = true;
        this.poweredLedCount = 3;
        this.drawCables();
        onComplete();
      },
    });
  }

  connectCopper(onComplete: () => void): void {
    this.carriedItem = null;
    const cable = { progress: 0 };
    this.scene.tweens.add({
      targets: cable,
      progress: 1,
      duration: 440,
      ease: 'Sine.out',
      onUpdate: () => this.drawCopper(cable.progress),
      onComplete: () => {
        this.copperConnected = true;
        this.poweredLedCount = 5;
        this.drawCables();
        onComplete();
      },
    });
  }

  activate(item: TechnicianItem): void {
    this.activeItem = item;
    (Object.keys(this.items) as TechnicianItem[]).forEach((key) => {
      const enabled = key === item;
      this.items[key].container.setAlpha(enabled ? 1 : 0.28);
      this.items[key].marker.setVisible(enabled && this.items[key].container.visible);
    });
  }

  showCinematicShot(shot: 1 | 2 | 3): void {
    this.cinematicShot = shot;
    this.cinematicElapsed = 0;
    this.poweredLedCount = shot === 1 ? 5 : 8;
    this.rackLabel.setVisible(false);
    this.installedServer.setVisible(false);
    this.rackLeds.forEach((led) => led.setVisible(false));
    this.fanGraphics.setVisible(false);
    this.cinematic.setVisible(true);
    this.drawCinematicFrame();
  }

  hideCinematic(): void {
    this.cinematicShot = 0;
    this.cinematic.setVisible(false);
    this.rackLabel.setVisible(true);
    this.installedServer.setVisible(this.serverInstalled);
    this.fanGraphics.setVisible(true);
  }

  private createStagedItem(container: Phaser.GameObjects.Container): TaskItem {
    const marker = this.scene.add.rectangle(0, 0, 76, 52, 0xffffff, 0).setStrokeStyle(4, 0xb52b27).setDepth(0);
    this.scene.tweens.add({
      targets: marker,
      alpha: 0.32,
      duration: 480,
      ease: 'Stepped',
      easeParams: [1],
      yoyo: true,
      repeat: -1,
    });
    return { container: container.setDepth(0), marker };
  }

  private createServer(): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.fillStyle(0xd5d5d5, 1);
    g.fillRect(-30, -13, 60, 26);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(-30, -13, 60, 26);
    g.fillStyle(0x000000, 1);
    g.fillCircle(21, 0, 3);
    return this.scene.add.container(0, 0, [g]);
  }

  private createFiber(): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.lineStyle(5, YELLOW, 1);
    g.strokeCircle(0, 0, 17);
    g.strokeCircle(0, 0, 9);
    return this.scene.add.container(0, 0, [g]);
  }

  private createCopper(): Phaser.GameObjects.Container {
    const g = this.scene.add.graphics();
    g.lineStyle(5, BLUE, 1);
    g.strokeCircle(0, 0, 17);
    g.strokeCircle(0, 0, 9);
    return this.scene.add.container(0, 0, [g]);
  }

  private itemX(item: TechnicianItem): number {
    return this.cartX + (item === 'server' ? -46 : item === 'fiber' ? 5 : 52);
  }

  private layoutItems(): void {
    const y = this.groundY - 60;
    (Object.keys(this.items) as TechnicianItem[]).forEach((item) => {
      const x = this.itemX(item);
      this.items[item].container.setPosition(x, y);
      this.items[item].marker.setPosition(x, y);
    });
    if (this.installedServer.visible) this.installedServer.setPosition(this.rackX, this.groundY - 180);
  }

  private layoutLeds(): void {
    this.rackLeds.forEach((led, index) => led.setPosition(this.rackX + 31, this.groundY - 211 + index * 18));
  }

  private drawWorld(): void {
    const g = this.world;
    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, this.width, this.height);
    g.lineStyle(2, 0x000000, 1);
    g.lineBetween(0, this.groundY, this.width, this.groundY);

    for (let x = 45; x < this.width; x += 150) {
      if (Math.abs(x - this.rackX) < 95 || Math.abs(x - this.destinationRackX) < 95) continue;
      this.drawRack(g, x, this.groundY - 220, 104, 220, 0xeeeeee);
    }
    this.drawRack(g, this.destinationRackX, this.groundY - 220, 104, 220, 0xeeeeee);
    this.drawRack(g, this.rackX, this.groundY - 245, 118, 245, 0xffffff);
    g.lineStyle(4, GREEN, 1);
    g.strokeRect(this.rackX - 63, this.groundY - 250, 126, 250);
    g.fillStyle(0x000000, 1);
    g.fillRect(this.rackX - 39, this.groundY - 275, 78, 25);
    this.rackLabel.setPosition(this.rackX, this.groundY - 262);

    this.drawOverheadTray(g, 24, this.width - 24, this.trayY);
    this.drawPatchPanel(g, this.rackX, this.groundY - 142, 70);
    this.drawPatchPanel(g, this.destinationRackX, this.groundY - 142, 70);

    g.fillStyle(0xf1f1f1, 1);
    g.fillRect(this.cartX - 82, this.groundY - 42, 164, 10);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(this.cartX - 82, this.groundY - 42, 164, 10);
    g.lineBetween(this.cartX - 67, this.groundY - 32, this.cartX - 67, this.groundY - 4);
    g.lineBetween(this.cartX + 67, this.groundY - 32, this.cartX + 67, this.groundY - 4);
    g.strokeCircle(this.cartX - 67, this.groundY, 6);
    g.strokeCircle(this.cartX + 67, this.groundY, 6);
  }

  private drawRack(g: Phaser.GameObjects.Graphics, centerX: number, topY: number, width: number, height: number, fill: number): void {
    g.fillStyle(fill, 1);
    g.fillRect(centerX - width / 2, topY, width, height);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(centerX - width / 2, topY, width, height);
    for (let y = topY + 20; y < topY + height - 8; y += 25) g.lineBetween(centerX - width / 2 + 8, y, centerX + width / 2 - 8, y);
  }

  private drawCables(): void {
    this.cables.clear();
    if (this.fiberConnected) this.drawCableRoute('fiber', 1);
    if (this.copperConnected) this.drawCopper(1);
  }

  private drawCableRoute(_kind: 'fiber', progress: number): void {
    const g = this.cables;
    if (!this.copperConnected) g.clear();
    const startX = this.rackX - 22;
    const startY = this.groundY - 142;
    const endX = this.destinationRackX - 20;
    const points = [
      { x: startX, y: startY },
      { x: startX, y: this.trayY - 5 },
      { x: endX, y: this.trayY - 5 },
      { x: endX, y: this.groundY - 142 },
    ];
    this.drawPartialPath(g, points, progress, YELLOW);
    if (progress >= 1) this.drawCableConnector(g, endX, this.groundY - 142, YELLOW);
  }

  private drawCopper(progress: number): void {
    const g = this.cables;
    g.clear();
    if (this.fiberConnected) this.drawCableRoute('fiber', 1);
    const startX = this.rackX + 20;
    const endX = this.destinationRackX + 20;
    const points = [
      { x: startX, y: this.groundY - 132 },
      { x: startX, y: this.trayY + 5 },
      { x: endX, y: this.trayY + 5 },
      { x: endX, y: this.groundY - 132 },
    ];
    this.drawPartialPath(g, points, progress, BLUE);
    if (progress >= 1) this.drawCableConnector(g, endX, this.groundY - 132, BLUE);
  }

  private drawPartialPath(g: Phaser.GameObjects.Graphics, points: Array<{ x: number; y: number }>, progress: number, color: number): void {
    const segments = points.length - 1;
    const amount = Phaser.Math.Clamp(progress, 0, 1) * segments;
    g.lineStyle(4, color, 1);
    for (let i = 0; i < segments; i += 1) {
      const local = Phaser.Math.Clamp(amount - i, 0, 1);
      if (local <= 0) break;
      g.lineBetween(points[i].x, points[i].y, Phaser.Math.Linear(points[i].x, points[i + 1].x, local), Phaser.Math.Linear(points[i].y, points[i + 1].y, local));
    }
  }

  private drawFans(): void {
    const g = this.fanGraphics;
    g.clear();
    if (!this.installedServer.visible) return;
    g.lineStyle(2, 0x000000, 1);
    [-13, 9].forEach((offset) => {
      const x = this.rackX + offset;
      const y = this.groundY - 180;
      g.strokeCircle(x, y, 7);
      g.lineBetween(x, y, x + Math.cos(this.fanAngle) * 6, y + Math.sin(this.fanAngle) * 6);
      g.lineBetween(x, y, x - Math.cos(this.fanAngle) * 6, y - Math.sin(this.fanAngle) * 6);
    });
  }

  private drawOverheadTray(g: Phaser.GameObjects.Graphics, startX: number, endX: number, y: number): void {
    g.lineStyle(2, 0x000000, 1);
    g.lineBetween(startX, y - 12, endX, y - 12);
    g.lineBetween(startX, y + 12, endX, y + 12);
    for (let x = startX + 12; x < endX; x += 34) g.lineBetween(x, y - 12, x, y + 12);
  }

  private drawPatchPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, width: number): void {
    g.fillStyle(0xffffff, 1);
    g.fillRect(x - width / 2, y - 12, width, 24);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(x - width / 2, y - 12, width, 24);
    g.fillStyle(0x000000, 1);
    for (let port = -2; port <= 2; port += 1) g.fillRect(x + port * 11 - 2, y - 2, 4, 4);
  }

  private drawCableConnector(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    g.fillStyle(color, 1);
    g.fillRect(x - 5, y - 4, 10, 8);
    g.lineStyle(1, 0x000000, 1);
    g.strokeRect(x - 5, y - 4, 10, 8);
  }

  private drawRackCloseup(): void {
    const g = this.cinematic;
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, this.width, this.height);
    const center = this.width / 2;
    const rackWidth = Math.min(380, this.width * 0.58);
    const rackTop = 88;
    const rackHeight = this.height - rackTop - 38;
    this.drawOverheadTray(g, center - rackWidth * 0.72, center + rackWidth * 0.72, 54);
    this.drawRack(g, center, rackTop, rackWidth, rackHeight, 0xe9e9e9);
    this.drawEquipmentUnit(g, center, rackTop + 126, rackWidth - 44, 64, 3, true);
    this.drawEquipmentUnit(g, center, rackTop + 208, rackWidth - 44, 38, 5, false);
    this.drawEquipmentUnit(g, center, rackTop + 270, rackWidth - 44, 38, 2, false);
    this.drawCinematicCable(g, center - 44, rackTop + 208, center - 130, 54, YELLOW);
    this.drawCinematicCable(g, center + 44, rackTop + 208, center + 130, 54, BLUE);
  }

  private drawRackMedium(): void {
    const g = this.cinematic;
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, this.width, this.height);
    const center = this.width / 2;
    const rackWidth = Math.min(300, this.width * 0.44);
    const rackTop = 86;
    const rackHeight = this.height - rackTop - 48;
    this.drawOverheadTray(g, center - rackWidth, center + rackWidth, 52);
    this.drawRack(g, center, rackTop, rackWidth, rackHeight, 0xe9e9e9);
    const activeRows = Math.max(1, Math.floor(this.cinematicElapsed / 230) + 1);
    const unitCount = Math.max(4, Math.floor((rackHeight - 55) / 52));
    for (let row = 0; row < unitCount; row += 1) {
      const unitY = rackTop + 48 + row * 52;
      this.drawEquipmentUnit(g, center, unitY, rackWidth - 38, 34, row < activeRows ? Math.min(6, row + 2) : 0, false);
    }
    this.drawCinematicCable(g, center - 34, rackTop + 48, center - rackWidth * 0.7, 52, YELLOW);
    this.drawCinematicCable(g, center + 34, rackTop + 100, center + rackWidth * 0.7, 52, BLUE);
  }

  private drawAisleWide(): void {
    const g = this.cinematic;
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, this.width, this.height);
    const center = this.width / 2;
    const horizonY = this.height * 0.3;
    g.fillStyle(0xf4f4f4, 1);
    g.fillTriangle(center, horizonY, 0, this.height, this.width, this.height);
    g.lineStyle(2, 0x000000, 1);
    g.lineBetween(center, horizonY, center - this.width * 0.16, this.height);
    g.lineBetween(center, horizonY, center + this.width * 0.16, this.height);

    g.lineBetween(center - 36, horizonY - 25, 32, 74);
    g.lineBetween(center - 24, horizonY - 12, 32, 94);
    g.lineBetween(center + 36, horizonY - 25, this.width - 32, 74);
    g.lineBetween(center + 24, horizonY - 12, this.width - 32, 94);
    for (let cross = 0; cross <= 5; cross += 1) {
      const t = cross / 5;
      const yLeft = Phaser.Math.Linear(horizonY - 20, 84, t);
      const xLeft = Phaser.Math.Linear(center - 31, 32, t);
      g.lineBetween(xLeft, yLeft - 9, xLeft, yLeft + 9);
      const xRight = Phaser.Math.Linear(center + 31, this.width - 32, t);
      g.lineBetween(xRight, yLeft - 9, xRight, yLeft + 9);
    }

    for (let i = 0; i < 5; i += 1) {
      const depth = i / 4;
      const rackWidth = Phaser.Math.Linear(44, Math.min(152, this.width * 0.14), depth);
      const rackHeight = Phaser.Math.Linear(this.height * 0.24, this.height * 0.66, depth);
      const bottomY = Phaser.Math.Linear(this.height * 0.54, this.height - 42, depth);
      const offset = Phaser.Math.Linear(72, this.width * 0.35, depth);
      const leftX = center - offset;
      const rightX = center + offset;
      const topY = bottomY - rackHeight;
      this.drawRack(g, leftX, topY, rackWidth, rackHeight, 0xededed);
      this.drawRack(g, rightX, topY, rackWidth, rackHeight, 0xededed);
      const lit = this.cinematicElapsed >= i * 190;
      const unitWidth = Math.max(24, rackWidth - 14);
      const unitHeight = Math.max(12, Math.min(28, rackHeight * 0.1));
      [0.32, 0.48, 0.64].forEach((row, rowIndex) => {
        const unitY = topY + rackHeight * row;
        this.drawEquipmentUnit(g, leftX, unitY, unitWidth, unitHeight, lit ? 1 + rowIndex : 0, false);
        this.drawEquipmentUnit(g, rightX, unitY, unitWidth, unitHeight, lit ? 1 + rowIndex : 0, false);
      });
    }

    const nearLeft = center - this.width * 0.35;
    const nearRight = center + this.width * 0.35;
    const nearTop = this.height - 42 - this.height * 0.66;
    this.drawCinematicRoutedCable(
      g, nearLeft, nearTop + this.height * 0.32, nearRight, nearTop + this.height * 0.32, 84, YELLOW,
    );
    this.drawCinematicRoutedCable(
      g, nearRight, nearTop + this.height * 0.38, nearLeft, nearTop + this.height * 0.38, 94, BLUE,
    );
  }

  private drawEquipmentUnit(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    ledCount: number,
    fans: boolean,
  ): void {
    g.fillStyle(0xd8d8d8, 1);
    g.fillRect(x - width / 2, y - height / 2, width, height);
    g.lineStyle(2, 0x000000, 1);
    g.strokeRect(x - width / 2, y - height / 2, width, height);
    if (fans) {
      [-width * 0.16, width * 0.16].forEach((offset) => {
        const fanX = x + offset;
        const radius = Math.min(22, height * 0.32);
        g.strokeCircle(fanX, y, radius);
        g.lineBetween(fanX, y, fanX + Math.cos(this.fanAngle) * radius * 0.82, y + Math.sin(this.fanAngle) * radius * 0.82);
        g.lineBetween(fanX, y, fanX - Math.cos(this.fanAngle) * radius * 0.82, y - Math.sin(this.fanAngle) * radius * 0.82);
      });
    }
    if (ledCount > 0) {
      const count = Math.min(ledCount, 5);
      const spacing = Math.min(10, Math.max(4, (width * 0.32) / Math.max(1, count - 1)));
      const startX = x + width / 2 - 8 - (count - 1) * spacing;
      g.fillStyle(GREEN, 1);
      for (let index = 0; index < count; index += 1) {
        if (index === 0 || Math.floor(this.ledElapsed / (160 + index * 23)) % 2 === index % 2) {
          g.fillCircle(startX + index * spacing, y, Math.min(4, height * 0.18));
        }
      }
    }
  }

  private drawCinematicCable(
    g: Phaser.GameObjects.Graphics,
    rackX: number,
    rackY: number,
    trayX: number,
    trayY: number,
    color: number,
  ): void {
    g.lineStyle(4, color, 1);
    g.lineBetween(rackX, rackY, rackX, trayY);
    g.lineBetween(rackX, trayY, trayX, trayY);
  }

  private drawCinematicRoutedCable(
    g: Phaser.GameObjects.Graphics,
    sourceX: number,
    sourceY: number,
    destinationX: number,
    destinationY: number,
    trayY: number,
    color: number,
  ): void {
    g.lineStyle(4, color, 1);
    g.lineBetween(sourceX, sourceY, sourceX, trayY);
    g.lineBetween(sourceX, trayY, destinationX, trayY);
    g.lineBetween(destinationX, trayY, destinationX, destinationY);
  }

  private drawCinematicFrame(): void {
    this.cinematic.clear();
    if (this.cinematicShot === 1) this.drawRackCloseup();
    else if (this.cinematicShot === 2) this.drawRackMedium();
    else if (this.cinematicShot === 3) this.drawAisleWide();
  }
}
