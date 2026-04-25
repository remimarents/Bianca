const STORAGE_KEY = 'bianca_highscores';

export function saveHighscore(name, score, lines = 0, level = 1) {
  const scores = getHighscores();

  scores.push({
    name: String(name || 'Spiller').slice(0, 12),
    score: Number(score) || 0,
    lines: Number(lines) || 0,
    level: Number(level) || 1,
    date: new Date().toLocaleDateString('no-NO'),
  });

  scores.sort((a, b) => b.score - a.score);

  const top = scores.slice(0, 5);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(top));

  return top;
}

export function getHighscores() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(entry => entry && typeof entry === 'object')
      .map(entry => ({
        name: String(entry.name || 'Spiller').slice(0, 12),
        score: Number(entry.score) || 0,
        lines: Number(entry.lines) || 0,
        level: Number(entry.level) || 1,
        date: entry.date || '',
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch {
    return [];
  }
}
