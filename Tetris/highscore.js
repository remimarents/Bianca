const KEY = "biancas-tetris-highscores";

export function getHighscores() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveHighscore(name, score) {
  const list = getHighscores();
  list.push({ name, score });
  list.sort((a, b) => b.score - a.score);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 5)));
}