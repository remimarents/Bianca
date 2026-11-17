"use strict";

const sounds = new window.BingoSounds();
document.addEventListener("visibilitychange", () => { if (document.hidden) sounds.stop(); });

const storageKey = "bilbingo.state.v1";
const setupKey = "bilbingo.setup.v1";
const highscoreKey = "bilbingo.highscore.v1";

const colors = [
  { id: "red", name: "Rød", hex: "#f53434", points: 1, text: "#fff" },
  { id: "blue", name: "Blå", hex: "#1888ff", points: 1, text: "#fff" },
  { id: "green", name: "Grønn", hex: "#3cc43f", points: 2 },
  { id: "yellow", name: "Gul", hex: "#ffe04a", points: 2 },
  { id: "orange", name: "Oransje", hex: "#ff8c1a", points: 2 },
  { id: "pink", name: "Rosa", hex: "#ff65b5", points: 3 },
  { id: "purple", name: "Lilla", hex: "#8d45ff", points: 3, text: "#fff" },
  { id: "turquoise", name: "Turkis", hex: "#18d4c0", points: 2 },
  { id: "white", name: "Hvit", hex: "#f8f8f2", points: 1 },
  { id: "black", name: "Svart", hex: "#17191f", points: 1, text: "#fff" }
];

const carTypes = [
  { id: "hatchback", name: "Hatchback", src: "assets/car-hatchback.png" },
  { id: "suv", name: "SUV", src: "assets/car-suv.png" },
  { id: "pickup", name: "Pickup", src: "assets/car-pickup.png" },
  { id: "sport", name: "Sport", src: "assets/car-sport.png" }
];

let state = {
  screen: "setup",
  playerCount: 2,
  totalRounds: 3,
  pointGoal: 10,
  currentRound: 1,
  players: [],
  log: [],
  roundHistory: [],
  adultMode: false,
  locks: {}
};

let scoreTapGuard = {
  playerId: null,
  at: 0
};

const $ = (selector) => document.querySelector(selector);
const screens = {
  setup: $("#setupScreen"),
  color: $("#colorScreen"),
  game: $("#gameScreen"),
  winner: $("#winnerScreen")
};

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function saveSetup() {
  localStorage.setItem(setupKey, JSON.stringify({
    playerCount: state.playerCount,
    totalRounds: state.totalRounds,
    pointGoal: state.pointGoal,
    players: state.players.map(({ name, color, car }) => ({ name, color, car }))
  }));
}

function loadSetup() {
  try {
    return JSON.parse(localStorage.getItem(setupKey)) || null;
  } catch {
    return null;
  }
}

function showScreen(name) {
  state.screen = name;
  Object.entries(screens).forEach(([key, el]) => el.classList.toggle("is-active", key === name));
  saveState();
}

function colorById(id) {
  return colors.find((color) => color.id === id) || colors[0];
}

function carById(id) {
  return carTypes.find((car) => car.id === id) || carTypes[0];
}

function defaultPlayers(count) {
  const saved = loadSetup();
  const names = ["Bianca", "Remi", "William", "Sandra"];
  return Array.from({ length: count }, (_, index) => {
    const old = saved?.players?.[index];
    return {
      id: cryptoId(),
      name: old?.name || names[index] || `Spiller ${index + 1}`,
      color: old?.color || colors[index].id,
      car: old?.car || carTypes[index % carTypes.length].id,
      roundPoints: 0,
      totalPoints: 0
    };
  });
}

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function renderNameFields() {
  const count = Number($("#playerCount").value);
  const saved = loadSetup();
  const wrap = $("#nameFields");
  wrap.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const label = document.createElement("label");
    label.className = "field";
    label.innerHTML = `<span>Spiller ${i + 1}</span><input name="playerName" maxlength="18" autocomplete="off" value="${escapeHtml(saved?.players?.[i]?.name || ["Bianca", "Remi", "William", "Sandra"][i] || "")}">`;
    wrap.append(label);
  }
}

