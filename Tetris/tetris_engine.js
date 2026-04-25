import { saveHighscore, getHighscores } from './highscore.js';

const PLAYFIELD_WIDTH = 10;
const PLAYFIELD_HEIGHT = 20;
const BLOCK_SIZE = 30;
const PLAY_X = 70;
const PLAY_Y = 80;

const COLORS = {
  I: '#76d7ff',
  J: '#8fb0ff',
  L: '#ffba7a',
  O: '#ffe376',
  S: '#95e8a6',
  T: '#d6a7ff',
  Z: '#ff92ad',
};

const PIECES = {
  I: [
    ['....', 'XXXX', '....', '....'],
    ['..X.', '..X.', '..X.', '..X.'],
  ],
  J: [
    ['X..', 'XXX', '...'],
    ['.XX', '.X.', '.X.'],
    ['...', 'XXX', '..X'],
    ['.X.', '.X.', 'XX.'],
  ],
  L: [
    ['..X', 'XXX', '...'],
    ['.X.', '.X.', '.XX'],
    ['...', 'XXX', 'X..'],
    ['XX.', '.X.', '.X.'],
  ],
  O: [['XX', 'XX']],
  S: [
    ['.XX', 'XX.', '...'],
    ['.X.', '.XX', '..X'],
  ],
  T: [
    ['.X.', 'XXX', '...'],
    ['.X.', '.XX', '.X.'],
    ['...', 'XXX', '.X.'],
    ['.X.', 'XX.', '.X.'],
  ],
  Z: [
    ['XX.', '.XX', '...'],
    ['..X', '.XX', '.X.'],
  ],
};

const SCORES_BY_LINES = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};

function randomBag() {
  const bag = Object.keys(PIECES);

  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  return bag;
}

class Tetromino {
  constructor(shape, rotation = 0, x = 3, y = 0) {
    this.shape = shape;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
  }

  get matrix() {
    const rotations = PIECES[this.shape];
    return rotations[((this.rotation % rotations.length) + rotations.length) % rotations.length];
  }

  cells() {
    const result = [];
    const matrix = this.matrix;

    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col] === 'X') {
          result.push([this.x + col, this.y + row]);
        }
      }
    }

    return result;
  }

  rotated(dir = 1) {
    return new Tetromino(this.shape, this.rotation + dir, this.x, this.y);
  }

  moved(dx = 0, dy = 0) {
    return new Tetromino(this.shape, this.rotation, this.x + dx, this.y + dy);
  }
}

export class TetrisGame {
  constructor(options = {}) {
    this.playEffect = typeof options.playEffect === 'function' ? options.playEffect : () => {};
    this.playMusic = typeof options.playMusic === 'function' ? options.playMusic : () => {};
    this.stopMusic = typeof options.stopMusic === 'function' ? options.stopMusic : () => {};

    this.scoreTable = getHighscores();
    this.reset();
  }

  reset() {
    this.board = Array.from(
      { length: PLAYFIELD_HEIGHT },
      () => Array(PLAYFIELD_WIDTH).fill(null),
    );

    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.awaitingName = false;
    this.nameInput = '';
    this.newHighscore = false;
    this.savedScore = false;
    this.bag = [];
    this.currentPiece = this._nextPiece();
    this.nextPiece = this._nextPiece();
    this.dropTimer = 0;
    this.softDrop = false;
    this.sparklePhase = 0;
    this.scoreTable = getHighscores();

    this.playMusic(this.level);
  }

  _fillBag() {
    this.bag = randomBag();
  }

  _nextPiece() {
    if (!this.bag || this.bag.length === 0) {
      this._fillBag();
    }

    const shape = this.bag.pop();
    return new Tetromino(shape, 0, 3, 0);
  }

  _valid(piece) {
    for (const [x, y] of piece.cells()) {
      if (x < 0 || x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT) return false;
      if (y >= 0 && this.board[y][x]) return false;
    }

    return true;
  }

