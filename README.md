# Bianca

Samlet repo for Biancas små spill og apper.

## Struktur

- `BarnasMagiskeRom/`
  Barnevennlig meny for mobil og deling.
- `Bilbingo/`
  Ferdig webapp.
- `Gjettespill/`
  Ferdig webapp.
- `Tetris/`
  Ferdig webapp.
- `MagiskMikrofon/`
  App under arbeid med backend-avhengigheter. Mobilkontroll ligger i roten, enkel bilvisning i `MagiskMikrofon/bil/`.
- `SporsmalsLab/`
  App under arbeid med backend-avhengigheter.
- `Pipeline/`
  Katalog over planlagte og pågående prosjekter.

## Publisering

Repoet er lagt opp for GitHub Pages fra rotmappen.

- `index.html` er hovedkatalogen for alt som er ferdig og tilgjengelig.
- `BarnasMagiskeRom/index.html` er den enkle menyen Bianca kan bruke på mobilen.
- `Pipeline/index.html` viser hva som er under arbeid.

## Retning videre

- Nye spill og apper lages som webprosjekter.
- Python, `.exe` og lokale build-artifacts holdes utenfor repoet.
- Prosjekter flyttes til hovedkatalogen når de er klare til bruk og deling.

## Magisk Mikrofon

- `MagiskMikrofon/index.html` er en inngangsside for valg av variant.
- `MagiskMikrofon/mobil/index.html` er enkel og barnevennlig mobilversjon.
- `MagiskMikrofon/bil-kontroll/index.html` er mobilkontrollen for biloppsettet.
- `MagiskMikrofon/bil/index.html` er en lett bilvisning som bare leser live-state.
- `bil/` og `bil-kontroll/` er midlertidig låst og redirecter ikke lenger til live backend.
- Voksenmodus og brutalis hører bare hjemme i `MagiskMikrofon/bil-kontroll/`.
- Bilvisningen forventer at backend eksponerer siste live-payload som JSON via `GET` til samme state-endepunkt som brukes for live-data.
