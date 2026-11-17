# Hotell – verifikasjon 17. november 2026

Mål: https://biancanoor.no/hotell/ på faktisk offentlig HTTPS. Alle aktiveringer og endringer ble kjørt i separate, syntetiske QA-hoteller. De faktiske plassene til Bianca, Leandra og Rebecca ble ikke aktivert av testene.

## Gjennomførte kontroller

Følgende resultater er bekreftet av hovedagenten som kjørte testene; QA-kontrollagenten har gjennomgått testkoden, men har ikke selv gjentatt disse kjøringene.

| Kontroll | Bevis og resultat |
|---|---|
| Personlig engangsinvitasjon | `tools/check-live.py`: tre separate klienter aktiverte egne QA-plasser; gjenbruk av brukt invitasjon avvist. |
| Uautorisert tilgang og CSRF | Samme HTTPS-test: API uten nettlesernøkkel avvist; handling uten CSRF-verdi avvist. |
| Synkronisering | Romfarge endret fra én klient og lest fra annen klient. |
| Felles start | Første og andre klare spiller startet ikke dagen; tredje startet. |
| Avstemning | Forslag ventet etter første stemme; andre av tre stemmer avgjorde. |
| Deduplisering | Gjentatt handlings-ID ga samme revisjon og effekt, uten ny belønning. Dette var sekvensiell kontroll; samtidig kontroll føres separat nedenfor. |
| Hel sesong | Fem dager med serverstyrte QA-dager på 12 sekunder, fem avisoppføringer og opptjent pynt. |
| Neste sesong | Sesongnummer økte; opptjent pynt og romfarge bevart. |
| Telefonbytte | Eierstyrt tilbakestilling av én QA-plass avviste gammel nettlesernøkkel; øvrige plasser fortsatte. |
| Tre nettleserøkter | `tests/browser.cjs`: faktisk Chrome med tre uavhengige browser contexts, bredder 320, 390 og 1440. |
| Nettleserflyt | Aktivering via UI, lukking/gjenåpning av siden, synkronisert pynt, alle klare, 2/3-hendelsesavstemning, fem 16-sekunders QA-dager, avis, ny sesong og bevart pynt bestått. |
| Layout og JavaScript | Ingen horisontal overflyt ved 320/390/1440; ingen registrerte `pageerror`. Hovedagenten inspiserte skjermbilder i 320 og 1440. |
| Opprydding | Testharnessene sletter egne QA-hoteller i `finally`; de faktiske spillerplassene er uberørt. |

Første nettleserkjøring avdekket en løpstilstand i testens kontroll av dagnummer (forrige dag ble lest før neste hadde startet). Harnessen ble endret til å vente på riktig fase/dag. Ny full kjøring bestod. Dette er en reparasjon av testharnessen, ikke et skjult produkttestavvik.

## Separat samtidighetskontroll

`tests/concurrent-live.py` er klargjort for faktisk HTTPS og oppretter sitt eget `qa-concurrency-*`-hotell. Den kontrollerer to samtidige forskjellige handlinger fra samme revisjon, avvist revisjonskonflikt og ny innsending som bevarer begge endringer; to samtidige identiske handlings-ID-er med kun én revisjon og belønning; og avvist fremmed Origin uten tilstandsendring.

Hovedagenten kjørte testen mot faktisk HTTPS og bekreftet bestått: samtidige forskjellige handlinger ga nøyaktig én HTTP 200 og én HTTP 409; ny innsending med fersk revisjon bevarte begge endringer. Samtidig innsending med samme ID ga to HTTP 200, men bare én revisjonsøkning og én belønning. Fremmed Origin ble avvist uten tilstandsendring. Testhotellet ble slettet. QA-agentens tidligere godkjenningsventende kjøring ble avbrutt og inngår ikke som testbevis.

## Hotellnavn

Backend-agenten rapporterer `tests/hotel-name.php` bestått: navn 2–40 Unicode-tegn, avvisning av ugyldig type, null, kontrolltegn og markup; planlegging nullstiller klarstatus; neste sesong beholder navnet. Hovedagenten bekrefter også PHP-testen og bestått `node --check` for frontend. `tests/name-live.cjs` er deretter kjørt mot offentlig HTTPS med tre isolerte Chrome-økter: automatisk lagring, synkronisering, nullstilling av klarstatus, gjenåpning, 320 px uten overflyt og ingen JavaScript-feil bestått.

## Avgrensninger

Sesongprøvene bruker forkortet tid bare på servermerkede QA-hoteller. De beviser faseoverganger og lagring, ikke en separat 25-minutters gjennomspilling med produksjonens femminuttersdager. Nettleserresultatet er Chrome, ikke en fysisk iPhone/Safari-prøve. Remi leverte bilder under arbeidet, og tre avatarforslag er generert lokalt og vist i samtalen. Originalbilder og avatarforslag er ikke publisert eller lagt i Git. Spillet bruker fortsatt navneavatarer.

## Fullskjermsvisning

