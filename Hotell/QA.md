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
