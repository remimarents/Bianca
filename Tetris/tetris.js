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

const music = new Audio('assets/audio/music_loop.wav');
music.loop = true;
music.preload = 'auto';
music.volume = 0.35;

let audioUnlocked = false;
let soundEnabled = true;
let musicEnabled = true;

function refreshButtons() {
  soundButton.textContent = soundEnabled ? 'Lyd: på' : 'Lyd: av';
  musicButton.textContent = musicEnabled ? 'Musikk: på' : 'Musikk: av';
}

function unlockAudio() {
  if (audioUnlocked) {
    return;
  }

  audioUnlocked = true;

  // Tom play/pause gjør at Chrome/Safari godtar senere lyd etter brukerhandling.
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

  playMusic();
}

function playEffect(name) {
  if (!audioUnlocked || !soundEnabled) {
    return;
  }

  const source = effectCache.get(name);
  if (!source) {
    return;
  }

  const audio = source.cloneNode(true);
  audio.volume = source.volume;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playMusic() {
  if (!audioUnlocked || !musicEnabled) {
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
    playMusic();
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

function gameLoop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  game.update(dt);
  game.draw(ctx);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
