import { Scene } from "phaser";
import { socket } from "../network/socket";

type NetPlayer = {
  id: string;
  x: number;
  y: number;
  dir: Direction;
  isMoving: boolean;
  name: string;
  color: number;
  emote: string | null;
  state: "idle" | "walk" | "dance";
  danceType: string | null;
};
type Direction = "up" | "down" | "left" | "right";
type Snapshot = {
  x: number;
  y: number;
  dir: Direction;
  isMoving: boolean;
  timestamp: number;
  state: "idle" | "walk" | "dance";
  danceType: string | null;
};
type PredictedInput = {
  seq: number;
  vx: number;
  vy: number;
  dt: number;
};

export default class MainScene extends Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.GameObjects.Sprite;
  private lastDirection: Direction = "down";
  private players = new Map<string, Phaser.GameObjects.Sprite>();
  private playerLabels = new Map<string, Phaser.GameObjects.Text>();
  private playerEmotes = new Map<string, Phaser.GameObjects.Text>();
  private myId!: string;
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private lastVx: number = 0;
  private lastVy: number = 0;
  private snapshotBuffer = new Map<string, Snapshot[]>();
  private pendingInputs: PredictedInput[] = [];
  private inputSeq: number = 0;
  private readonly RENDER_DELAY = 100; // ms

  constructor() {
    super("WorldScene");
  }



  create() {
    // ─────────────────────────────────────────────
    // TILEMAP
    // ─────────────────────────────────────────────
    const map = this.make.tilemap({ key: "world" });
    const tileset = map.addTilesetImage("Outside", "tiles", 32, 32);
    this.cursors = this.input.keyboard!.createCursorKeys();
    // Explicit layers (BEST PRACTICE)
    this.groundLayer = map.createLayer("ground", tileset!, 0, 0)!;

    // Depths
    this.groundLayer.setDepth(0);

    // ─────────────────────────────────────────────
    // COLLISIONS (EXPLICIT & SAFE)
    // ─────────────────────────────────────────────
    this.groundLayer.setCollisionByProperty({ collides: true });

    // ─────────────────────────────────────────────
    // WORLD BOUNDS
    // ─────────────────────────────────────────────
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // ─────────────────────────────────────────────
    // PLAYER (will be created by syncPlayers)
    // ─────────────────────────────────────────────

    // ─────────────────────────────────────────────
    // CAMERA
    // ─────────────────────────────────────────────
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // ─────────────────────────────────────────────
    // ANIMATIONS
    // ─────────────────────────────────────────────
    this.createAnimations();

    // Create temporary local player immediately (will be replaced by server sync)


    socket.on("connect", () => {
      this.myId = socket.id || "";
      console.log("Socket connected, my ID:", this.myId);
    });

    // Handle being already connected
    if (socket.connected) {
      this.myId = socket.id || "";
      console.log("Socket already connected, my ID:", this.myId);
    }

    // Keyboard Focus Helper
    this.input.on('pointerdown', () => {
      this.game.canvas.focus();
      console.log("Canvas clicked - Keyboard focused");
    });

    // Emote Keyboard Listeners (Using safer event keys)
    this.input.keyboard!.on("keydown", (event: KeyboardEvent) => {
      const emoteMap: { [key: string]: string } = {
        "1": "👋",
        "2": "❤️",
        "3": "😄",
        "4": "😡"
      };

      if (emoteMap[event.key]) {
        console.log(`Emote pressed: ${emoteMap[event.key]}`);
        socket.emit("EMOTE", { type: emoteMap[event.key] });
      }

      // Handle 'D' key for dancing (Check both key and code)
      if (event.key && (event.key.toLowerCase() === 'd' || event.code === 'KeyD')) {
        console.log("D key DETECTED - emitting DANCE toggle");
        socket.emit("DANCE", { type: "dance1" });
      }
    });

    socket.on("STATE_SNAPSHOT", ({ users, timestamp }) => {
      this.syncPlayers(users, timestamp);
    });
  }

  private syncPlayers(players: any[], timestamp: number) {
    const seen = new Set<string>();

    players.forEach((p) => {
      seen.add(p.id);

      // 1. Initialize player if missing
      let sprite = this.players.get(p.id);
      if (!sprite) {
        sprite = this.add.sprite(p.x, p.y, "me", "me-0.png");
        sprite.setTint(p.color); // Apply server color

        this.players.set(p.id, sprite);

        const label = this.add.text(p.x, p.y - 20, p.name, {
          fontSize: "14px",
          color: "#ffffff",
          backgroundColor: "#000000aa",
          padding: { x: 4, y: 2 }
        }).setOrigin(0.5, 1);
        this.playerLabels.set(p.id, label);

        if (p.id === this.myId) {
          this.player = sprite;
          this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
        }
      }

      // Handle States (Dance/Idle/Walk)
      if ((sprite as any).serverState !== p.state) {
        console.log(`State change for ${p.id}: ${p.state}`);
      }
      (sprite as any).serverState = p.state;
      (sprite as any).serverDanceType = p.danceType;

      // Handle Emotes
      let emoteText = this.playerEmotes.get(p.id);
      if (p.emote) {
        if (!emoteText) {
          emoteText = this.add.text(p.x, p.y - 40, p.emote, {
            fontSize: "24px",
          }).setOrigin(0.5, 1);
          this.playerEmotes.set(p.id, emoteText);
        } else {
          emoteText.setText(p.emote);
        }
      } else if (emoteText) {
        emoteText.destroy();
        this.playerEmotes.delete(p.id);
      }

      // 2. Buffer snapshots for remote players
      if (p.id !== this.myId) {
        let buffer = this.snapshotBuffer.get(p.id);
        if (!buffer) {
          buffer = [];
          this.snapshotBuffer.set(p.id, buffer);
        }
        buffer.push({
          x: p.x,
          y: p.y,
          dir: p.dir,
          isMoving: p.isMoving,
          timestamp,
          state: p.state,
          danceType: p.danceType
        });

        // Keep buffer small
        if (buffer.length > 20) buffer.shift();
      } else {
        // 3. Reconciliation for local player
        // Filter out acknowledged inputs
        this.pendingInputs = this.pendingInputs.filter(input => input.seq > p.lastSeq);

        // Snap to server position and replay pending inputs
        this.applyReconciliation(p.x, p.y, p.dir, p.isMoving, p.state, p.danceType);
      }

      // Update label content and sprite tint if server data changed
      const label = this.playerLabels.get(p.id);
      if (label && label.text !== p.name) {
        label.setText(p.name);
      }

      if (sprite && sprite.tintTopLeft !== p.color) {
        sprite.setTint(p.color);
      }
    });

    // Cleanup disconnected players
    for (const [id, sprite] of this.players) {
      if (!seen.has(id)) {
        sprite.destroy();
        this.players.delete(id);
        this.snapshotBuffer.delete(id);
        const label = this.playerLabels.get(id);
        if (label) {
          label.destroy();
          this.playerLabels.delete(id);
        }
        const emote = this.playerEmotes.get(id);
        if (emote) {
          emote.destroy();
          this.playerEmotes.delete(id);
        }
      }
    }
  }

  private applyReconciliation(serverX: number, serverY: number, serverDir: Direction, serverIsMoving: boolean, serverState: string, serverDanceType: string | null) {
    if (!this.player) return;

    // 1. Blend instead of snap
    const alpha = 0.4;
    this.player.x = Phaser.Math.Linear(this.player.x, serverX, alpha);
    this.player.y = Phaser.Math.Linear(this.player.y, serverY, alpha);

    // 2. Replay all pending inputs
    const speed = 120; // Match server speed
    const isLocalMoving = this.cursors.left?.isDown || this.cursors.right?.isDown || this.cursors.up?.isDown || this.cursors.down?.isDown || this.pendingInputs.length > 0;

    // IF moving locally, inform server to stop dance
    if (isLocalMoving && serverState === "dance") {
      socket.emit("STOP_DANCE");
    }

    this.pendingInputs.forEach((input) => {
      const delta = input.dt / 1000;

      let movX = input.vx;
      let movY = input.vy;

      // Normalize if diagonal
      if (movX !== 0 && movY !== 0) {
        const length = Math.sqrt(movX * movX + movY * movY);
        movX /= length;
        movY /= length;
      }

      this.player.x += movX * speed * delta;
      this.player.y += movY * speed * delta;
    });

    // 3. Force animation logic
    this.lastDirection = serverDir;

    if (serverState === "dance") {
      this.player.anims.play(serverDanceType || "dance1", true);
    } else if (serverIsMoving || isLocalMoving) {
      this.player.anims.play(`run-${this.lastDirection}`, true);
    } else {
      const idle =
        this.lastDirection === "left"
          ? "me-4.png"
          : this.lastDirection === "right"
            ? "me-8.png"
            : this.lastDirection === "up"
              ? "me-13.png"
              : "me-0.png";

      this.player.setTexture("me", idle);
      this.player.anims.stop();
    }
  }

  private updateRemotePlayers() {
    const renderTime = Date.now() - this.RENDER_DELAY;

    for (const [id, sprite] of this.players) {
      if (id === this.myId) continue;

      const buffer = this.snapshotBuffer.get(id);
      if (!buffer || buffer.length < 2) continue;

      // Cleanup buffer: keep snapshots until renderTime is past buffer[1]
      while (buffer.length >= 2 && buffer[1].timestamp <= renderTime) {
        buffer.shift();
      }

      // Find snapshots to interpolate between
      let i = 0;
      for (; i < buffer.length - 1; i++) {
        if (buffer[i + 1].timestamp > renderTime) break;
      }

      const s0 = buffer[i];
      const s1 = buffer[i + 1];

      if (s0 && s1 && renderTime >= s0.timestamp && renderTime <= s1.timestamp) {
        const t = (renderTime - s0.timestamp) / (s1.timestamp - s0.timestamp);
        const x = Phaser.Math.Interpolation.Linear([s0.x, s1.x], t);
        const y = Phaser.Math.Interpolation.Linear([s0.y, s1.y], t);

        sprite.setPosition(x, y);
        // Removed fixed tint override to respect server color

        // Animation logic for remote players
        if (s1.state === "dance") {
          sprite.anims.play(s1.danceType || "dance1", true);
        } else if (s1.isMoving) {
          const animKey = `run-${s1.dir}`;
          if (this.anims.exists(animKey)) {
            sprite.anims.play(animKey, true);
          }
        } else {
          // If s1 is stopped, but we are still interpolating towards it from a moving s0,
          // we might want to keep running until we are very close to the target.
          const distSq = (sprite.x - s1.x) ** 2 + (sprite.y - s1.y) ** 2;
          if (distSq > 1) { // Still far from target, keep running
            const animKey = `run-${s1.dir}`;
            if (this.anims.exists(animKey)) {
              sprite.anims.play(animKey, true);
            }
          } else {
            const idle =
              s1.dir === "left"
                ? "me-4.png"
                : s1.dir === "right"
                  ? "me-8.png"
                  : s1.dir === "up"
                    ? "me-13.png"
                    : "me-0.png";

            sprite.setTexture("me", idle);
            sprite.anims.stop();
          }
        }
      } else if (s1 && renderTime > s1.timestamp) {
        // Extrapolate or just snap to latest (simpler)
        sprite.setPosition(s1.x, s1.y);
        sprite.anims.stop();
      }
    }
  }

  private createAnimations() {
    this.anims.create({
      key: "run-down",
      frames: this.anims.generateFrameNames("me", {
        start: 0,
        end: 3,
        prefix: "me-",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "run-left",
      frames: this.anims.generateFrameNames("me", {
        start: 4,
        end: 7,
        prefix: "me-",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "run-right",
      frames: this.anims.generateFrameNames("me", {
        start: 8,
        end: 11,
        prefix: "me-",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "run-up",
      frames: this.anims.generateFrameNames("me", {
        start: 13,
        end: 16,
        prefix: "me-",
        suffix: ".png",
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "dance1",
      frames: [
        { key: "me", frame: "me-0.png" },
        { key: "me", frame: "me-4.png" },
        { key: "me", frame: "me-8.png" },
        { key: "me", frame: "me-13.png" },
      ],
      frameRate: 8,
      repeat: -1,
    });

    this.anims.create({
      key: "dance2",
      frames: [
        { key: "me", frame: "me-0.png" },
        { key: "me", frame: "me-8.png" },
        { key: "me", frame: "me-13.png" },
        { key: "me", frame: "me-4.png" },
      ],
      frameRate: 12,
      repeat: -1,
    });

    this.anims.create({
      key: "dance3",
      frames: [
        { key: "me", frame: "me-1.png" },
        { key: "me", frame: "me-2.png" },
        { key: "me", frame: "me-1.png" },
        { key: "me", frame: "me-0.png" },
        { key: "me", frame: "me-5.png" },
        { key: "me", frame: "me-6.png" },
        { key: "me", frame: "me-5.png" },
        { key: "me", frame: "me-4.png" },
      ],
      frameRate: 10,
      repeat: -1,
    });
  }

  update() {
    if (!this.player) return;

    // Ignore input if React UI (Emote Wheel) is open
    if ((window as any).isEmoteWheelOpen) {
      // Force stop animations and movement
      const currentState = (this.player as any).serverState;
      if (currentState !== "dance") {
        const idle =
          this.lastDirection === "left"
            ? "me-4.png"
            : this.lastDirection === "right"
              ? "me-8.png"
              : this.lastDirection === "up"
                ? "me-13.png"
                : "me-0.png";
        this.player.setTexture("me", idle);
        this.player.anims.stop();
      }
      return;
    }

    const speed = 120; // pixels per second
    let inputVx = 0;
    let inputVy = 0;

    if (this.cursors.left?.isDown) inputVx = -1;
    else if (this.cursors.right?.isDown) inputVx = 1;

    if (this.cursors.up?.isDown) inputVy = -1;
    else if (this.cursors.down?.isDown) inputVy = 1;

    // 1. Prediction (Local Movement)
    const dt = this.game.loop.delta;
    const delta = dt / 1000;

    if (inputVx !== 0 || inputVy !== 0) {
      let movX = inputVx;
      let movY = inputVy;
      if (movX !== 0 && movY !== 0) {
        const length = Math.sqrt(movX * movX + movY * movY);
        movX /= length;
        movY /= length;
      }

      this.player.x += movX * speed * delta;
      this.player.y += movY * speed * delta;

      // Update direction and animation
      if (Math.abs(movX) > Math.abs(movY)) {
        this.lastDirection = movX > 0 ? "right" : "left";
      } else {
        this.lastDirection = movY > 0 ? "down" : "up";
      }
      this.player.anims.play(`run-${this.lastDirection}`, true);

      // 2. Emit and Store for Reconciliation
      this.inputSeq++;
      const input = { seq: this.inputSeq, vx: inputVx, vy: inputVy, dt };
      this.pendingInputs.push(input);
      socket.emit("MOVE", { ...input, dir: this.lastDirection });
    } else {
      // Idle logic: Only apply if we aren't currently dancing
      const currentState = (this.player as any).serverState;
      if (currentState === "dance") {
        const danceKey = (this.player as any).serverDanceType || "dance1";
        this.player.anims.play(danceKey, true);
      } else {
        const idle =
          this.lastDirection === "left"
            ? "me-4.png"
            : this.lastDirection === "right"
              ? "me-8.png"
              : this.lastDirection === "up"
                ? "me-13.png"
                : "me-0.png";

        this.player.setTexture("me", idle);
        this.player.anims.stop();
      }
    }

    // 3. Update Remote Players (Interpolation)
    this.updateRemotePlayers();

    // 4. Update all player labels position
    for (const [id, sprite] of this.players) {
      const label = this.playerLabels.get(id);
      if (label) {
        label.setPosition(sprite.x, sprite.y - sprite.displayHeight / 2 - 4);
        label.setDepth(sprite.depth + 1);

        // Position emote above label
        const emote = this.playerEmotes.get(id);
        if (emote) {
          emote.setPosition(label.x, label.y - label.displayHeight - 4);
          emote.setDepth(sprite.depth + 1);
        }
      }
    }

    // Optional depth sorting
    this.player.setDepth(this.player.y);
  }
}
