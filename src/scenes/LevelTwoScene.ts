import Phaser from 'phaser';

export class LevelTwoScene extends Phaser.Scene {
  constructor() {
    super('level-two');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#ffffff');
    document.querySelector<HTMLButtonElement>('#reset-button')?.classList.remove('is-visible');
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'LEVEL 2\n\nCOMING SOON', {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#000000',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
