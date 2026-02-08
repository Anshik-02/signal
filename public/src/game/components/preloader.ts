// game/scenes/Preloader.ts
import { Scene } from "phaser";

export default class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  preload() {
    this.load.image("tiles", "/Tilesets/Outside.png");
    this.load.tilemapTiledJSON("world", "/assets/maps/main_ground14.json");
  this.load.atlas("me", "/assets/character/texture.png","assets/character/texture.json");
  this.load.spritesheet("me_down", "/assets/character/me/me-0.png", {frameWidth: 32, frameHeight: 48});
  this.load.spritesheet("me_up", "/assets/character/me/me-14.png", {frameWidth: 32, frameHeight: 48});
  this.load.spritesheet("me_left", "/assets/character/me/me-6.png", {frameWidth: 32, frameHeight: 48});
  this.load.spritesheet("me_right", "/assets/character/me/me-10.png", {frameWidth: 32, frameHeight: 48});

  }

  create() {
   console.log("Preloader finished");
  this.scene.start("WorldScene"); 
  }
}