  _lockPiece() {
    for (const [x, y] of this.currentPiece.cells()) {
      if (y < 0) {
        this._triggerGameOver();
        return;
      }

      this.board[y][x] = this.currentPiece.shape;
    }

    const oldLevel = this.level;
    const cleared = this._clearLines();

    if (cleared > 0) {
      this.playEffect('clear');
    }

    this.score += SCORES_BY_LINES[cleared] * this.level;
    this.lines += cleared;
    this.level = 1 + Math.floor(this.lines / 10);

    if (this.level > oldLevel) {
      this.playEffect('levelup');
      this.playMusic(this.level);
    }

    this.currentPiece = this.nextPiece;
    this.nextPiece = this._nextPiece();

    if (!this._valid(this.currentPiece)) {
      this._triggerGameOver();
    }
  }

  _clearLines() {
    const remaining = this.board.filter(row => row.some(cell => !cell));
    const cleared = PLAYFIELD_HEIGHT - remaining.length;

    while (remaining.length < PLAYFIELD_HEIGHT) {
      remaining.unshift(Array(PLAYFIELD_WIDTH).fill(null));
    }

    this.board = remaining;
    return cleared;
  }

  _triggerGameOver() {
    if (this.gameOver) return;

    this.gameOver = true;
    this.softDrop = false;

    this.stopMusic();
    this.playEffect('gameover');

    this.awaitingName = true;
    this.newHighscore = true;
    this.nameInput = '';
  }

  submitHighscoreName() {
    if (!this.awaitingName || this.savedScore) return;

    const name = this.nameInput.trim() || 'Spiller';

    this.scoreTable = saveHighscore(name, this.score);

    this.awaitingName = false;
    this.savedScore = true;
    this.newHighscore = true;
  }

  moveLeft() {
    if (this.gameOver) return;

    const trial = this.currentPiece.moved(-1, 0);

    if (this._valid(trial)) {
      this.currentPiece = trial;
      this.playEffect('move');
    }
  }

  moveRight() {
    if (this.gameOver) return;

    const trial = this.currentPiece.moved(1, 0);

    if (this._valid(trial)) {
      this.currentPiece = trial;
      this.playEffect('move');
    }
  }

  moveDown() {
    if (this.gameOver) return false;

    const trial = this.currentPiece.moved(0, 1);

    if (this._valid(trial)) {
      this.currentPiece = trial;
      return true;
    }

    this._lockPiece();
    return false;
  }

  hardDrop() {
    if (this.gameOver) return;

    let dropped = 0;

    while (this._valid(this.currentPiece.moved(0, 1))) {
      this.currentPiece = this.currentPiece.moved(0, 1);
      dropped++;
    }

    if (dropped > 0) {
      this.score += dropped * 2;
    }

    this.playEffect('harddrop');
    this._lockPiece();
  }

  rotate() {
    if (this.gameOver) return;

    const rotated = this.currentPiece.rotated();

    for (const dx of [0, -1, 1, -2, 2]) {
      const trial = rotated.moved(dx, 0);

      if (this._valid(trial)) {
        this.currentPiece = trial;
        this.playEffect('rotate');
        return;
      }
    }
  }

  update(dt) {
    this.sparklePhase += dt;

    if (this.gameOver) return;

    let speed = Math.max(0.09, 0.8 - (this.level - 1) * 0.06);

    if (this.softDrop) {
      speed = Math.max(0.03, speed * 0.16);
    }

    this.dropTimer += dt;

    if (this.dropTimer >= speed) {
      this.dropTimer = 0;
      this.moveDown();
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#fff6fa';
    ctx.fillRect(0, 0, 1000, 760);

    ctx.font = '38px Comic Sans MS';
    ctx.fillStyle = '#574968';
    ctx.fillText('Biancas Tetris', 430, 78);

    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);

    for (let row = 0; row < PLAYFIELD_HEIGHT; row++) {
      for (let col = 0; col < PLAYFIELD_WIDTH; col++) {
        ctx.strokeStyle = '#eedde8';
        ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

        const shape = this.board[row][col];
        if (shape) {
          this._drawBlock(ctx, col, row, COLORS[shape]);
        }
      }
    }

    let ghost = this.currentPiece;
    while (this._valid(ghost.moved(0, 1))) {
      ghost = ghost.moved(0, 1);
    }

    ctx.globalAlpha = 0.3;
    for (const [x, y] of ghost.cells()) {
      if (y >= 0) this._drawBlock(ctx, x, y, '#bfaedb');
    }
    ctx.globalAlpha = 1.0;

    for (const [x, y] of this.currentPiece.cells()) {
      if (y >= 0) this._drawBlock(ctx, x, y, COLORS[this.currentPiece.shape]);
    }

    ctx.restore();

    this._drawSidePanel(ctx);

    if (this.gameOver) {
      this._drawOverlay(ctx);
    }
  }

