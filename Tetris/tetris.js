import { TetrisGame } from './tetris_engine.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const soundButton = document.getElementById('sound-btn');
const musicButton = document.getElementById('music-btn');

const EFFECT_NAMES = ['move', 'rotate', 'clear', 'harddrop', 'levelup', 'gameover'];
const effectCache = new Map();

for (const name of EFFECT_NAMES) {
  const audio = new Audio(`assets/audio/${name}.wav`);
  audio.preload = 'auto';
  audio.volume = 0.8;
  effectCache.set(name, audio);
}

const musicLevel1 = new Audio('assets/audio/music_loop_level1.wav');
musicLevel1.loop = true;
musicLevel1.preload = 'auto';
musicLevel1.volume = 0.35;

const musicLevelHigh = new Audio('assets/audio/music_loop_level_high.wav');
musicLevelHigh.loop = true;
musicLevelHigh.preload = 'auto';
musicLevelHigh.volume = 0.35;

let currentMusic = null;
let audioUnlocked = false;
let soundEnabled = true;
let musicEnabled = true;
let requestedLevel = 1;

function refreshButtons() {
  soundButton.textContent = soundEnabled ? 'Lyd: på' : 'Lyd: av';
  musicButton.textContent = musicEnabled ? 'Musikk: på' : 'Musikk: av';
}

function getMusicForLevel(level) {
  return level >= 10 ? musicLevelHigh : musicLevel1;
}

function unlockAudio() {
  if (audioUnlocked) return;

  audioUnlocked = true;

  const warmup = effectCache.get('move');
  if (warmup) {
    warmup.volume = 0;
    warmup.play()
      .then(() => {
        warmup.pause();
        warmup.currentTime = 0;
        warmup.volume = 0.8;
      })
      .catch(() => {
        warmup.volume = 0.8;
      });
  }

  playMusic(requestedLevel);
}

function playEffect(name) {
  if (!audioUnlocked || !soundEnabled) return;

  const source = effectCache.get(name);
  if (!source) return;

  const audio = source.cloneNode(true);
  audio.volume = source.volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playMusic(level = 1) {
  requestedLevel = level;

  if (!audioUnlocked || !musicEnabled) return;

  const nextMusic = getMusicForLevel(level);

  if (currentMusic && currentMusic !== nextMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }

  currentMusic = nextMusic;

  if (currentMusic.paused) {
    currentMusic.play().catch(() => {});
  }
}

function stopMusic() {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
}

soundButton.addEventListener('click', () => {
  unlockAudio();
  soundEnabled = !soundEnabled;
  refreshButtons();

  if (soundEnabled) {
    playEffect('levelup');
  }
});

musicButton.addEventListener('click', () => {
  unlockAudio();
  musicEnabled = !musicEnabled;
  refreshButtons();

  if (musicEnabled) {
    playMusic(requestedLevel);
  } else {
    stopMusic();
  }
});

refreshButtons();

const game = new TetrisGame({
  playEffect,
  playMusic,
  stopMusic,
});

setupControls(game, {
  unlockAudio,
});

let lastTime = 0;
let lastLevel = game.level;

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  game.update(dt);
  game.draw(ctx);

  if (game.level !== lastLevel) {
    playMusic(game.level);
    lastLevel = game.level;
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);