function renderColorForm() {
  const form = $("#colorForm");
  form.innerHTML = "";
  state.players.forEach((player, index) => {
    const colorButtons = colors.map((color) => `
      <button type="button" class="color-choice ${player.color === color.id ? "is-selected" : ""}" data-color="${color.id}" data-player="${index}" style="--c:${color.hex};--text:${color.text || "#102033"}">${color.name}</button>
    `).join("");
    const carButtons = carTypes.map((car) => `
      <button type="button" class="car-choice ${player.car === car.id ? "is-selected" : ""}" data-car="${car.id}" data-player="${index}">
        <img src="${car.src}" alt=""><span>${car.name}</span>
      </button>
    `).join("");
    const block = document.createElement("section");
    block.className = "player-option glass";
    block.innerHTML = `
      <h3>${escapeHtml(player.name)}</h3>
      <div class="color-grid">${colorButtons}</div>
      <div class="car-grid">${carButtons}</div>
    `;
    form.append(block);
  });
  const submit = document.createElement("button");
  submit.className = "primary";
  submit.type = "submit";
  submit.textContent = "Start runde 1";
  form.append(submit);
}

function startGame() {
  sounds.play("start");
  state.currentRound = 1;
  state.log = [];
  state.roundHistory = [];
  state.adultMode = false;
  state.locks = {};
  state.players = state.players.map((player) => ({ ...player, roundPoints: 0, totalPoints: 0 }));
  saveSetup();
  renderGame();
  showScreen("game");
}

function renderGame() {
  $("#roundLabel").textContent = `Runde ${state.currentRound} / ${state.totalRounds}`;
  $("#lastFound").textContent = state.log[0]?.text || "Klar til første funn.";
  const cards = $("#playerCards");
  cards.innerHTML = "";
  state.players.forEach((player) => {
    const color = colorById(player.color);
    const car = carById(player.car);
    const silhouettes = {
      hatchback: "M22 72 L31 51 L66 45 L88 20 Q94 14 106 14 H155 Q163 14 172 25 L188 45 L211 52 Q221 55 221 67 V81 H19 V72Z",
      suv: "M20 76 V49 L58 43 L77 12 H164 L191 43 H217 V81 H20Z",
      pickup: "M20 78 V49 H65 L85 15 H133 L150 45 H219 V81 H20Z",
      sport: "M19 76 L35 58 L77 48 L103 31 H149 L177 49 L215 57 L224 81 H19Z"
    };
    const windows = car.id === "sport" ? "M89 48 L108 36 H121 V48Z M127 36 H147 L164 48 H127Z" : car.id === "pickup" ? "M78 43 L91 23 H119 V43Z M125 23 H128 L141 43 H125Z" : "M79 44 L97 22 H116 V44Z M124 22 H151 Q158 22 163 29 L175 44 H124Z";
    const card = document.createElement("section");
    card.className = "player-card glass";
    card.id = `card-${player.id}`;
    card.style.setProperty("--car-color", color.hex);
    card.innerHTML = `
      <div class="card-top">
        <div>
          <h3>${escapeHtml(player.name)}</h3>
          <span class="badge">${color.name} bil - ${color.points} poeng</span>
        </div>
        <span class="badge">${car.name}</span>
      </div>
      <div class="car-stage"><svg class="car-img" viewBox="0 0 240 110" role="img" aria-label="${color.name} ${car.name}"><ellipse cx="120" cy="91" rx="101" ry="8" fill="#132b4020"/><path d="${silhouettes[car.id] || silhouettes.hatchback}" fill="var(--car-color)" stroke="#183048" stroke-width="3"/><path d="${windows}" fill="#d8f2ff" stroke="#183048" stroke-width="2"/><path d="M27 60H46 M198 60H215" stroke="#fff7c9" stroke-width="7" stroke-linecap="round"/><path d="M130 52H143" stroke="#183048" stroke-width="3" stroke-linecap="round"/><g fill="#233044" stroke="#e1e9ef" stroke-width="4"><circle cx="62" cy="81" r="17"/><circle cx="180" cy="81" r="17"/></g><g fill="#a8bfd0"><circle cx="62" cy="81" r="7"/><circle cx="180" cy="81" r="7"/></g></svg></div>
      <div class="points-row">
        <div>Runden<strong>${player.roundPoints}</strong></div>
        <div>Totalt<strong>${player.totalPoints}</strong></div>
      </div>
      <button class="spot-btn" type="button" data-score="${player.id}">Jeg så ${color.name.toLowerCase()} bil!</button>
    `;
    cards.append(card);
  });
  renderAdultPanel();
  saveState();
}

