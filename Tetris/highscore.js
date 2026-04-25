const STORAGE_KEY = 'bianca_highscores';

export function saveHighscore(name, score) {
  const scores = getHighscores();

  scores.push({
    name: String(name || 'Spiller').trim().slice(0, 12) || 'Spiller',
    score: Number(score) || 0,
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
      .map(entry => ({
        name: String(entry?.name || 'Spiller').slice(0, 12),
        score: Number(entry?.score) || 0,
        date: String(entry?.date || ''),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  } catch {
    return [];
  }
}
