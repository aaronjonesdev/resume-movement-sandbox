import Phaser from 'phaser';

const CONTENT_WIDTH = 1280;
const CONTENT_HEIGHT = 720;
const CARD_WIDTH = 1260;
const CARD_HEIGHT = 650;
const CARD_CENTER_Y = -15;
const RED = 0xb52b27;
const SECTION_SIZE = 22;
const COMPANY_SIZE = 18;
const ROLE_SIZE = 14;
const DATE_SIZE = 13;
const BODY_SIZE = 13;

export class FinalScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private playAgainButton!: Phaser.GameObjects.Container;
  private leaving = false;

  constructor() {
    super('final');
  }

  create(): void {
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
    document.querySelector<HTMLButtonElement>('#skip-level-button')?.classList.remove('is-visible');

    this.content = this.add.container(0, 0);
    this.createFrame();
    this.createTitle();
    this.createExperienceSection();
    this.createEducationSection();
    this.createSkillsSection();
    this.createFooter();
    this.createPlayAgainButton();
    this.createConfettiBurst();
    this.layout(this.scale.width, this.scale.height);

    this.cameras.main.fadeIn(300, 255, 255, 255);
    this.input.keyboard?.on('keydown-ENTER', this.playAgain, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private createFrame(): void {
    const frame = this.add.graphics();
    frame.fillStyle(0xffffff, 1);
    frame.fillRect(-CARD_WIDTH / 2, CARD_CENTER_Y - CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
    this.content.add(frame);
  }

  private createTitle(): void {
    const title = this.makeText('THANK YOU FOR PLAYING!', 42).setPosition(0, -304).setLetterSpacing(2);
    const header = this.makeText('PROFESSIONAL EXPERIENCE', SECTION_SIZE).setPosition(0, -249).setLetterSpacing(2);
    this.content.add([title, header]);
  }

  private createExperienceSection(): void {
    this.createExperienceColumn(
      -400,
      'LOGICALIS',
      'Data Center Technician',
      '02/2025 – 07/2026',
      '• Supported Microsoft data center operations through hardware deployment, structured cabling, troubleshooting, and technical documentation.\n' +
        '• Routed and dressed fiber and copper cabling.\n' +
        '• Installed infrastructure for new IDF and colo buildouts.\n' +
        '• Racked, patched, labeled, and verified equipment.',
    );
    this.createExperienceColumn(
      0,
      'KETT ENGINEERING',
      'Autonomous Vehicle Test Driver / Operator',
      '04/2022 – 05/2024',
      '• Logged over 20,000 autonomous vehicle test miles.\n' +
        '• Monitored autonomous vehicle system performance.\n' +
        '• Collected test data and prepared analytical reports.\n' +
        '• Collaborated with engineers to improve reliability and safety.',
    );
    this.createExperienceColumn(
      400,
      'COX COMMUNICATIONS',
      'Cable Technician / Sales Representative',
      '03/2017 – 10/2019',
      '• Installed and configured residential and business network infrastructure.\n' +
        '• Supported modems, routers, security cameras, cable boxes, and structured cabling.\n' +
        '• Troubleshot customer issues and documented completed work activities.',
    );
  }

  private createExperienceColumn(x: number, company: string, role: string, dates: string, highlights: string): void {
    const companyText = this.makeText(company, COMPANY_SIZE).setPosition(x, -211);
    const roleText = this.makeText(role, ROLE_SIZE).setPosition(x, -184);
    const dateText = this.makeText(dates, DATE_SIZE).setPosition(x, -160);
    const detail = this.makeText(highlights, BODY_SIZE, 'left')
      .setOrigin(0, 0)
      .setPosition(x - 175, -135)
      .setWordWrapWidth(350)
      .setLineSpacing(3);
    this.content.add([companyText, roleText, dateText, detail]);
  }

  private createEducationSection(): void {
    const x = -390;
    const header = this.makeText('EDUCATION', SECTION_SIZE).setPosition(x, 65).setLetterSpacing(2);
    const degree = this.makeText('Associate in Science', 17).setPosition(x, 100);
    const dates = this.makeText('08/2024 – 05/2026', DATE_SIZE).setPosition(x, 124);
    const school = this.makeText('Estrella Mountain Community College', BODY_SIZE).setPosition(x, 148);
    const distinction = this.makeText('Graduated with Distinction', BODY_SIZE).setPosition(x, 172);

    const bachelors = this.makeText('COMING SOON — B.S. COMPUTER SCIENCE', 16, 'center', '#b52b27').setPosition(x, 205);
    const wgu = this.makeText('Western Governors University', BODY_SIZE).setPosition(x, 229);
    const expected = this.makeText('Expected 2027', DATE_SIZE).setPosition(x, 253);
    this.content.add([header, degree, dates, school, distinction, bachelors, wgu, expected]);
  }

  private createSkillsSection(): void {
    const header = this.makeText('TECHNICAL SKILLS', SECTION_SIZE).setPosition(350, 65).setLetterSpacing(2);
    const softwareTitle = this.makeText('SOFTWARE & DEVELOPMENT', 16).setPosition(220, 100);
    const software = this.makeText(
      '• Java\n• TypeScript / JavaScript\n• HTML / CSS\n• Git / GitHub\n• Phaser / Vite\n• Vercel',
      BODY_SIZE,
      'left',
    ).setOrigin(0, 0).setPosition(120, 125).setLineSpacing(3);
    const infrastructureTitle = this.makeText('IT & INFRASTRUCTURE', 16).setPosition(505, 100);
    const infrastructure = this.makeText(
      '• Hardware Deployment\n• Data Center Operations\n• Network Infrastructure\n• Structured Cabling\n• Technical Troubleshooting\n• Windows 11 / Microsoft 365',
      BODY_SIZE,
      'left',
    ).setOrigin(0, 0).setPosition(395, 125).setLineSpacing(3);
    this.content.add([header, softwareTitle, software, infrastructureTitle, infrastructure]);
  }

  private createFooter(): void {
    const footer = this.makeText('Designed & Developed by Aaron Jones', 13).setPosition(0, 330);
    this.content.add(footer);
  }

  private createPlayAgainButton(): void {
    const background = this.add.rectangle(0, 288, 210, 46, 0xffffff).setStrokeStyle(2, 0x000000);
    const label = this.makeText('PLAY AGAIN', 18).setPosition(0, 288).setLetterSpacing(2);
    const hitArea = this.add.rectangle(0, 288, 210, 46, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.playAgainButton = this.add.container(0, 0, [background, label, hitArea]);
    hitArea.on('pointerover', () => {
      if (!this.leaving) this.playAgainButton.setScale(1.04);
    });
    hitArea.on('pointerout', () => {
      if (!this.leaving) this.playAgainButton.setScale(1);
    });
    hitArea.on('pointerdown', () => {
      if (!this.leaving) this.playAgainButton.setScale(0.96);
    });
    hitArea.on('pointerup', this.playAgain, this);
    this.content.add(this.playAgainButton);
  }

  private createConfettiBurst(): void {
    const colors = [0x000000, RED, 0xf2c500, 0x238823, 0x235f9e];
    for (let index = 0; index < 82; index += 1) {
      const direction = index % 2 === 0 ? -1 : 1;
      const piece = this.add.rectangle(
        Phaser.Math.Between(-145, 145),
        -328,
        Phaser.Math.Between(5, 9),
        Phaser.Math.Between(9, 16),
        colors[index % colors.length],
      );
      this.content.add(piece);
      this.tweens.add({
        targets: piece,
        x: direction * Phaser.Math.Between(130, 560),
        y: Phaser.Math.Between(-215, 25),
        angle: direction * Phaser.Math.Between(90, 260),
        duration: Phaser.Math.Between(480, 760),
        ease: 'Quad.out',
        onComplete: () => {
          this.tweens.add({
            targets: piece,
            y: Phaser.Math.Between(365, 440),
            x: piece.x + direction * Phaser.Math.Between(20, 90),
            angle: piece.angle + direction * Phaser.Math.Between(180, 420),
            alpha: 0,
            duration: Phaser.Math.Between(900, 1400),
            ease: 'Quad.in',
            onComplete: () => piece.destroy(),
          });
        },
      });
    }
  }

  private makeText(
    text: string,
    size: number,
    align: 'left' | 'center' = 'center',
    color = '#000000',
  ): Phaser.GameObjects.Text {
    return this.add.text(0, 0, text, {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color,
      align,
    }).setOrigin(0.5);
  }

  private playAgain(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.input.keyboard?.off('keydown-ENTER', this.playAgain, this);
    this.tweens.add({
      targets: this.playAgainButton,
      scaleX: 0.94,
      scaleY: 0.94,
      duration: 70,
      yoyo: true,
    });
    this.cameras.main.fadeOut(240, 255, 255, 255);
    this.time.delayedCall(260, () => this.scene.start('title'));
  }

  private layout(width: number, height: number): void {
    const scale = Math.min(1, width / CONTENT_WIDTH, height / CONTENT_HEIGHT);
    const finalScale = Math.max(0.42, scale);
    this.content.setPosition(width / 2, height / 2).setScale(finalScale);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private shutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.input.keyboard?.off('keydown-ENTER', this.playAgain, this);
    this.tweens.killAll();
    this.time.removeAllEvents();
  }
}
