
import { TetrisGame } from './tetris_engine.js';
import { setupControls } from './controls.js';

const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');

const game = new TetrisGame();
setupControls(game);

// Avslutt-knapp

const exitBtn = document.getElementById('exit-btn');
if (exitBtn) {
  exitBtn.onclick = () => {
    game.showExitScreen();
    game.draw(ctx);
    exitBtn.style.display = 'none';
  };
}

// Vis avslutt-knappen også når spillet er ferdig
function updateExitButton() {
  if (exitBtn) {
    if (game.gameOver && !game.showExit) {
      exitBtn.style.display = 'block';
    } else if (game.showExit) {
      exitBtn.style.display = 'none';
    }
  }
}

let lastTime = 0;

function gameLoop(time) {
  const dt = (time - lastTime) / 1000;
  lastTime = time;
  if (!game.showExit) {
    game.update(dt);
    game.draw(ctx);
    updateExitButton();
    requestAnimationFrame(gameLoop);
  } else {
    game.draw(ctx);
    updateExitButton();
  }
}

requestAnimationFrame(gameLoop);
