  // --- Avslutt-funksjonalitet ---
  showExit = false;
  showExitScreen() {
    this.showExit = true;
  }
  drawExitScreen(ctx) {
    ctx.clearRect(0, 0, 920, 760);
    ctx.fillStyle = '#fff6fa';
    ctx.fillRect(0, 0, 920, 760);
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = '#574968';
    ctx.textAlign = 'center';
    ctx.fillText('TAKK FOR NÅ', 460, 200);
    // Logo
    const logo = document.getElementById('tetris-logo');
    if (logo) {
      ctx.drawImage(logo, 230, 240, 460, 120);
    }
    ctx.font = '28px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Spill på egen enhet:', 460, 400);
    ctx.font = '22px Arial';
    ctx.fillStyle = '#0077cc';
    ctx.fillText('https://ditt-tetris-url', 460, 440);
    // QR-kode
    const qr = document.getElementById('tetris-qr');
    if (qr) {
      ctx.drawImage(qr, 370, 470, 180, 180);
    }
    ctx.textAlign = 'left';
  }
// Lydklasse for Tetris-lyder
  draw(ctx) {
    if (this.showExit) {
      this.drawExitScreen(ctx);
      return;
    }
    // Bakgrunn
    ctx.fillStyle = '#fff6fa';
    ctx.fillRect(0, 0, 920, 760);
    // Tittel
    ctx.font = '42px Comic Sans MS';
    ctx.fillStyle = '#574968';
    ctx.fillText('Biancas Tetris', 400, 60);
    // Playfield
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    // Rutenett
    for (let row = 0; row < PLAYFIELD_HEIGHT; row++) {
      for (let col = 0; col < PLAYFIELD_WIDTH; col++) {
        ctx.strokeStyle = '#eedde8';
        ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        const shape = this.board[row][col];
        if (shape) this._drawBlock(ctx, col, row, COLORS[shape]);
      }
    }
    // Ghost piece
    let ghost = this.currentPiece;
    while (this._valid(ghost.moved(0, 1))) ghost = ghost.moved(0, 1);
    ctx.globalAlpha = 0.3;
    for (const [x, y] of ghost.cells()) {
      if (y >= 0) this._drawBlock(ctx, x, y, '#bfaedb');
    }
    ctx.globalAlpha = 1.0;
    // Current piece
    for (const [x, y] of this.currentPiece.cells()) {
      if (y >= 0) this._drawBlock(ctx, x, y, COLORS[this.currentPiece.shape]);
    }
    ctx.restore();
    // Sidepanel
    this._drawSidePanel(ctx);
    // Overlay/game over
    if (this.gameOver) this._drawOverlay(ctx);
  }
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
    const rots = PIECES[this.shape];
    return rots[this.rotation % rots.length];
  }
  cells() {
    const result = [];
    const mat = this.matrix;
    for (let row = 0; row < mat.length; row++) {
      for (let col = 0; col < mat[row].length; col++) {
        if (mat[row][col] === 'X') result.push([this.x + col, this.y + row]);
      }
    }
    return result;
  }
  rotated(dir = 1) {
    return new Tetromino(this.shape, (this.rotation + dir) % PIECES[this.shape].length, this.x, this.y);
  }
  moved(dx = 0, dy = 0) {
    return new Tetromino(this.shape, this.rotation, this.x + dx, this.y + dy);
  }
}

export class TetrisGame {
  constructor() {
    this.reset();
    this.awaitingName = false;
    this.nameInput = '';
    this.newHighscore = false;
    this.savedScore = false;
    this.scoreTable = getHighscores();
    this.softDrop = false;
    this.moveHold = { left: 0, right: 0 };
    this.dropTimer = 0;
    this.sparklePhase = 0;
  }

  reset() {
    this.board = Array.from({ length: PLAYFIELD_HEIGHT }, () => Array(PLAYFIELD_WIDTH).fill(null));
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
  }

