import { Types } from 'phaser';
import Preloader from './game/components/preloader';
import WorldScene from './game/scenes/main_scene';




const config: Types.Core.GameConfig = {

   type: Phaser.CANVAS,
  scale:{
        mode : Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width:1580
    },
  backgroundColor: '#1d1d1d',
  scene: [Preloader,WorldScene],

  physics: {
    default: 'arcade',
    arcade: {
      //@ts-ignore
      gravity: { y: 0 }, 
      // debug:true
    },
  },
};

export default config;