# Biancas Tetris

En liten Tetris-klone laget for Windows-laptop, med:

- lyd
- topp 5 highscore lagret lokalt med navn
- myke, fargerike farger som passer godt for Bianca

## Start pa Windows

Dobbelklikk:

`start_biancas_tetris.bat`

Batch-filen prover a installere `pygame` automatisk hvis det mangler.

## Manuell start

```powershell
python -m pip install -r requirements.txt
python tetris_bianca.py
```

## Kontroller

- Venstre/Hoyre pil: flytt blokken
- Pil opp: roter
- Pil ned: fa blokken til a falle raskere
- Mellomrom: slipp blokken helt ned
- R: start ny runde
- Esc: avslutt

## Highscore

Topp 5 lagres i:

`bianca_highscores.json`

Hvis en spiller kommer inn pa topp 5, kan hun skrive navnet sitt og trykke `Enter` for a lagre scoren.