  _fillBag() {
    this.bag = randomBag();
  }
  _nextPiece() {
    if (!this.bag || this.bag.length === 0) this._fillBag();
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
    const cleared = this._clearLines();
    this.score += SCORES_BY_LINES[cleared] * this.level;
    this.lines += cleared;
    this.level = 1 + Math.floor(this.lines / 10);
    this.currentPiece = this.nextPiece;
    this.nextPiece = this._nextPiece();
    if (!this._valid(this.currentPiece)) this._triggerGameOver();
  }
  _clearLines() {
    let remaining = this.board.filter(row => row.some(cell => !cell));
    const cleared = PLAYFIELD_HEIGHT - remaining.length;
    while (remaining.length < PLAYFIELD_HEIGHT) remaining.unshift(Array(PLAYFIELD_WIDTH).fill(null));
    this.board = remaining;
    return cleared;
  }
  _triggerGameOver() {
    if (!this.gameOver) {
      this.gameOver = true;
      if (!this.savedScore) {
        this.newHighscore = this._qualifies(this.score);
        this.awaitingName = this.newHighscore;
        if (!this.newHighscore) this.savedScore = true;
      }
    }
  }
  _qualifies(score) {
    const scores = getHighscores();
    return scores.length < 5 || score > (scores[scores.length - 1]?.score || 0);
  }
  submitHighscoreName() {
    if (!this.awaitingName || this.savedScore) return;
    this.scoreTable = saveHighscore(this.nameInput, this.score);
    this.awaitingName = false;
    this.savedScore = true;
  }

  moveLeft() {
    const trial = this.currentPiece.moved(-1, 0);
    if (this._valid(trial)) this.currentPiece = trial;
  }
  moveRight() {
    const trial = this.currentPiece.moved(1, 0);
    if (this._valid(trial)) this.currentPiece = trial;
  }
  moveDown() {
    const trial = this.currentPiece.moved(0, 1);
    if (this._valid(trial)) {
      this.currentPiece = trial;
      return true;
    }
    this._lockPiece();
    return false;
  }
  hardDrop() {
      if (this._valid(trial)) {
        this.currentPiece = trial;
        this.sound.play('move');
      }
    while (this._valid(this.currentPiece.moved(0, 1))) {
      this.currentPiece = this.currentPiece.moved(0, 1);
      dropped++;
      if (this._valid(trial)) {
        this.currentPiece = trial;
        this.sound.play('move');
      }
    this.score += dropped * 2;
    this._lockPiece();
  }
  rotate() {
    const rotated = this.currentPiece.rotated();
    for (const dx of [0, -1, 1, -2, 2]) {
      const trial = rotated.moved(dx, 0);
      if (this._valid(trial)) {
        this.currentPiece = trial;
        return;
      }
    }
  }

  update(dt) {
    if (this.gameOver) {
      this.sparklePhase += dt;
      this.sound.play('drop');
      this._lockPiece();
    }
    this.sparklePhase += dt;
    // Soft drop
    let speed = Math.max(0.09, 0.8 - (this.level - 1) * 0.06);
    if (this.softDrop) speed = Math.max(0.03, speed * 0.16);
    this.dropTimer += dt;
    if (this.dropTimer >= speed) {
          this.sound.play('rotate');
          return;
      this.moveDown();
    }
  }

  draw(ctx) {
    // Bakgrunn
    ctx.fillStyle = '#fff6fa';
    ctx.fillRect(0, 0, 920, 760);
    // Tittel
    ctx.font = '42px Comic Sans MS';
    ctx.fillStyle = '#574968';
    ctx.fillText('Biancas Tetris', 400, 60);
    // Playfield
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    // Rutenett
    for (let row = 0; row < PLAYFIELD_HEIGHT; row++) {
      for (let col = 0; col < PLAYFIELD_WIDTH; col++) {
        ctx.strokeStyle = '#eedde8';
        ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        const shape = this.board[row][col];
        if (shape) this._drawBlock(ctx, col, row, COLORS[shape]);
      }
    }
    // Ghost piece
    let ghost = this.currentPiece;
    while (this._valid(ghost.moved(0, 1))) ghost = ghost.moved(0, 1);
    ctx.globalAlpha = 0.3;
    for (const [x, y] of ghost.cells()) {
      if (y >= 0) this._drawBlock(ctx, x, y, '#bfaedb');
    }
    ctx.globalAlpha = 1.0;
    // Current piece
    for (const [x, y] of this.currentPiece.cells()) {
      if (y >= 0) this._drawBlock(ctx, x, y, COLORS[this.currentPiece.shape]);
    }
    ctx.restore();
    // Sidepanel
    this._drawSidePanel(ctx);
    // Overlay/game over
    if (this.gameOver) this._drawOverlay(ctx);
  }

  _drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
  }

