# Hotellet vårt

Privat samarbeidsspill på https://biancanoor.no/hotell/ for Bianca, Leandra og Rebecca. Ingen åpen registrering, chat eller matematikktrening.

## Spill

Seks innredbare rom, resepsjon, frokostkrok, hage og bassengplass. En sesong har fem dager med 12 deler hver: fire om morgenen, fire om ettermiddagen og fire om kvelden. Hver dag har ni enkeltstående hendelser og en historie i tre kapitler. Ingen klokke avslutter dagen. Neste del krever valgt løsning, ferdige serviceoppgaver og at alle tilstedeværende er klare. Pause lagres på serveren, og fravær gir ingen forverring.

Innholdet ligger i `content/events.json` (150 selvstendige situasjoner), `stories.json` (20 forgrenede historier, 60 kapitler) og `tasks.json` (60 serviceoppgaver). Serveren trekker en dagsplan og lagrer den. Bare avslørt innhold sendes til nettleseren. Trekk uten tilbakelegging huskes mellom dager og sesonger; prioriteringen favoriserer passende, ubrukte hendelser. Når hele en bank er brukt, begynner et nytt utvalg. Historiekapittel to og tre avhenger av forrige valg. Hotellavisen viser faktiske beslutninger og historiens avslutning.

En spiller får én serviceoppgave per del, flere får to som kan fordeles. Ansvar er en synlig avtale, ikke en sperre; en annen kan overta. Hver spiller kan også gjøre én liten hjelpehandling per del. Alle tilstedeværende må ha stemt før en større beslutning avgjøres; med tre vinner to like stemmer, med to kreves enighet. Fravær etter 45 sekunder fjerner ventekravet, men starter ingen tom hotelløkt. Ressursvirkninger vises før valget, og alle hendelser har en løsning som ikke krever mynter.

45–60 minutter er et mål for en hel sesong med lesing, oppgaver og diskusjon, ikke en tvungen tidsgrense eller dokumentert median. Automatiserte tester kan verifisere 60 deler, men ikke hvor lenge jentene opplever dem som engasjerende. Tempo må vurderes ved reell spilling.

Hotellnavn, profil, målgruppe og prioritering velges før sesongen. Rom, pynt, utbygging, innholdshistorikk og tidligere historieavslutninger beholdes. Eldre lagringer migreres til fremdriftsstyrte dager uten å nullstille rom eller ressurser. Pågående gammel dag får en ny dagsplan; et allerede løst gammelt dagsvalg bevares i historikken.

## Privat drift

Gigahost webhotell 409. PHP 8.1 eller nyere. PHP-endepunkter, `core.php`, `journey.php`, offentlig hjelp og PWA-filer legges i `/domains/biancanoor.no/public_html/hotell/`.

Spillfiler (`game.html`, `game.js`, `style.css`, `hotel.jpg` og de tre JSON-bankene) ligger i `/domains/biancanoor.no/hotell-private/assets/`. State, fillås og eiernøkkelens SHA256 ligger i `/domains/biancanoor.no/hotell-private/`, utenfor webrot. Kafélagringen berøres ikke. Forsidens spillkort `hotell-venninner.jpg` viser de tre godkjente genererte avatarene. `hotell-kort.jpg` brukes fortsatt som arkitekturbakgrunn på innloggingssiden. Ingen rå personbilder publiseres.

`HOTEL_DATA_DIR` og `HOTEL_ASSET_DIR` kan settes ved lokal testing. Produksjon har ingen klientstyrt testmodus. Bare eieren kan opprette et særskilt QA-hotell. Den eldre seconds-parameteren beholdes for bakoverkompatibilitet, men styrer ikke dagene i versjon 2.

Tilgang gis gjennom tilfeldig 256-bit engangsinvitasjon, gyldig i sju dager. Nettleseren får en tilfeldig HttpOnly/Secure/SameSite=Strict-cookie. Serveren lagrer bare hash av invitasjon og nettlesernøkkel. Invitasjoner sendes i URL-fragment, fjernes fra adressefeltet og brukes først etter et eksplisitt aktiveringstrykk. Dette binder en nettleser, ikke en fysisk telefon. Slettede nettleserdata krever ny invitasjon.

Handlinger krever nøkkel, CSRF-token, revisjon og unik handlings-ID. Fillås og atomisk rename beskytter samtidige lagringer; gamle revisjoner avvises og handlinger dedupliseres. Alle private spillfiler krever autentisering. Ingen service worker mellomlagrer dem.

## Eierstyring på MM1

Deploykontoen finnes i Nøkkelring: tjeneste `gigahost.veiledningskompetanse`, konto `deploy`. Hotellets eiernøkkel finnes i tjeneste `biancanoor.hotell.owner`, samme konto. Verdier skal aldri inn i git eller samtaler.

Kjør fra repoet:

