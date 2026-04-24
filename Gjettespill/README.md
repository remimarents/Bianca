# Biancas Gjettespill

## Om spillet

Turbasert gjettespill for 1–4 spillere. Støtter norske bokstaver, lyd, konfetti, highscore og kan bygges til .exe. Alle meldinger og UI er på norsk.

## Starte spillet

1. Installer avhengigheter:
   ```
   python -m pip install -r requirements.txt
   ```
2. Start spillet:
   ```
   python biancas_gjettespill.py
   ```

## Bygge til .exe (Windows)

1. Installer PyInstaller:
   ```
   python -m pip install pyinstaller
   ```
2. Kjør:
   ```
   pyinstaller ^
   --onefile ^
   --windowed ^
   --name "Biancas_Gjettespill" ^
   --icon assets\gjettespill_icon.ico ^
   --add-data "assets;assets" ^
   biancas_gjettespill.py
   ```

## Filer som kreves

- biancas_gjettespill.py
- requirements.txt
- assets/gjettespill_icon.ico
- assets/sounds/correct.wav (valgfritt)
- assets/sounds/wrong.wav (valgfritt)
- assets/sounds/win.wav (valgfritt)

## Highscore

Highscore lagres automatisk i brukerens hjemmemappe:
```
%USERPROFILE%\Biancas_Gjettespill\highscore.json
```

## Funksjoner

- 1–4 spillere
- Navn på spillere
- Valg av maks-tall og antall runder
- Turbasert gjetting
- Tilbakemelding: "For høyt", "For lavt", "Riktig!"
- Konfetti ved riktig svar (fade ut, maks 120 partikler)
- Lyd ved riktig/feil svar og vinner (robust mot manglende filer)
- Løpende resultattabell
- Highscore-tabell (topp 5, lagres i hjemmemappe)
- Norsk tekst og støtte for norske tegn
- Robust for bygging til .exe med PyInstaller

## Tips
- Lydfiler er valgfrie, men gir bedre opplevelse.
- Spillet fungerer også uten lyd.
