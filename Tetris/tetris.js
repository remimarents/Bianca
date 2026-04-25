import { TetrisGame } from './tetris_engine.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const EFFECT_NAMES = [
  'move',
  'rotate',
  'clear',
  'harddrop',
  'levelup',
  'gameover',
];

const effects = new Map(
  EFFECT_NAMES.map(name => {
    const audio = new Audio(`assets/audio/${name}.wav`);
    audio.preload = 'auto';
    audio.volume = 0.7;
    return [name, audio];
  }),
);

const music = new Audio('assets/audio/music_loop.wav');
music.loop = true;
music.preload = 'auto';
music.volume = 0.35;

let audioUnlocked = false;
let musicMuted = false;
let effectsMuted = false;

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  audioUnlocked = true;
  playMusic();
}

function playEffect(name) {
  if (!audioUnlocked || effectsMuted) {
    return;
  }

  const source = effects.get(name);
  if (!source) {
    return;
  }

  const audio = source.cloneNode();
  audio.volume = source.volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playMusic() {
  if (!audioUnlocked || musicMuted) {
    return;
  }

  if (music.paused) {
    music.play().catch(() => {});
  }
}

function stopMusic() {
  if (!music.paused) {
    music.pause();
  }

  music.currentTime = 0;
}

const game = new TetrisGame({
  playEffect,
  playMusic,
  stopMusic,
});

setupControls(game, {
  unlockAudio,
});

let lastTime = 0;

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  game.update(dt);
  game.draw(ctx);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