  _drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(
      x * BLOCK_SIZE + 2,
      y * BLOCK_SIZE + 2,
      BLOCK_SIZE - 4,
      BLOCK_SIZE - 4,
    );

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      x * BLOCK_SIZE + 2,
      y * BLOCK_SIZE + 2,
      BLOCK_SIZE - 4,
      BLOCK_SIZE - 4,
    );
  }

  _drawSidePanel(ctx) {
    ctx.save();

    ctx.font = '28px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Poeng: ' + this.score, 455, 150);
    ctx.fillText('Linjer: ' + this.lines, 455, 190);
    ctx.fillText('Level: ' + this.level, 455, 230);

    ctx.font = '22px Arial';
    ctx.fillText('Neste:', 455, 285);

    const matrix = this.nextPiece.matrix;

    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col] === 'X') {
          ctx.save();
          ctx.translate(455 + col * 28, 305 + row * 28);
          ctx.fillStyle = COLORS[this.nextPiece.shape];
          ctx.fillRect(0, 0, 24, 24);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, 24, 24);
          ctx.restore();
        }
      }
    }

    ctx.font = '22px Arial';
    ctx.fillText('Topp 5:', 455, 385);
    ctx.font = '16px Arial';

    let y = 415;

    if (!this.scoreTable || this.scoreTable.length === 0) {
      ctx.fillText('Ingen score ennå', 455, y);
    } else {
      for (let i = 0; i < this.scoreTable.length; i++) {
        const entry = this.scoreTable[i];
        ctx.fillText(`${i + 1}. ${entry.name}`, 455, y);
        ctx.fillText(String(entry.score), 650, y);
        ctx.fillText(entry.date || '', 720, y);
        y += 24;
      }
    }

    ctx.restore();
  }

  _drawOverlay(ctx) {
    ctx.save();

    ctx.globalAlpha = 0.88;
    ctx.fillStyle = '#fff0f7';
    ctx.fillRect(140, 200, 720, 300);

    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#ffadcc';
    ctx.lineWidth = 5;
    ctx.strokeRect(140, 200, 720, 300);

    ctx.font = '46px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Runde ferdig!', 360, 270);

    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffadcc';
    ctx.fillText('Poeng: ' + this.score, 440, 320);

    ctx.font = '20px Arial';

    if (this.awaitingName) {
      ctx.fillStyle = '#574968';
      ctx.fillText('Skriv navn og trykk Enter for å lagre.', 300, 360);
      ctx.fillText('Backspace sletter. Etter lagring: trykk R for ny runde.', 270, 390);

      ctx.strokeStyle = '#a3e5ff';
      ctx.strokeRect(360, 410, 280, 36);

      ctx.font = '22px Arial';
      ctx.fillStyle = this.nameInput ? '#574968' : '#aa99bb';
      ctx.fillText(this.nameInput || 'Skriv navn her', 370, 435);
    } else if (this.newHighscore) {
      ctx.fillStyle = '#574968';
      ctx.fillText('Score lagret! Trykk R for en ny runde.', 310, 370);
    } else {
      ctx.fillStyle = '#574968';
      ctx.fillText('Trykk R for en ny runde.', 360, 370);
    }

    ctx.restore();
  }
}