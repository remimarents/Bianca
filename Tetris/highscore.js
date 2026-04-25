const STORAGE_KEY = 'bianca_highscores';

function readStoredScores() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Highscore is nice to have; the game should still work if storage is blocked.
  }
}

export function saveHighscore(name, score) {
  const scores = getHighscores();

  scores.push({
    name: String(name || 'Spiller').trim().slice(0, 12) || 'Spiller',
    score: Number(score) || 0,
    date: new Date().toLocaleDateString('no-NO'),
  });

  scores.sort((a, b) => b.score - a.score);

  const top = scores.slice(0, 5);
  writeStoredScores(top);

  return top;
}

export function getHighscores() {
  const raw = readStoredScores();

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
