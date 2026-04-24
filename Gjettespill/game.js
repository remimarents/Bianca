// JavaScript-logikken for Biancas Gjettespill

document.addEventListener('DOMContentLoaded', () => {
    // Elementreferanser
    const setupScreen = document.getElementById('setup');
    const setupForm = document.getElementById('setupForm');
    const playerCountSelect = document.getElementById('playerCount');
    const playerNamesDiv = document.getElementById('playerNames');
    const gameScreen = document.getElementById('game');
    const roundInfo = document.getElementById('roundInfo');
    const turnInfo = document.getElementById('turnInfo');
    const guessField = document.getElementById('guessField');
    const guessButton = document.getElementById('guessButton');
    const feedback = document.getElementById('feedback');
    const scoreTableBody = document.querySelector('#scoreTable tbody');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayMessage = document.getElementById('overlayMessage');
    const nextRoundButton = document.getElementById('nextRoundButton');
    const gameOverScreen = document.getElementById('gameOver');
    const finalMessage = document.getElementById('finalMessage');
    const finalScoreTableBody = document.querySelector('#finalScoreTable tbody');
    const highscoreList = document.getElementById('highscoreList');
    const restartButton = document.getElementById('restartButton');
    const confettiCanvas = document.getElementById('confettiCanvas');
    const ctx = confettiCanvas.getContext('2d');

    // Spillets tilstand
    let players = [];
    let currentRound = 1;
    let totalRounds = 3;
    let maxNumber = 457;
    let secretNumber = 0;
    let currentPlayerIndex = 0;
    let confettiParticles = [];
    let confettiAnimationId = null;

    // Oppdater visningen av navnefelt avhengig av antall spillere
    playerCountSelect.addEventListener('change', () => {
        const count = parseInt(playerCountSelect.value, 10);
        Array.from(playerNamesDiv.querySelectorAll('.player-name-field')).forEach((div, idx) => {
            div.style.display = idx < count ? 'block' : 'none';
        });
    });

    // Start spillet når skjemaet sendes inn
    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Hent verdier fra skjemaet
        const count = parseInt(playerCountSelect.value, 10);
        players = [];
        for (let i = 0; i < count; i++) {
            const nameInput = document.getElementById(`player${i + 1}`);
            let name = nameInput.value.trim();
            if (!name) {
                name = `Spiller ${i + 1}`;
            }
            players.push({
                name: name.substring(0, 14),
                totalAttempts: 0,
                roundAttempts: 0,
                wins: 0
            });
        }
        maxNumber = Math.max(5, Math.min(999999, parseInt(document.getElementById('maxNumber').value, 10) || 457));
        totalRounds = Math.max(1, Math.min(20, parseInt(document.getElementById('rounds').value, 10) || 3));
        currentRound = 1;
        // Bytt til spill-skjermen og start første runde
        setupScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        gameScreen.style.display = 'block';
        startRound();
    });

    // Behandle gjetting
    guessButton.addEventListener('click', () => {
        const guessVal = parseInt(guessField.value, 10);
        if (isNaN(guessVal)) {
            feedback.textContent = 'Skriv inn et gyldig tall.';
            guessField.focus();
            return;
        }
        if (guessVal < 0 || guessVal > maxNumber) {
            feedback.textContent = `Tallet må være mellom 0 og ${maxNumber}.`;
            guessField.focus();
            return;
        }
        handleGuess(guessVal);
        guessField.focus();
    });

    // Neste runde
    nextRoundButton.addEventListener('click', () => {
        overlay.style.display = 'none';
        stopConfetti();
        currentRound++;
        if (currentRound > totalRounds) {
            endGame();
        } else {
            startRound();
            guessField.focus();
        }
    });

    // Restart-knapp
    restartButton.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        setupScreen.style.display = 'block';
    });

    // Start en runde
    function startRound() {
        // Tilbakestill rundevariabler
        players.forEach(player => {
            player.roundAttempts = 0;
        });
        secretNumber = Math.floor(Math.random() * (maxNumber + 1));
        currentPlayerIndex = 0;
        updateScoreTable();
        roundInfo.textContent = `Runde ${currentRound} av ${totalRounds}`;
        feedback.textContent = `Gjett et tall mellom 0 og ${maxNumber}.`;
        updateTurnInfo();
        guessField.value = '';
        guessField.focus();
        // Sørg for at Enter i guessField også trykker på Gjett
        guessField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                guessButton.click();
            }
        });
    }

    // Oppdater informasjon om hvilken spiller som har tur
    function updateTurnInfo() {
        const currentPlayer = players[currentPlayerIndex];
        turnInfo.textContent = `Tur: ${currentPlayer.name}`;
    }

    // Oppdater resultattabellen underveis
    function updateScoreTable() {
        scoreTableBody.innerHTML = '';
        players.forEach(player => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${player.name}</td><td>${player.roundAttempts}</td><td>${player.totalAttempts}</td><td>${player.wins}</td>`;
            scoreTableBody.appendChild(row);
        });
    }

    // Behandle gjetning
    function handleGuess(guess) {
        const player = players[currentPlayerIndex];
        player.totalAttempts++;
        player.roundAttempts++;
        if (guess < secretNumber) {
            feedback.textContent = `${player.name} gjettet ${guess}. For lavt!`;
            advanceTurn();
        } else if (guess > secretNumber) {
            feedback.textContent = `${player.name} gjettet ${guess}. For høyt!`;
            advanceTurn();
        } else {
            // Riktig
            player.wins++;
            overlayTitle.textContent = 'Riktig!';
            overlayMessage.textContent = `${player.name} fant riktig tall ${secretNumber} på ${player.roundAttempts} forsøk.`;
            overlay.style.display = 'flex';
            startConfetti();
        }
        updateScoreTable();
        guessField.value = '';
    }

    // Bytt til neste spiller
    function advanceTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        updateTurnInfo();
    }

    // Avslutt spillet og vis resultater
    function endGame() {
        gameScreen.style.display = 'none';
        gameOverScreen.style.display = 'block';
        // Finn vinner: flest seire, deretter færrest forsøk
        players.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (a.totalAttempts !== b.totalAttempts) return a.totalAttempts - b.totalAttempts;
            return a.name.localeCompare(b.name);
        });
        const winner = players[0];
        finalMessage.textContent = `Vinneren er ${winner.name} med ${winner.wins} riktige runder og ${winner.totalAttempts} forsøk totalt!`;
        // Vis sluttscoretabell
        finalScoreTableBody.innerHTML = '';
        players.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${p.name}</td><td>${p.totalAttempts}</td><td>${p.wins}</td>`;
            finalScoreTableBody.appendChild(row);
        });
        // Oppdater highscore
        updateHighscores(winner);
        renderHighscores();
    }

    // Lagre vinner i highscore-listen (lokal lagring)
    function updateHighscores(winner) {
        const stored = JSON.parse(localStorage.getItem('biancaHighscores') || '[]');
        stored.push({ name: winner.name, attempts: winner.totalAttempts, wins: winner.wins });
        // Sorter highscore: flest seire, deretter færrest forsøk, deretter navn
        stored.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (a.attempts !== b.attempts) return a.attempts - b.attempts;
            return a.name.localeCompare(b.name);
        });
        const trimmed = stored.slice(0, 10);
        localStorage.setItem('biancaHighscores', JSON.stringify(trimmed));
    }

    // Render highscore-listen
    function renderHighscores() {
        const stored = JSON.parse(localStorage.getItem('biancaHighscores') || '[]');
        highscoreList.innerHTML = '';
        stored.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = `${entry.name}: ${entry.wins} riktige, ${entry.attempts} forsøk`;
            highscoreList.appendChild(li);
        });
    }

    // Confetti-funksjoner
    function startConfetti() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        confettiCanvas.style.display = 'block';
        confettiParticles = [];
        const colors = ['#ad70ff', '#ff73c4', '#59c6ff', '#79d676', '#ffcd51', '#ff7078'];
        const count = 120;
        for (let i = 0; i < count; i++) {
            confettiParticles.push({
                x: Math.random() * confettiCanvas.width,
                y: Math.random() * confettiCanvas.height - confettiCanvas.height,
                r: 6 + Math.random() * 10,
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: 2 + Math.random() * 4,
                alpha: 1
            });
        }
        if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
        confettiAnimationId = requestAnimationFrame(confettiLoop);
    }

    function stopConfetti() {
        if (confettiAnimationId) cancelAnimationFrame(confettiAnimationId);
        confettiCanvas.style.display = 'none';
    }

    function confettiLoop() {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiParticles.forEach(p => {
            p.y += p.speed;
            p.alpha -= 0.01;
        });
        confettiParticles = confettiParticles.filter(p => p.alpha > 0);
        confettiParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(p.alpha, 0);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        });
        if (confettiParticles.length > 0) {
            confettiAnimationId = requestAnimationFrame(confettiLoop);
        }
    }

    // Initial rendering av name-felter
    playerCountSelect.dispatchEvent(new Event('change'));
});