  _drawSidePanel(ctx) {
    // Poeng, linjer, level
    ctx.save();
    ctx.font = '28px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Poeng: ' + this.score, 420, 140);
    ctx.fillText('Linjer: ' + this.lines, 420, 180);
    ctx.fillText('Level: ' + this.level, 420, 220);
    // Neste brikke
    ctx.font = '22px Arial';
    ctx.fillText('Neste:', 420, 270);
    const mat = this.nextPiece.matrix;
    for (let row = 0; row < mat.length; row++) {
      for (let col = 0; col < mat[row].length; col++) {
        if (mat[row][col] === 'X') {
          ctx.save();
          ctx.translate(420 + col * 28, 290 + row * 28);
          ctx.fillStyle = COLORS[this.nextPiece.shape];
          ctx.fillRect(0, 0, 24, 24);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, 0, 24, 24);
          ctx.restore();
        }
      }
    }
    // Highscore
    ctx.font = '22px Arial';
    ctx.fillText('Topp 5:', 420, 370);
    ctx.font = '18px Arial';
    let y = 400;
    if (!this.scoreTable || this.scoreTable.length === 0) {
      ctx.fillText('Ingen score ennå', 420, y);
    } else {
      for (let i = 0; i < this.scoreTable.length; i++) {
        const entry = this.scoreTable[i];
        ctx.fillText(`${i + 1}. ${entry.name} - ${entry.score}`, 420, y);
        ctx.fillText(entry.date, 540, y);
        y += 24;
      }
    }
    ctx.restore();
  }

  _drawOverlay(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#fff0f7';
    ctx.fillRect(100, 200, 720, 300);
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = '#ffadcc';
    ctx.lineWidth = 5;
    ctx.strokeRect(100, 200, 720, 300);
    ctx.font = '46px Arial';
    ctx.fillStyle = '#574968';
    ctx.fillText('Runde ferdig!', 320, 270);
    ctx.font = '28px Arial';
    ctx.fillStyle = '#ffadcc';
    ctx.fillText('Poeng: ' + this.score, 400, 320);
    ctx.font = '20px Arial';
    if (this.awaitingName) {
      ctx.fillStyle = '#574968';
      ctx.fillText('Ny highscore! Skriv inn navn og trykk Enter.', 220, 360);
      ctx.fillText('Backspace sletter. R starter ny runde senere.', 220, 390);
      ctx.strokeStyle = '#a3e5ff';
      ctx.strokeRect(320, 410, 280, 36);
      ctx.font = '22px Arial';
      ctx.fillStyle = this.nameInput ? '#574968' : '#aa99bb';
      ctx.fillText(this.nameInput || 'Skriv navn her', 330, 435);
    } else if (this.newHighscore) {
      ctx.fillStyle = '#574968';
      ctx.fillText('Highscore lagret! Trykk R for ny runde.', 250, 370);
    } else {
      ctx.fillStyle = '#574968';
      ctx.fillText('Trykk R for ny runde.', 320, 370);
    }
    ctx.restore();
  }
}
