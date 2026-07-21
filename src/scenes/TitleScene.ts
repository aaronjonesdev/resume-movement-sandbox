import Phaser from 'phaser';

const CANVAS_WIDTH = 560;
const CANVAS_HEIGHT = 430;

export class TitleScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private startButton!: Phaser.GameObjects.Container;
  private starting = false;

  constructor() {
    super('title');
  }

  create(): void {
    this.starting = false;
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.remove('is-visible');

    this.content = this.add.container(0, 0);
    this.drawFrame();
    this.addTitles();
    this.addStartPrompt();
    this.addStartButton();
    this.layout(this.scale.width, this.scale.height);

    this.input.keyboard?.once('keydown-ENTER', this.startGame, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
  }

  private drawFrame(): void {
    const frame = this.add.graphics();
    frame.lineStyle(2, 0x000000, 1);
    frame.strokeRect(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2, CANVAS_WIDTH, CANVAS_HEIGHT);

    frame.fillStyle(0x000000, 1);
    const corners: Array<[number, number]> = [
      [-CANVAS_WIDTH / 2 - 5, -CANVAS_HEIGHT / 2 - 5],
      [CANVAS_WIDTH / 2 - 5, -CANVAS_HEIGHT / 2 - 5],
      [-CANVAS_WIDTH / 2 - 5, CANVAS_HEIGHT / 2 - 5],
      [CANVAS_WIDTH / 2 - 5, CANVAS_HEIGHT / 2 - 5],
    ];
    corners.forEach(([x, y]) => frame.fillRect(x, y, 10, 10));

    for (let x = -72; x <= 72; x += 24) {
      frame.fillRect(x, -147, 12, 4);
    }

    this.content.add(frame);
  }

  private addTitles(): void {
    const name = this.makeText(-94, 'AARON JONES', 21, '#000000', 5);
    const title = this.makeText(-36, 'RESUME: THE GAME', 38, '#ffffff', 2);
    title.setBackgroundColor('#000000').setPadding(14, 9, 14, 9);
    const subtitle = this.makeText(37, 'AN INTERACTIVE CAREER JOURNEY', 15, '#000000', 2);

    this.content.add([name, title, subtitle]);

    this.tweens.add({
      targets: [name, title, subtitle],
      y: '-=3',
      duration: 1400,
      ease: 'Sine.inOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private addStartPrompt(): void {
    const prompt = this.makeText(107, 'PRESS ENTER', 17, '#000000', 3);
    this.content.add(prompt);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 520,
      ease: 'Stepped',
      easeParams: [1],
      yoyo: true,
      repeat: -1,
      hold: 140,
    });
  }

  private addStartButton(): void {
    const background = this.add.rectangle(0, 164, 160, 48, 0xffffff).setStrokeStyle(2, 0x000000);
    const label = this.makeText(164, 'START', 17, '#000000', 3);
    const hitArea = this.add.rectangle(0, 164, 160, 48, 0xffffff, 0).setInteractive({ useHandCursor: true });

    this.startButton = this.add.container(0, 0, [background, label, hitArea]);
    this.content.add(this.startButton);

    hitArea.on('pointerover', () => {
      if (!this.starting) this.startButton.setScale(1.04);
    });
    hitArea.on('pointerout', () => {
      if (!this.starting) this.startButton.setScale(1);
    });
    hitArea.on('pointerdown', () => {
      if (!this.starting) this.startButton.setScale(0.96);
    });
    hitArea.on('pointerup', this.startGame, this);
  }

  private makeText(
    y: number,
    text: string,
    size: number,
    color: string,
    letterSpacing: number,
  ): Phaser.GameObjects.Text {
    return this.add
      .text(0, y, text, {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        align: 'center',
      })
      .setOrigin(0.5)
      .setLetterSpacing(letterSpacing);
  }

  private startGame(): void {
    if (this.starting) return;

    this.starting = true;
    this.input.keyboard?.removeAllListeners('keydown-ENTER');
    this.startButton.disableInteractive();
    this.tweens.add({
      targets: this.startButton,
      scaleX: 0.94,
      scaleY: 0.94,
      duration: 70,
      yoyo: true,
      onComplete: () => this.scene.start('level-one'),
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number): void {
    const scale = Math.min(1, (width - 40) / CANVAS_WIDTH, (height - 40) / CANVAS_HEIGHT);
    this.content.setPosition(width / 2, height / 2).setScale(Math.max(0.48, scale));
  }
}
