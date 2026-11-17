# Installerbare apper

Seks egne PWA-identiteter, med stabile adresser:

- `Hjemmeside` → https://biancanoor.no/ (scope `/`)
- `Hotell` → https://biancanoor.no/hotell/
- `Kafe` → https://biancanoor.no/kafe/
- `Gjettespill`, `Tetris`, `Bilbingo` → eksisterende GitHub Pages-adresser under `/Bianca/`.

Hver app har `manifest.webmanifest`, 192/512 px PNG-ikoner, 180 px Apple-ikon, `pwa.js` og egen `sw.js`. Ikonene er kvadratiske utsnitt/nedskaleringer av eksisterende publiserte spillkort. Ingen nye personbilder er publisert.

`install.js` er felles kilde til `pwa.js` i de seks mappene. Ved endringer kopieres den til hver mappe. Installering bruker nettleserens eget installasjonsvindu når det er tilgjengelig, ellers en dialog med iPhone/Android/PC-instruksjoner. Knappene skjules i standalone-modus.

Service worker henter alltid fra nettet og lagrer ingenting i Cache Storage. Bare navigasjon til appens nøyaktige startside får en lokal «uten nett»-side ved nettfeil. API, invitasjoner, cookies, privat HTML, bilder og andre ressurser caches ikke. Forsidens worker håndterer ikke navigasjon til spillenes undermapper. Appene krever nett; offline-spill er ikke lovet eller innført.

Hotellinvitasjonen åpnes først i Safari, deretter legges appen til. Moderne Safari kopierer cookies ved installasjon. App og nettleser kan ellers ha separate lagre; eksisterende lokal framgang flyttes ikke programmatisk. Ingen endringer i spillerbindinger, localStorage-nøkler eller serverdata.

## Publisering

GitHub Pages-spill publiseres fra main. For Gigahost lastes `manifest.webmanifest`, `pwa.js`, `sw.js` og `icons/` opp ved siden av forsiden eller spillet. HTML må lastes opp etter ressursene. Hotellets `game.html` og `style.css` forblir private; manifest, installasjonsskript, worker og ikoner er offentlige. Hotellets deploy-verktøy inkluderer disse filene. API-er og lagrede spill skal aldri overskrives ved PWA-publisering.

Referanser: https://web.dev/articles/install-criteria og https://webkit.org/blog/14787/webkit-features-in-safari-17-2/ .
