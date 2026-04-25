
import { TetrisGame } from './tetris_engine.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

// Lydkontroller
const music = new Audio('assets/audio/music_loop.wav');
music.loop = true;
music.volume = 0.5;
let musicMuted = false;
let effectsMuted = false;

const game = new TetrisGame({
  playEffect: (name) => {
    if (effectsMuted) return;
    const audio = new Audio(`assets/audio/${name}.wav`);
    audio.volume = 0.7;
    audio.play();
  },
  playMusic: () => {
    if (!musicMuted && music.paused) music.play();
  },
  stopMusic: () => {
    if (!music.paused) music.pause();
    music.currentTime = 0;
  }
});
setupControls(game);

let lastTime = 0;
function gameLoop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
