// Enkel highscore-lagring i LocalStorage
export function saveHighscore(name, score) {
  const scores = getHighscores();
  scores.push({ name: name.slice(0, 12), score, date: new Date().toLocaleDateString('no-NO') });
  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 5);
  localStorage.setItem('bianca_highscores', JSON.stringify(top));
  return top;
}

export function getHighscores() {
  const raw = localStorage.getItem('bianca_highscores');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
