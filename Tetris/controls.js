export const Controls = {
  LEFT: 'ArrowLeft',
  RIGHT: 'ArrowRight',
  DOWN: 'ArrowDown',
  ROTATE: 'ArrowUp',
  DROP: 'Space',
  RESTART: 'KeyR',
};

export function setupControls(game, options = {}) {
  const unlockAudio = typeof options.unlockAudio === 'function' ? options.unlockAudio : () => {};

  document.addEventListener('keydown', (e) => {
    unlockAudio();

    if (
      e.code === Controls.LEFT ||
      e.code === Controls.RIGHT ||
      e.code === Controls.DOWN ||
      e.code === Controls.ROTATE ||
      e.code === Controls.DROP
    ) {
      e.preventDefault();
    }

    if (game.awaitingName) {
      if (e.key === 'Enter') {
        game.submitHighscoreName();
      } else if (e.key === 'Backspace') {
        game.nameInput = game.nameInput.slice(0, -1);
      } else if (e.key.length === 1 && game.nameInput.length < 12) {
        game.nameInput += e.key;
      }

      return;
    }

    if (game.gameOver) {
      if (e.code === Controls.RESTART) {
        game.reset();
      }

      return;
    }

    if (e.code === Controls.LEFT) {
      game.moveLeft();
    } else if (e.code === Controls.RIGHT) {
      game.moveRight();
    } else if (e.code === Controls.DOWN) {
      game.softDrop = true;
    } else if (e.code === Controls.ROTATE) {
      game.rotate();
    } else if (e.code === Controls.DROP) {
      game.hardDrop();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === Controls.DOWN) {
      game.softDrop = false;
    }
  });
}