function addPoint(playerId) {
  const now = Date.now();
  if (scoreTapGuard.playerId === playerId && now - scoreTapGuard.at < 250) return;
  scoreTapGuard = { playerId, at: now };

  const player = state.players.find((item) => item.id === playerId);
  if (!player) return;
  const color = colorById(player.color);
  player.roundPoints += color.points;
  player.totalPoints += color.points;
  const text = `${player.name} så ${color.name.toLowerCase()} bil og fikk ${color.points} poeng!`;
  state.log.unshift({ playerId, points: color.points, round: state.currentRound, text });
  if (!state.pointGoal || player.totalPoints < state.pointGoal) sounds.play("found", color.points);
  renderGame();
  const card = document.getElementById(`card-${playerId}`);
  if (card) {
    card.classList.add("bump");
    setTimeout(() => card.classList.remove("bump"), 480);
  }
  if (state.pointGoal && player.totalPoints >= state.pointGoal) finishGame();
}

function undoLast() {
  const last = state.log.shift();
  if (!last) return;
  sounds.play("undo");
  const player = state.players.find((item) => item.id === last.playerId);
  if (player) {
    player.roundPoints = Math.max(0, player.roundPoints - last.points);
    player.totalPoints = Math.max(0, player.totalPoints - last.points);
  }
  renderGame();
}

function nextRound() {
  state.roundHistory.push({
    round: state.currentRound,
    scores: state.players.map((player) => ({ id: player.id, points: player.roundPoints }))
  });
  if (state.currentRound >= state.totalRounds) {
    finishGame();
    return;
  }
  sounds.play("round");
  state.currentRound += 1;
  state.players.forEach((player) => {
    player.roundPoints = 0;
  });
  state.log = [];
  renderGame();
}

function finishGame() {
  if (state.screen === "winner" || !state.players.length) return;
  sounds.play("win");
  const ranked = [...state.players].sort((a, b) => b.totalPoints - a.totalPoints);
  const winner = ranked[0];
  $("#winnerTitle").textContent = `${winner.name} vant!`;
  $("#winnerMeta").textContent = `${state.currentRound} runde${state.currentRound === 1 ? "" : "r"} spilt.`;
  $("#scoreList").innerHTML = ranked.map((player, index) => `<li>${index + 1}. ${escapeHtml(player.name)} - ${player.totalPoints} poeng</li>`).join("");
  saveHighscore(winner);
  renderHighscore();
  saveSetup();
  showScreen("winner");
}

function saveHighscore(winner) {
  const highscores = readHighscores();
  highscores.push({ name: winner.name, points: winner.totalPoints, rounds: state.currentRound, date: new Date().toISOString() });
  highscores.sort((a, b) => b.points - a.points);
  localStorage.setItem(highscoreKey, JSON.stringify(highscores.slice(0, 5)));
}

function readHighscores() {
  try {
    return JSON.parse(localStorage.getItem(highscoreKey)) || [];
  } catch {
    return [];
  }
}

function renderHighscore() {
  const highscores = readHighscores();
  $("#highscoreBox").innerHTML = highscores.length
    ? `<strong>Highscore</strong><br>${highscores.map((score) => `${escapeHtml(score.name)} ${score.points}p`).join(" - ")}`
    : "Ingen highscore enda.";
}

function renderAdultPanel() {
  $("#adultPanel").hidden = !state.adultMode;
  if (!state.adultMode) return;
  $("#adultControls").innerHTML = state.players.map((player) => `
    <div class="adult-row">
      <span>${escapeHtml(player.name)}: ${player.totalPoints}p</span>
      <button type="button" data-adjust="${player.id}" data-delta="-1">-</button>
      <button type="button" data-adjust="${player.id}" data-delta="1">+</button>
    </div>
  `).join("");
}

