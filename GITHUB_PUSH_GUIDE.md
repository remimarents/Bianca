# Slik publiserer du Biancas Tetris på GitHub Pages

1. **Opprett et nytt repository på GitHub**
   - Gå til https://github.com/new
   - Gi repoet et navn, f.eks. `biancas-tetris-web`
   - Ikke huk av for README, .gitignore eller lisens (vi legger til filene selv)

2. **Åpne terminalen i `web_tetris`-mappen**

3. **Initialiser git og legg til filene:**
   ```sh
   git init
   git add .
   git commit -m "Første versjon av Biancas Tetris web"
   git branch -M main
   ```

4. **Koble til GitHub-repoet:**
   ```sh
   git remote add origin https://github.com/<ditt-brukernavn>/<repo-navn>.git
   ```
   Bytt ut `<ditt-brukernavn>` og `<repo-navn>` med det du valgte på GitHub.

5. **Push til GitHub:**
   ```sh
   git push -u origin main
   ```

6. **Aktiver GitHub Pages:**
   - Gå til repoet på github.com
   - Velg "Settings" → "Pages"
   - Velg `main` branch og `/ (root)` som kilde
   - Trykk "Save"

7. **Spillet blir tilgjengelig på:**
   - `https://<ditt-brukernavn>.github.io/<repo-navn>/`

**Tips:**
- Hvis du gjør endringer senere, bruk bare:
  ```sh
  git add .
  git commit -m "Din melding"
  git push
  ```
- Husk å vente noen minutter etter aktivering av Pages før nettsiden er synlig.