`tests/fullscreen.cjs` bestått mot publisert HTTPS med tre isolerte Chrome-økter i 320, 390 og 1440 px bredde: hotellet fyller viewport, ingen sideoverflyt, valgpanelet kan skjules/åpnes, hageknappen flytter mobilvisningen, og navnelagring/synkronisering/nullstilling av klarstatus fungerer uten JavaScript-feil. Offentlig landingsside er også kontrollert visuelt i 390 px; hovedagenten inspiserte privat mobil- og skrivebordsvisning. Faktisk familiehotell har fortsatt null bundne plasser og ingen invitasjoner.

## Spillhjelp

PHP-syntaks for help.php/index.php og JavaScript-syntaks bestått. `tests/help.cjs` bestod mot live HTTPS: offentlig og innlogget hjelp, utvidbare sesong-/samarbeidsavsnitt, åpne/lukke hjelp før invitasjonsaktivering, fokus tilbake til spørsmålstegnet, 320/390/1440 px og ingen JavaScript-feil. Mobil- og skrivebordsbilder inspisert. Første test navigerte fra samme URL til bare et nytt fragment, uten å laste invitasjonssiden på nytt; testen ble rettet til en ny sidenavigasjon før invitasjonen åpnes. Det er en testrettelse.

## Bursdagsnedtelling

`tests/countdown.cjs` bestått mot publisert side med kontrollert klokke og amerikansk enhetstidssone: korrekt antall dager/timer/minutter, minuttene før norsk midnatt 3. desember 2026, selve åpningen og tiden etterpå. Teller skjules ved åpning og blir aldri negativ. 320×568, 390×844 og 1440×900 har ingen horisontal overflyt eller overlapp mellom nedtelling og inngangspanel. Mobilbildet er inspisert. Nedtellingen endrer ikke tilgang eller invitasjoner.

## 17. november: fremdriftsstyrte sesonger og flere enheter

Publisert ny motor med fem dager à 12 deler; ingen veggklokkefrist. Bankene inneholder 150 selvstendige hendelser, 20 historier med tre kapitler og 60 serviceoppgaver. Fortellingene har betingede oppfølginger. Dekkhistorikk og hotellfremdrift beholdes mellom sesonger. Alle aktive spillere får avgi stemme før flertall avgjør. Pause, serviceansvar, mulighet for overtakelse, «klar for neste del» og faktiske beslutninger i avisen er implementert.

Verifisert:
- `tests/journey.php`: 180 deler gjennom komplette solo-, duo- og triosesonger; begge narrative grener, pause/offline, ingen innholdsgjentakelse før full bank er brukt, null mynter, gamle oppgaver, gammel lagring og varig rom-/utbyggingshistorikk.
- `tests/hotel-name.php`: Unicode-navn, grenser, ugyldige verdier, klaremarkering og sesongskifte.
- `tests/journey-browser.cjs`: isolert Chrome, mobilmål 320/390/430 px; navn lagres ved direkte trykk på åpneknappen, alle tre stemmer, oppgavefordeling, neste del, pause/omlasting, gamle handlinger ved 409, fem dager gjennom autentisert HTTP, avis, ny sesong, hjelp, offline/gjenoppkobling og ingen JavaScript-feil eller horisontal sideoverflyt.
- `tools/check-live.py`: ekte HTTPS, tre egne QA-spillere, engangsinvitasjoner, avvist uautorisert tilgang, CSRF og duplikatvern, hele 60-dels sesongen, avis, nytt sesongoppsett og tilbakekalling av én QA-spiller.
- `tests/concurrent-live.py`: samtidige endringer gir én 200 og én 409; retry beholder begge, identiske handlings-ID-er gir bare én virkning, fremmed Origin avvises.
- `tests/devices.php`: flere nøkler til samme spiller, kodens engangsbruk, utløp, ny kode, 12-forsøksgrense og reset av bare valgt spiller.
- `tests/devices-live.cjs`: ekte kodeinntasting fra telefonvisning til PC; begge enheter beholder Bianca og deler rom/rolle; to enheter teller som én spiller; utlogging av PC beholder telefonen; Leandra overtar delt PC med egen kode; to Leandra-enheter deler én stemme; eierreset trekker tilbake begge uten å berøre Bianca.

Alle livekontroller opprettet og fjernet egne QA-hoteller. Familiens hotell stod i planlegging, dag 0, med null tilknyttede enheter og ingen aktive invitasjoner ved kontroll før publisering. Ingen faktiske spillerplasser ble aktivert.

Begrensninger: 45–60 minutter er innholdsmål, ikke et målt gjennomspillingsresultat fra jentene. Testautomatisering verifiserer flyt, ikke opplevd engasjement. WebKit startet, men stoppet i opprettelse av isolert side på denne verten; kjøringen ble avsluttet og skal ikke regnes som bestått. Nettleserresultatene over gjelder Chrome. Fysisk iPhone/PWA-kobling er ikke prøvd.

Forsidens spillkort viser nå den genererte sammensetningen av Bianca, Rebecca og Leandra. iPhone-hjelp er beholdt; Android-instruksjoner er fjernet fra alle seks PWA-filer. Dokumentasjon og publiseringsskript bruker det nye kortbildet.

Presisering: brukerhjelpen beskriver hver jentes egen iPhone og egen Chromebook, ikke en delt PC. Knappen heter «Mine enheter». Forklaringen om delt PC er fjernet fra brukerflatene. Den tekniske testen av utlogging og identitetsbytte er fortsatt nyttig som kontroll av at spillerplasser ikke blandes.