function resetRound() {
  sounds.play("undo");
  state.players.forEach((player) => {
    player.totalPoints -= player.roundPoints;
    player.roundPoints = 0;
  });
  state.log = [];
  renderGame();
}

function resetWholeGame() {
  sounds.play("undo");
  state.currentRound = 1;
  state.log = [];
  state.roundHistory = [];
  state.players.forEach((player) => {
    player.roundPoints = 0;
    player.totalPoints = 0;
  });
  renderGame();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function bindEvents() {
  $("#playerCount").addEventListener("change", renderNameFields);
  $("#setupForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const names = [...document.querySelectorAll("input[name='playerName']")].map((input, index) => input.value.trim() || `Spiller ${index + 1}`);
    state.playerCount = Number($("#playerCount").value);
    state.totalRounds = Number($("#roundCount").value);
    state.pointGoal = Number($("#pointGoal").value);
    state.players = defaultPlayers(state.playerCount).map((player, index) => ({ ...player, name: names[index] }));
    renderColorForm();
    sounds.play("select");
    showScreen("color");
  });

  $("#colorForm").addEventListener("click", (event) => {
    const colorBtn = event.target.closest("[data-color]");
    const carBtn = event.target.closest("[data-car]");
    if (colorBtn) {
      sounds.play("select");
      state.players[Number(colorBtn.dataset.player)].color = colorBtn.dataset.color;
      renderColorForm();
    }
    if (carBtn) {
      sounds.play("car");
      state.players[Number(carBtn.dataset.player)].car = carBtn.dataset.car;
      renderColorForm();
    }
  });

  $("#colorForm").addEventListener("submit", (event) => {
    event.preventDefault();
    startGame();
  });

  document.addEventListener("click", (event) => {
    const back = event.target.closest("[data-back]");
    if (back) { sounds.play("select"); showScreen(back.dataset.back); }
    const score = event.target.closest("[data-score]");
    if (score) {
      event.preventDefault();
      event.stopPropagation();
      addPoint(score.dataset.score);
    }
    const adjust = event.target.closest("[data-adjust]");
    if (adjust) {
      const player = state.players.find((item) => item.id === adjust.dataset.adjust);
      const delta = Number(adjust.dataset.delta);
      if (player) {
        sounds.play("select");
        player.totalPoints = Math.max(0, player.totalPoints + delta);
        player.roundPoints = Math.max(0, player.roundPoints + delta);
        renderGame();
      }
    }
  });

  $("#undoBtn").addEventListener("click", undoLast);
  $("#nextRoundBtn").addEventListener("click", nextRound);
  $("#finishBtn").addEventListener("click", finishGame);
  $("#resetRound").addEventListener("click", resetRound);
  $("#resetGame").addEventListener("click", resetWholeGame);
  $("#replayBtn").addEventListener("click", startGame);
  $("#newGameBtn").addEventListener("click", () => {
    sounds.play("select");
    localStorage.removeItem(storageKey);
    state = { ...state, screen: "setup", players: [], log: [], adultMode: false };
    hydrateSetup();
    showScreen("setup");
  });

  let holdTimer = null;
  $("#titleHold").addEventListener("pointerdown", () => {
    holdTimer = setTimeout(() => {
      state.adultMode = !state.adultMode;
      renderGame();
      if (state.screen !== "game") showScreen("game");
    }, 2000);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((type) => {
    $("#titleHold").addEventListener(type, () => clearTimeout(holdTimer));
  });
}

function hydrateSetup() {
  const saved = loadSetup();
  if (saved) {
    $("#playerCount").value = String(saved.playerCount || 2);
    $("#roundCount").value = String(saved.totalRounds || 3);
    $("#pointGoal").value = String(saved.pointGoal ?? 10);
  }
  renderNameFields();
}

function init() {
  hydrateSetup();
  bindEvents();
  showScreen("setup");
}

init();
