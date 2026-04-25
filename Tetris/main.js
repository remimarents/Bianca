import { getHighscores, saveHighscore } from "./highscore.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const nextCanvas = document.getElementById("next");
const nextCtx = nextCanvas.getContext("2d");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const highscoresEl = document.getElementById("highscores");

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = {
  I: "#00e5ff",
  J: "#0077ff",
  L: "#ff8c00",
  O: "#fff200",
  S: "#39ff14",
  T: "#bf00ff",
  Z: "#ff1744",
};

const SHAPES = {
  I: [[1, 1, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
  O: [[1, 1], [1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  T: [[0, 1, 0], [1, 1, 1]],
  Z: [[1, 1, 0], [0, 1, 1]],
};

let board = createBoard();
let piece = randomPiece();
let nextPiece = randomPiece();
let score = 0;
let lines = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 850;
let lastTime = 0;
let gameOver = false;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const type = keys[Math.floor(Math.random() * keys.length)];
  return {
    type,
    shape: SHAPES[type].map(row => [...row]),
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
}

function rotate(matrix) {
  return matrix[0].map((_, i) => matrix.map(row => row[i]).reverse());
}

function collides(p = piece) {
  for (let y = 0; y < p.shape.length; y++) {
    for (let x = 0; x < p.shape[y].length; x++) {
      if (!p.shape[y][x]) continue;
      const bx = p.x + x;
      const by = p.y + y;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function merge() {
  piece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) board[piece.y + y][piece.x + x] = piece.type;
    });
  });
}

function clearLines() {
  let cleared = 0;

  outer:
  for (let y = ROWS - 1; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      if (!board[y][x]) continue outer;
    }

    board.splice(y, 1);
    board.unshift(Array(COLS).fill(null));
    cleared++;
    y++;
  }

  if (cleared > 0) {
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(120, 850 - (level - 1) * 70);
  }
}

function resetPiece() {
  piece = nextPiece;
  nextPiece = randomPiece();

  if (collides(piece)) {
    gameOver = true;
    saveHighscore("Bianca", score);
    renderHighscores();
  }
}

function move(dir) {
  piece.x += dir;
  if (collides()) piece.x -= dir;
}

function softDrop() {
  piece.y++;
  if (collides()) {
    piece.y--;
    merge();
    clearLines();
    resetPiece();
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collides()) piece.y++;
  piece.y--;
  merge();
  clearLines();
  resetPiece();
  dropCounter = 0;
}

function rotatePiece() {
  const oldShape = piece.shape;
  const oldX = piece.x;

  piece.shape = rotate(piece.shape);

  for (const offset of [0, -1, 1, -2, 2]) {
    piece.x = oldX + offset;
    if (!collides()) return;
  }

  piece.shape = oldShape;
  piece.x = oldX;
}

function drawBlock(context, x, y, color, size = BLOCK) {
  context.fillStyle = color;
  context.fillRect(x * size, y * size, size, size);

  context.strokeStyle = "rgba(255,255,255,0.75)";
  context.lineWidth = 3;
  context.strokeRect(x * size + 2, y * size + 2, size - 4, size - 4);

  context.strokeStyle = "rgba(0,0,0,0.35)";
  context.lineWidth = 2;
  context.strokeRect(x * size, y * size, size, size);
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK, 0);
    ctx.lineTo(x * BLOCK, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK);
    ctx.lineTo(canvas.width, y * BLOCK);
    ctx.stroke();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  board.forEach((row, y) => {
    row.forEach((type, x) => {
      if (type) drawBlock(ctx, x, y, COLORS[type]);
    });
  });

  piece.shape.forEach((row, y) => {
    row.forEach(value => value);
    row.forEach((value, x) => {
      if (value) drawBlock(ctx, piece.x + x, piece.y + y, COLORS[piece.type]);
    });
  });

  if (gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff200";
    ctx.font = "bold 34px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
  }
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const size = 22;
  const offsetX = 1;
  const offsetY = 1;

  nextPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) drawBlock(nextCtx, x + offsetX, y + offsetY, COLORS[nextPiece.type], size);
    });
  });
}

function updateUi() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function renderHighscores() {
  const list = getHighscores();
  highscoresEl.innerHTML = "";

  if (list.length === 0) {
    highscoresEl.innerHTML = "<li>Ingen score ennå</li>";
    return;
  }

  for (const item of list) {
    const li = document.createElement("li");
    li.textContent = `${item.name}: ${item.score}`;
    highscoresEl.appendChild(li);
  }
}

function update(time = 0) {
  const delta = time - lastTime;
  lastTime = time;

  if (!gameOver) {
    dropCounter += delta;
    if (dropCounter > dropInterval) softDrop();
  }

  drawBoard();
  drawNext();
  updateUi();

  requestAnimationFrame(update);
}

function bindHoldButton(id, action, repeat = false) {
  const btn = document.getElementById(id);
  let timer = null;

  const start = (e) => {
    e.preventDefault();
    action();
    if (repeat) timer = setInterval(action, 95);
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  btn.addEventListener("pointerdown", start);
  btn.addEventListener("pointerup", stop);
  btn.addEventListener("pointercancel", stop);
  btn.addEventListener("pointerleave", stop);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
  if (e.key === "ArrowDown") softDrop();
  if (e.key === "ArrowUp") rotatePiece();
  if (e.key === " ") hardDrop();
});

bindHoldButton("leftBtn", () => move(-1), true);
bindHoldButton("rightBtn", () => move(1), true);
bindHoldButton("downBtn", softDrop, true);
bindHoldButton("rotateBtn", rotatePiece, false);
bindHoldButton("dropBtn", hardDrop, false);

document.getElementById("soundBtn").onclick = () => {};
document.getElementById("musicBtn").onclick = () => {};
document.getElementById("quitBtn").onclick = () => location.reload();

renderHighscores();
update();