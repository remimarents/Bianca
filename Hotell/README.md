# Hotellet vårt

Privat samarbeidsspill på https://biancanoor.no/hotell/ for Bianca, Leandra og Rebecca. Ingen åpen registrering, chat eller matematikktrening.

## Spill

Seks innredbare rom, resepsjon, frokostkrok, hage og bassengplass. En sesong består av fem dager à 300 sekunder. Velg hotellnavn (2–40 tegn), profil, målgruppe og prioritering før åpning. Alle tilstedeværende godkjenner oppsettet ved å bli klare. Ti hendelser roterer mellom sesongene. Store tiltak og hendelser stemmes over: to av tre, begge ved to spillere, eget valg alene. Spillere regnes som fraværende etter 45 sekunder uten kontakt. Når gjenværende spillere er klare, fortsetter spillet. Rollen er valgfri og begrenser ikke handlinger.

Småhandlinger har tre sekunders serverstyrt pause. Rydding, mat og velkomst påvirker renhold, overskudd og gjester. Fest, basseng og dyr har ulike følger for ulike gjestetyper. Romfarger, pynt og utbygging beholdes. Hotellavisen viser reaksjoner etter hver dag og oppsummerer sesongen. Navneavatarer brukes til godkjente bilder foreligger; rå barnebilder skal ikke publiseres.

## Privat drift

Gigahost webhotell 409. PHP 8.1 eller nyere. Bare `index.php`, `api.php`, `asset.php`, `core.php`, `owner.php` legges i `/domains/biancanoor.no/public_html/hotell/`.

Spillfiler (`game.html`, `game.js`, `style.css`, `hotel.jpg`) ligger i `/domains/biancanoor.no/hotell-private/assets/`. State, fillås og eiernøkkelens SHA256 ligger i `/domains/biancanoor.no/hotell-private/`, utenfor webrot. Kafélagringen berøres ikke. Public homepage cover `hotell-kort.jpg` contains only generated architecture, no private state or people.

`HOTEL_DATA_DIR` og `HOTEL_ASSET_DIR` kan settes ved lokal testing. Produksjon har ingen klientstyrt testmodus. Bare eieren kan opprette et særskilt QA-hotell med forkortede dager.

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
