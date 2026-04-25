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
  O: [
    ['XX', 'XX'],
  ],
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
    this.moveHold = { left: 0, right: 0 };
    this.sparklePhase = 0;
    this.scoreTable = getHighscores();

    this.playMusic();
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
      if (x < 0 || x >= PLAYFIELD_WIDTH || y >= PLAYFIELD_HEIGHT) {
        return false;
      }

      if (y >= 0 && this.board[y][x]) {
        return false;
      }
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
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.softDrop = false;
    this.stopMusic();
    this.playEffect('gameover');

    // Be alltid om navn. Det gjør lagring tydelig og enklere å teste.
    this.awaitingName = true;
    this.newHighscore = true;
    this.nameInput = '';
  }

  submitHighscoreName() {
    if (!this.awaitingName || this.savedScore) {
      return;
    }

    const name = this.nameInput.trim() || 'Spiller';

    this.scoreTable = saveHighscore(name, this.score);

    this.awaitingName = false;
    this.savedScore = true;
    this.newHighscore = true;
  }

  moveLeft() {
    if (this.gameOver) {
      return;
    }

    const trial = this.currentPiece.moved(-1, 0);
    if (this._valid(trial)) {
      this.currentPiece = trial;
      this.playEffect('move');
    }
  }

  moveRight() {
    if (this.gameOver) {
      return;
    }

    const trial = this.currentPiece.moved(1, 0);
    if (this._valid(trial)) {
      this.currentPiece = trial;
      this.playEffect('move');
    }
  }

  moveDown() {
    if (this.gameOver) {
      return false;
    }

    const trial = this.currentPiece.moved(0, 1);
    if (this._valid(trial)) {
      this.currentPiece = trial;
      return true;
    }

    this._lockPiece();
    return false;
  }

  hardDrop() {
    if (this.gameOver) {
      return;
    }

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
    if (this.gameOver) {
      return;
    }

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

    if (this.gameOver) {
      return;
    }

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
    this._drawBackground(ctx);

    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    this._drawPlayfieldFrame(ctx);

    for (let row = 0; row < PLAYFIELD_HEIGHT; row++) {
      for (let col = 0; col < PLAYFIELD_WIDTH; col++) {
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

    ctx.globalAlpha = 0.22;
    for (const [x, y] of ghost.cells()) {
      if (y >= 0) {
        this._drawGhostBlock(ctx, x, y);
      }
    }
    ctx.globalAlpha = 1.0;

    for (const [x, y] of this.currentPiece.cells()) {
      if (y >= 0) {
        this._drawBlock(ctx, x, y, COLORS[this.currentPiece.shape]);
      }
    }

    ctx.restore();

    this._drawSidePanel(ctx);

    if (this.gameOver) {
      this._drawOverlay(ctx);
    }
  }

  _drawBackground(ctx) {
    const bg = ctx.createLinearGradient(0, 0, 1000, 760);
    bg.addColorStop(0, '#fff8fc');
    bg.addColorStop(0.55, '#f9f0ff');
    bg.addColorStop(1, '#eff9ff');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1000, 760);

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(150, 90, 120, 0, Math.PI * 2);
    ctx.arc(865, 670, 170, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#ffd1e8';
    ctx.beginPath();
    ctx.arc(815, 130, 95, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#bde9ff';
    ctx.beginPath();
    ctx.arc(280, 690, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.font = 'bold 42px Comic Sans MS, Arial';
    ctx.fillStyle = '#574968';
    ctx.shadowColor = 'rgba(255, 145, 205, 0.35)';
    ctx.shadowBlur = 10;
    ctx.fillText('Biancas Tetris', 430, 82);
    ctx.shadowBlur = 0;
  }

  _drawPlayfieldFrame(ctx) {
    const width = PLAYFIELD_WIDTH * BLOCK_SIZE;
    const height = PLAYFIELD_HEIGHT * BLOCK_SIZE;

    ctx.save();

    ctx.shadowColor = 'rgba(87, 73, 104, 0.20)';
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
    this._roundRect(ctx, -18, -18, width + 36, height + 36, 24);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const fieldGradient = ctx.createLinearGradient(0, 0, 0, height);
    fieldGradient.addColorStop(0, 'rgba(255, 250, 253, 0.96)');
    fieldGradient.addColorStop(1, 'rgba(249, 239, 255, 0.96)');
    ctx.fillStyle = fieldGradient;
    this._roundRect(ctx, -4, -4, width + 8, height + 8, 14);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 173, 204, 0.60)';
    ctx.lineWidth = 3;
    this._roundRect(ctx, -4, -4, width + 8, height + 8, 14);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(215, 180, 215, 0.34)';

    for (let col = 0; col <= PLAYFIELD_WIDTH; col++) {
      const x = col * BLOCK_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let row = 0; row <= PLAYFIELD_HEIGHT; row++) {
      const y = row * BLOCK_SIZE;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawBlock(ctx, x, y, color) {
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;
    const size = BLOCK_SIZE - 4;

    ctx.save();

    ctx.shadowColor = this._hexToRgba(color, 0.48);
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;

    const grad = ctx.createLinearGradient(px + 2, py + 2, px + size, py + size);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.10, color);
    grad.addColorStop(1, this._shadeColor(color, -18));

    ctx.fillStyle = grad;
    this._roundRect(ctx, px + 2, py + 2, size, size, 7);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, px + 3, py + 3, size - 2, size - 2, 6);
    ctx.stroke();

    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#ffffff';
    this._roundRect(ctx, px + 6, py + 5, size - 12, 6, 4);
    ctx.fill();

    ctx.restore();
  }

  _drawGhostBlock(ctx, x, y) {
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;

    ctx.save();
    ctx.strokeStyle = '#8e7bb0';
    ctx.lineWidth = 2;
    this._roundRect(ctx, px + 5, py + 5, BLOCK_SIZE - 10, BLOCK_SIZE - 10, 7);
    ctx.stroke();
    ctx.restore();
  }

  _drawMiniBlock(ctx, x, y, color) {
    ctx.save();

    const grad = ctx.createLinearGradient(x, y, x + 24, y + 24);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.12, color);
    grad.addColorStop(1, this._shadeColor(color, -14));

    ctx.fillStyle = grad;
    ctx.shadowColor = this._hexToRgba(color, 0.38);
    ctx.shadowBlur = 8;
    this._roundRect(ctx, x, y, 24, 24, 6);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, x + 1, y + 1, 22, 22, 5);
    ctx.stroke();

    ctx.restore();
  }

  _drawSidePanel(ctx) {
    ctx.save();

    this._drawPanelCard(ctx, 430, 112, 405, 138);
    this._drawPanelCard(ctx, 430, 270, 405, 100);
    this._drawPanelCard(ctx, 430, 390, 405, 185);

    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Poeng', 455, 152);
    ctx.fillText('Linjer', 455, 192);
    ctx.fillText('Level', 455, 232);

    ctx.textAlign = 'right';
    ctx.fillText(String(this.score), 800, 152);
    ctx.fillText(String(this.lines), 800, 192);
    ctx.fillText(String(this.level), 800, 232);
    ctx.textAlign = 'left';

    ctx.font = 'bold 23px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Neste brikke', 455, 307);

    const matrix = this.nextPiece.matrix;
    const previewX = 650;
    const previewY = 298;

    for (let row = 0; row < matrix.length; row++) {
      for (let col = 0; col < matrix[row].length; col++) {
        if (matrix[row][col] === 'X') {
          this._drawMiniBlock(
            ctx,
            previewX + col * 28,
            previewY + row * 28,
            COLORS[this.nextPiece.shape],
          );
        }
      }
    }

    ctx.font = 'bold 23px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Topp 5', 455, 428);

    ctx.font = '16px Arial';
    let y = 460;

    if (!this.scoreTable || this.scoreTable.length === 0) {
      ctx.fillStyle = '#8b7a9b';
      ctx.fillText('Ingen score ennå', 455, y);
    } else {
      for (let i = 0; i < this.scoreTable.length; i++) {
        const entry = this.scoreTable[i];

        ctx.fillStyle = i === 0 ? '#ff76ae' : '#574968';
        ctx.font = i === 0 ? 'bold 16px Arial' : '16px Arial';
        ctx.fillText(`${i + 1}. ${entry.name}`, 455, y);

        ctx.textAlign = 'right';
        ctx.fillText(String(entry.score), 690, y);
        ctx.fillStyle = '#8b7a9b';
        ctx.font = '15px Arial';
        ctx.fillText(entry.date || '', 805, y);
        ctx.textAlign = 'left';

        y += 26;
      }
    }

    ctx.restore();
  }

  _drawPanelCard(ctx, x, y, w, h) {
    ctx.save();

    ctx.shadowColor = 'rgba(87, 73, 104, 0.12)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 8;

    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    this._roundRect(ctx, x, y, w, h, 22);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 173, 204, 0.28)';
    ctx.lineWidth = 2;
    this._roundRect(ctx, x, y, w, h, 22);
    ctx.stroke();

    ctx.restore();
  }

  _drawOverlay(ctx) {
    ctx.save();

    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fff6fa';
    ctx.fillRect(0, 0, 1000, 760);

    ctx.globalAlpha = 1.0;
    ctx.shadowColor = 'rgba(87, 73, 104, 0.25)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    this._roundRect(ctx, 145, 200, 710, 305, 28);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = 'rgba(255, 118, 174, 0.7)';
    ctx.lineWidth = 4;
    this._roundRect(ctx, 145, 200, 710, 305, 28);
    ctx.stroke();

    ctx.font = 'bold 46px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Runde ferdig!', 345, 272);

    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#ff76ae';
    ctx.fillText('Poeng: ' + this.score, 420, 322);

    ctx.font = '20px Arial';
    ctx.fillStyle = '#574968';

    if (this.awaitingName) {
      ctx.fillText('Skriv navn og trykk Enter for å lagre.', 300, 362);
      ctx.fillStyle = '#8b7a9b';
      ctx.fillText('Backspace sletter. Etter lagring: trykk R for ny runde.', 265, 392);

      ctx.strokeStyle = '#8edcff';
      ctx.lineWidth = 3;
      this._roundRect(ctx, 360, 415, 280, 42, 12);
      ctx.stroke();

      ctx.font = '22px Arial';
      ctx.fillStyle = this.nameInput ? '#574968' : '#aa99bb';
      ctx.fillText(this.nameInput || 'Skriv navn her', 375, 443);
    } else if (this.newHighscore) {
      ctx.fillText('Score lagret! Trykk R for en ny runde.', 315, 372);
    } else {
      ctx.fillText('Trykk R for en ny runde.', 385, 372);
    }

    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  _shadeColor(hex, percent) {
    const value = hex.replace('#', '');
    const number = parseInt(value, 16);

    const r = Math.max(0, Math.min(255, (number >> 16) + percent));
    const g = Math.max(0, Math.min(255, ((number >> 8) & 0x00ff) + percent));
    const b = Math.max(0, Math.min(255, (number & 0x0000ff) + percent));

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b)
      .toString(16)
      .slice(1);
  }

  _hexToRgba(hex, alpha) {
    const value = hex.replace('#', '');
    const number = parseInt(value, 16);
    const r = number >> 16;
    const g = (number >> 8) & 0x00ff;
    const b = number & 0x0000ff;

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

}