```sh
python3 Hotell/tools/owner.py status family
python3 Hotell/tools/owner.py invite family --player bianca
python3 Hotell/tools/owner.py invite family --player leandra
python3 Hotell/tools/owner.py invite family --player rebecca
```

Invitasjonen kopieres bare til utklippstavlen, ikke terminalen. Ikke åpne en faktisk invitasjon i testnettleser. Ikke send invitasjoner uten konkret beskjed. Opprett dem når de skal overleveres, siden de utløper.

Ny telefon/nettleser:

```sh
python3 Hotell/tools/owner.py reset family --player bianca
```

Dette tilbakekaller gammel nøkkel og invitasjon for valgt plass; hotellfremgang beholdes. De andre plassene berøres ikke.

Publisering:

```sh
python3 Hotell/tools/deploy.py
python3 Hotell/tools/publish-home.py
```

Deploy oppdaterer bare applikasjonsfiler; state overskrives ikke. `admin.php` er CLI-alternativ og skal ikke lastes opp. QA-hoteller fjernes med `delete-qa`; ekte hotell kan ikke slettes via denne kommandoen.

## Illustrasjon

`hotel.jpg` og `Hjemmeside/hotell-kort.jpg` er generert med innebygd imagegen 17. november 2026. Prompt: detaljert taktil 3D-dukkehotell i frontal gjennomskåret visning, seks rom i to rader, resepsjon og kafé i første etasje, hage og tom utbyggingsplen, rosa tak, mint/lavendel, varmt ettermiddagslys, uten mennesker eller tekst. Spillfigurer og navneavatarer er separate grensesnittelementer.

## Fullskjerm

Hotellet fyller skjermen både før og etter innlogging. På mobil flyttes utsnittet vannrett mellom hotellsonene. Status ligger øverst, mens sesongvalg, hendelser og småhandlinger ligger i et sammenleggbart panel nederst. Dialoger beholder automatisk lagring.

## Spillhjelp

`help.php` er en offentlig, felles hjelpetekst uten spillerdata. Forsidens «Slik spiller dere» og spørsmålstegnet i spillet åpner samme tekst i en dialog uten å navigere bort eller miste en ventende invitasjon. Teksten beskriver faktiske regler, sesonger, valgenes følger, samarbeid og uenighet, med utvidbare avsnitt. Hjelpen kan også leses direkte på `/hotell/help.php`.

## Felles hotellstart

Forsiden og planleggingspanelet viser nedtelling til Rebeccas bursdag 3. desember 2026 kl. 00:00 norsk tid (fast ISO-offset +01:00). Etter tidspunktet erstattes telleren med felles-start-tekst. countdown.js/countdown.css er offentlige. Dette er informasjon og forventningsbygging, ikke en tilgangssperre eller automatisk utsending av invitasjoner.

## Verifikasjon av spillflyt v2

`php Hotell/tests/journey.php` kontrollerer hele sesonger alene, to og tre, alle stemmer, avbrudd, historienes grener, dekkenes repetisjonssperre, budsjett og migrering. `node Hotell/tests/journey-browser.cjs` starter en egen lokal PHP-server og isolerte Chrome-profiler (`HOTEL_ENGINE=webkit` velger WebKit). Ingen faktiske invitasjoner brukes. Livekontroll er `python3 Hotell/tools/check-live.py` og `python3 Hotell/tests/concurrent-live.py`.

## Egen iPhone og egen Chromebook

Spilleridentiteten ligger på serveren. En spiller kan ha flere selvstendige enhetsnøkler, alle knyttet til samme hotell og spiller-ID. «Mine enheter» utsteder en 8-tegns tilfeldig engangskode (40 bit), gyldig 10 minutter. Den nye nettleseren skriver koden på forsiden og får sin egen HttpOnly/Secure-cookie og CSRF-nøkkel. Tidligere enheter beholdes. Bare kodehash lagres. Koden sendes aldri til andre spillere i hotellets state. Utstedelse krever eksisterende innlogging og CSRF. Tolv forsøk per IP på ti minutter er tillatt; feilforsøk lagres også ved 401. Ny kode erstatter tidligere ubrukt kode for samme spiller.

Hver jente kobler sin egen iPhone og sin egen Chromebook til samme spiller. Begge forblir innlogget; vanlig bytte krever ingen ny kode eller utlogging. Utlogging trekker tilbake bare gjeldende nettlesernøkkel. Eierens reset trekker tilbake alle nøkler, invitasjoner og koblingskoder for den ene spilleren. Andre spillere beholder tilgangen. Stemmer og tilstedeværelse telles per spiller-ID, aldri per antall enheter. Sist lagrede stemme fra samme spiller gjelder. Fremdrift lagres på felles hotell.

`php Hotell/tests/devices.php` kontrollerer enhetsnøkler, engangsbruk, utløp, ratebegrensning og eierreset. `node Hotell/tests/devices-live.cjs` kontrollerer ekte HTTPS-kobling fra telefonvisning til PC, delt PC-bytte, synkronisering og stemmer.
