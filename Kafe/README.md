# Biancas kafé

Publisert på https://biancanoor.no/kafe/ . Norsk mattespill med seks bestillinger per vakt, tre nivåer, hint og kafémynter til dekorasjoner.

## Spillmåter
- Alene: seks bestillinger; nivåforslag etter vakten.
- Én telefon: to spillere bytter på; samarbeid eller konkurranse.
- To telefoner: privat rom, firesifret kode og SMS-lenke. To spillere, samarbeid eller konkurranse. Ingen hastighetsbonus.

## Drift
Krever PHP 8.1+ for nettspill. Statisk frontend fungerer for lokale spill. GitHub Pages sender besøkende videre til produksjonsadressen fordi Pages ikke kjører PHP.

Kilde: denne mappen. Publiser filene til Gigahost webhotell 409, `/domains/biancanoor.no/public_html/kafe/`. Hjemmesiden finnes i søstermappen Hjemmeside og publiseres til domenets public_html. Ikke publiser README eller tests.

Rom lagres med fillås utenfor offentlig rot, i `/domains/biancanoor.no/.bianca-cafe-rooms/`. Rom utløper etter 24 timer; utløpte filer ryddes ved senere opprettelse/påmelding. Romkode brukes kun til påmelding, og hver spiller får eget hemmelig token for videre handlinger. Rommet stenges for nye spillere når to er med. API har grense på opprettelser og påmeldingsforsøk, validering og samme-opprinnelse-kontroll.

Bare kallenavn, oppgaver og spillfremgang inngår i rommet. Kafémynter og pynt lagres lokalt på hver telefon. Store-/API-nøkler skal aldri legges i repoet. API-et bruker ingen eksterne tjenestenøkler.

## Kontroll 17. november 2026
Chrome/Playwright: hel alenerunde med feil/hint, hele turvise runder, kjøp av pynt, to separate nettleserøkter gjennom en hel felles vakt, SMS-lenke/firesifret kode, responsivt ved 320/390/768/1440 px. PHP-syntaks og duplikate svar/neste-forespørsler kontrollert.

## Spillopplevelse, versjon 3
- Hurtigstart fra første mobilskjerm.
- Illustrert kafé, store svarvalg og valgfritt talltastatur.
- Serveringsanimasjon, myntfeiring, sluttkonfetti og 1–3 stjerner.
- Syntetiserte korte lyder med tydelig lydknapp; lydvalg lagres lokalt. Ingen lyd før brukerhandling.
- Respekterer redusert bevegelse.
- Synlig sparemål for neste dekorasjon. Ingen kjøp med ekte penger, tidsfrister eller hastighetsbonus.
