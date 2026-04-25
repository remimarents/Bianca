
import { TetrisGame } from './tetris_engine.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const game = new TetrisGame();
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
