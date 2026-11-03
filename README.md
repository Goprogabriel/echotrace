# Echotrace · Find sporet i lyden

**Et privat lydlaboratorium i din browser — fra video til spektrogram og mulige Dopplerspor fra fly.**

[**Åbn live-demoen →**](https://goprogabriel.github.io/echotrace/) · [Prøv analyselaboratoriet](https://goprogabriel.github.io/echotrace/#/lab) · [Læs metoden](docs/METHOD.md)

[![Build og GitHub Pages](https://github.com/Goprogabriel/echotrace/actions/workflows/pages.yml/badge.svg)](https://github.com/Goprogabriel/echotrace/actions/workflows/pages.yml)

## Prøv det på et minut

1. Åbn [Echotrace online](https://goprogabriel.github.io/echotrace/).
2. Klik **Prøv demoen** for at analysere den medfølgende syntetiske optagelse.
3. Udforsk spektrogram, frekvensspor, flybaner og mulige kandidatområder — eller vælg din egen lyd- eller videofil.

Ingen installation, konto eller API-nøgle. **Din mediefil behandles lokalt i browseren.** Demoen bruger simulerede flydata og kører den rigtige analyse. Projektet er eksperimentelt; det er ikke en valideret metode til præcis lokalisering.

Færdigbygget statisk hjemmeside + komplet TypeScript-kildekode. Lys og enkel dansk brugerflade, lokal videobehandling, spektrogram, eksperimentel sammenligning med flybaner og interaktive OpenStreetMap-kort.

## Start her — ingen npm-installation nødvendig

1. Klon repositoryet, eller hent **Code → Download ZIP** og pak hele mappen ud.
2. Åbn `START-WINDOWS.cmd`, `START-MAC.command` eller kør `sh START-LINUX.sh`.
3. Åbn siden, og tryk **Prøv demoen**.

Startfilerne bruger Node.js eller Python 3, hvis ét af dem allerede er installeret. Browseren åbnes normalt automatisk på `http://127.0.0.1:4173`. Hold terminalvinduet åbent under brug; luk det eller tryk Ctrl+C for at stoppe.

Alternativt, fra projektmappen:

```sh
node scripts/serve.mjs --open
```

eller:

```sh
python3 scripts/serve.py --open
```

Der er **ingen konto, API-nøgle, database, miljøfil eller npm-installation** nødvendig for at køre den medfølgende build. Det lokale program er kun en statisk filserver. Det modtager og analyserer ikke din video.

**Åbn ikke `dist/index.html` direkte som `file://`.** Browserens moduler og Workers kræver en normal webadresse. På Mac kan downloadede startfiler kræve tilladelse; terminalkommandoen ovenfor er et alternativ.

## GitHub Pages · automatisk publicering

**Demo: [goprogabriel.github.io/echotrace](https://goprogabriel.github.io/echotrace/)**

Workflowet [Build and deploy GitHub Pages](.github/workflows/pages.yml) installerer de fastlåste udviklingspakker med `npm ci`, kontrollerer TypeScript, bygger appen, kører tests og publicerer `dist/`. Det kører ved hvert push til `main` og kan også startes manuelt under **Actions → Build and deploy GitHub Pages → Run workflow**.

Engangsopsætning i repository: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Vælg ikke en mappe eller branch som publiceringskilde. Hvis første workflow kørte før Pages blev aktiveret, start det igen under Actions. Se [GitHubs vejledning](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

Appen bruger relative filstier og hash-routing (`#/lab`, `#/method`, `#/privacy`), så den fungerer under `/echotrace/` uden omskrivningsregler. Ingen backend, database eller hemmelige nøgler er nødvendige. Andre statiske HTTPS-hosts kan også servere indholdet af `dist/`. Se [deploy-guiden](docs/DEPLOYMENT.md).

## Det får du

- Enkel forside med filvalg, demo, en kort introduktion og svar på de vigtigste spørgsmål.
- Lokal filvælger og drag-and-drop, original video-/lydafspiller og faktisk målt waveform/spektrogram.
- Lydafkodning via browseren; FFT, tonale spor og fysisk kurvematch i Web Workers.
- Indtastning af UTC-tid, geografisk søgeområde, urusikkerhed og mikrofonhøjde.
- Adapter til adsb.aeros dokumenterede historiske API samt lokal JSON-, CSV- og gzip-import.
- Resultater med koordinater, indtastet optagelsestid, urjustering, alternative kandidater, flybaner, modelfejl og forklaringer.
- Interaktive OpenStreetMap-kort i søgeområde og resultater. Klik for at vælge centrum, træk for at flytte, og zoom med +/−, to fingre eller Ctrl/Command + rul. Baggrundskort kan slås fra.
- Eksport af JSON-rapport — ikke den rå mediefil.
- En **tydeligt mærket syntetisk demovideo**, lydfil og to simulerede flybaner. Demoen kører den rigtige analyse; resultaterne er ikke hardkodet.
- Startfiler til Windows/Mac/Linux, kildekode, tests, dokumentation og MIT-licens for koden.

### Gratis kort uden API-nøgle

Kortene bruger [OpenStreetMap](https://www.openstreetmap.org/) med synlig kildeangivelse og browserens normale caching. Kun synlige kortfliser hentes — ingen offline-download eller forudindlæsning. Der kræves ingen konto eller API-nøgle. Den fælles kortserver har begrænset kapacitet og ingen oppetidsgaranti; ved større trafik skal der vælges en passende kortserver i overensstemmelse med [OSM’s vilkår](https://operations.osmfoundation.org/policies/tiles/).

## Vigtig afgrænsning

Dette er en **kørbar eksperimentel implementering**, ikke en valideret tjeneste, der finder den præcise adresse fra enhver video.

Du skal selv kende optagelsens omtrentlige starttid i UTC og et afgrænset geografisk område. Den analyserede lyd skal indeholde brugbare, vedvarende tonale spor, og flydata skal dække det relevante tidsrum. At et tonalt spor findes, betyder ikke i sig selv, at det kommer fra et fly.

Et “muligt kandidatområde” er en matematisk hypotese. Modelfejl er **ikke** sikkerhedsprocent; gridafstand er **ikke** dokumenteret lokationspræcision. Der er ingen uafhængig real-world-validering i denne version. Et godt resultat på den syntetiske demo dokumenterer kun, at den idealiserede model og kodeforløbet hænger sammen.

Den eksterne API-adapter er implementeret efter den offentlige dokumentation og testet med lokale svar-eksempler. **Et live API-kald og dets CORS-adfærd kunne ikke verificeres i leveringsmiljøet.** Hvis udbyderen er nede, ændrer format eller ikke har din dato, viser appen en fejl og tilbyder lokal import — den opfinder ikke data. Eksterne flydata er ikke inkluderet i ZIP’en; kun syntetiske eksempler medfølger.

## Første rigtige analyse

1. Vælg din egen optagelse på 5–180 sekunder, højst 150 MB. En stationær mikrofon, tydelig flystøj og lidt tale/musik/vind er et bedre udgangspunkt.
2. Se, om analysen finder anvendelige tonale spor.
3. Angiv **starttid i UTC** og et søgecentrum. Filens ændringsdato er ikke automatisk optagelsestid. Tidszonekonvertering skal være korrekt.
4. Importér flydata lokalt, eller giv eksplicit tilladelse til at hente et afgrænset udsnit fra API’en.
5. Læs kandidater, kurver og forbehold. “Ingen konklusion” er et gyldigt resultat.

Video-codecs varierer mellem browsere. MP4/MOV/WebM er containere, ikke garantier for en understøttet lydcodec. Hvis direkte afkodning fejler, findes et brugeraktiveret AudioWorklet-afspilningsudtræk. Det er en fallback, ikke en universel codec-konverter. WAV kan være det enkleste alternativ.

### Privatliv

Mediefilen forbliver i browserhukommelsen. Ingen analytics, login, tredjepartsskrifttyper, kamera-/mikrofonadgang, automatisk geolokation eller database. Ingen `localStorage`/IndexedDB.

Tillader du flyforespørgslen, modtager flytjenesten søgeområde, tidsinterval og almindelige forbindelsesoplysninger, herunder IP — **ikke** video, lyd eller beregnede resultater. OpenStreetMap-kortfliser hentes som standard på kortvisningerne; kortudbyderen ser det viste kortudsnit og din IP. Baggrundskort kan slås fra. Hostens almindelige adgangslogs kan stadig registrere besøg på hjemmesiden. Det er ikke det samme som upload af dine medier.

Brug kun egne optagelser eller materiale, du må undersøge. Eksporterede rapporter indeholder tid og mulige koordinater og bør behandles som følsomme.

## Udvikling

Koden er modulær TypeScript + almindelig HTML/CSS og Canvas. Ingen React-, Next.js-, kortbiblioteks- eller videobiblioteksafhængigheder ved runtime. Det er et bevidst valg, så den leverede side kan køres uden at hente pakker.

For at ændre koden og bygge igen kræves Node.js og en udviklingsinstallation af TypeScript:

```sh
git clone https://github.com/Goprogabriel/echotrace.git
cd echotrace
npm ci
npm run check
npm start
```

`npm start` serverer `dist/`. Der er ikke automatisk hot reload: kør `npm run build` efter ændringer i `src/` eller `public/` og opdatér browseren. `npm test` tester den eksisterende build; byg først efter ændringer.

TypeScript er fastlåst til 5.8.3 i `package.json`, og `package-lock.json` sikrer reproducerbare installationer. Det eneste udviklingsafhængige npm-modul er TypeScript. `dist/` er allerede bygget og følger med.

### Projektstruktur

```text
START-*                    Start uden pakkeinstallation
src/app.ts                 Appens routing, tilstand og procesflow
src/pages/                 Forside, analyse/resultat, metode og privatliv
src/components/            Genbrugelig UI, Canvas-grafik og koordinatkort
src/core/audio.ts          Lokal afkodning og afspilningsfallback
src/core/signal.ts         FFT-spektrogram og tonale spor
src/core/physics.ts        Jordkoordinater, flyinterpolation og Doppler
src/core/matcher.ts        Afgrænset positions-/tidsgrid og modeltilpasning
src/core/data.ts           Valideret import, enheder og historisk API
src/workers/               Beregningsworker og lyd-worklet
public/styles.css          Design, animationer og responsive layouts
public/assets/             Egen syntetisk demo og favicon
public/examples/           Dataformat, testdata og separat test-ground-truth
dist/                      Færdig hjemmeside — klar til statisk hosting
scripts/                   Server, build og valgfri fixture-generator
tests/                     Kernel-, HTTP- og lokal browserharness-test
docs/                      Metode, datakontrakt, testresultater og deploy
```

`demo-ground-truth.json` bruges kun af tests. Appen og matcheren læser den ikke.

## Dokumentation

- [METHOD.md](docs/METHOD.md) — model, antagelser, søgning og begrænsninger.
- [DATA-FORMAT.md](docs/DATA-FORMAT.md) — JSON/CSV, SI-enheder, tidsstempler og import.
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — statisk publicering og sikkerhed.
- [TEST-RESULTS.md](docs/TEST-RESULTS.md) — hvad der er testet, og hvad der ikke er.
- [SOURCES.md](docs/SOURCES.md) — primære kilder.
- `docs/previews/` — historiske skærmbilleder af det oprindelige mørke design. Se demoen for den aktuelle lyse brugerflade.

## Licenser

Koden er MIT. De medfølgende selvskabte syntetiske aktiver og data er CC0. Eksterne flydata og kort har deres egne vilkår; MIT-licensen ændrer ikke dem. Ingen fontfiler distribueres.

Version **0.1.0**, udarbejdet 3. november 2026.
