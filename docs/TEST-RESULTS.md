# Testresultater — Echotrace 0.1.0

Kørt 3. november 2026. Resultaterne beskriver denne leverede version, ikke generel geolokationspræcision.

## Build og kerne: bestået

Strikt TypeScript-build med TypeScript 5.8.3: **0 kompileringsfejl**. Node.js 22.16.0. `npm test`: **20 af 20 tests bestået**.

Testene dækker FFT på kendt tone, ugyldig FFT-størrelse, tidszoner/Unix-sekunder, validering af flydata, dublerede fly-ID’er, citeret CSV, API’ens indlejrede MultiLineString/tidsformat, omregning fra fod til meter, historisk forespørgselsvindue, interpolationsgab, Dopplerfortegn og lydens forsinkelse, stilhed, stationær tone, seedet støj, korte filer, syntetisk tonaldetektion, positionssøgning, manglende tidsoverlap og parametergrænser.

En rigtig HTTP-test starter den medfølgende Node-server og kontrollerer HTML, JavaScript-MIME, sikkerhedsheadere, MP4-byte-range, HEAD, 404, beskyttelse mod stiudbrud og afvisning af POST. Serveren har ingen upload-endpoint.

Kommandoer efter ændringer i kildekoden:

```sh
npm install
npm run typecheck
npm run build
npm test
```

Med den allerede medfølgende build kan `npm test` køres uden installation af TypeScript.

## Syntetisk rundtur: bestået

Testlyd: 64 sekunder, 8 kHz, to syntetiske bevægende kilder på 130 Hz og 260 Hz, stationær 50 Hz-tone og seedet støj. To fabrikerede, uafhængige flybaner. Ingen rigtige personers eller flys bevægelser indgår.

WAV-kernetesten fandt to tonale spor og en bedste kandidat cirka **11,3 meter** fra den separat gemte testposition. Den fulde MP4-browsertest fandt to spor og en bedste kandidat cirka **11.3 meter** fra samme syntetiske testposition, med relativ frekvens-RMSE **0.0368%**.

**Disse afstande må ikke bruges som et løfte om præcision på virkelige videoer.** Signalet blev syntetiseret under næsten samme idealiserede forudsætninger som matcheren. Testen påviser konsistens i implementeringen, ikke uafhængig fysisk validitet.

Appen læser `demo-session.json` med søgecentrum og kendt tid, men læser **ikke** `demo-ground-truth.json`. Ground truth bruges kun i tests. Kandidaterne kommer fra en reel søgning, ikke fra et hardkodet resultat.

## Browserfunktioner: kontrolleret med lokal testharness

Browser: Chromium 144.0.7559.96. Desktop 1440×1100 og mobil-lignende viewport 390×844.

Den kontrollerede browsermiljøpolitik blokerede navigation til alle URL’er, også localhost. Politikken blev ikke ændret. I stedet blev de lokale byggede moduler, CSS og fixtures indlæst fra hukommelsen i en about:blank-testside. Et modul-worker kan ikke startes på normal vis fra den opaque testorigin; derfor blev de uændrede beregningsmoduler samlet til én classic Blob Worker **kun i testen**. Produktion bruger den normale separate ES-module Worker.

Følgende blev faktisk kørt i denne harness:

- Forside, navigation, metode- og privatlivsside.
- **Rigtig MP4/AAC-afkodning** via browserens Web Audio API.
- Rigtig FFT, sporingskode og fysisk søgning i worker-kontekst.
- Resultatvisning med 4 kandidater, kort og modelkurver.
- Eksport og parsing af den rigtige JSON-rapport.
- Rigtig lokal filvælger til WAV, indtastede søgeparametre og lokal JSON-import.
- Ugyldig fil giver synlig fejl.
- Mobil-lignende forside og resultat uden horisontal overflow.
- **0 ufangede JavaScript-fejl** i de afprøvede forløb.

Netværk var afvist i harness, undtagen fixture-hentning fra de tre medfølgende lokale demoaktiver. Browserresumé ligger i `docs/browser-test-summary.json`; skærmbilleder i `docs/previews/`.

`tests/ui-memory.py` indeholder harness-koden. Den er en valgfri udviklingstest og kræver Python, Playwright og en installeret Chromium-browser. Installeret systembrowser kan vælges med `CHROMIUM_PATH`. Den er ikke en runtime-afhængighed for hjemmesiden.

## Ikke verificeret

- Live adsb.aero-kald, aktuelle arkivdata, netværks-CORS og API-drift. Adapteren er testet med dokumentationsbaserede lokale svar.
- Hentning af OpenStreetMap-kortfliser fra et live deploy.
- Fuld browsernavigation og workerindlæsning via produktionens HTTP/HTTPS og CSP. HTTP-server og filer er testet separat; den faktiske browsernav-test var blokeret af miljøpolitikken.
- AudioWorklet-afspilningsfallback som ende-til-ende-forløb.
- Fysiske iPhones/iPads, Safari, Android-browser og native Windows-/Mac-startfiler.
- Store brugerfiler tæt på hukommelsesgrænsen.
- Virkelige optagelser med uafhængigt verificeret sted/tid.
- Statistisk kalibrering, geolokationsnøjagtighed eller falsk-positiv-rate på virkelige data.

## Anbefalet accepttest på din egen host

Kør demoen over HTTPS, prøv en egen lille understøttet fil, kontrollér netværksfanen, test lokal import, og verificér derefter flytjeneste og kortfliser separat. Brug virkelige samtykkebaserede kontroloptagelser før du tillægger lokationshypoteserne vægt.

## Interaktive kort · opdatering 3. november 2026

- `npm run check`: TypeScript, statisk build og alle 20 eksisterende tests bestod.
- Lokal browserkontrol med produktions-CSP: syntetisk demo gennemfører, og resultatkortet viser OpenStreetMap som standard med synlig attribution.
- Søgeområde: Aarhus-genvejen opdaterer koordinatfelter og kort; zoomknappen starter ikke formularens analyse. Klik på kortet samt piletast + Enter opdaterer koordinaterne.
- Alle seks synlige kortfliser på det kontrollerede søgekort blev indlæst. Kortvisningen blev visuelt kontrolleret.
- To-finger-zoom er implementeret med Pointer Events; fysisk multitouch på telefon er ikke testet i denne opdatering.

## Lyst og forenklet design · 3. november 2026

- `npm run check`: TypeScript, build og de 20 eksisterende tests bestod.
- Den syntetiske demo gennemførte i lokal browser med produktions-CSP og viste to frekvensspor, kandidater og OpenStreetMap.
- Forside og resultater blev visuelt kontrolleret ved desktop- og mobilbredde. Ingen horisontal overflow blev målt på de to visninger ved den kontrollerede mobilbredde (354 CSS-pixel).
- Søgeformular og kort blev visuelt kontrolleret ved mobilbredde. Tekniske detaljer er samlet under “Detaljer og forbehold”.
- Browserharnessens selectors er opdateret til de nye sidetitler; Python-harnessen blev ikke genkørt i denne opdatering.

## Spektrograminspireret tema · 3. november 2026

- Designet er bygget og testet isoleret fra øvrige igangværende ændringer. Alle 20 tests bestod.
- Forside, demoresultat, OpenStreetMap, metode og privatliv blev visuelt kontrolleret i browser.
- Privatlivssiden blev kontrolleret ved mobilbredde uden vandret overflow.
- Diagrammernes farver er tilpasset via CSS; selve signaldataene er uændrede af denne designopdatering.

## Lydarbejde efter gennemgang af colstos video · 3. november 2026

- `npm run check`: TypeScript, build og **28 tests** bestået.
- Nye regressionstests: 100.000 gange dæmpet testlyd beholder to spor; to separate passager i samme frekvensbånd bevares; events 920 sekunder fra hinanden beholder deres oprindelige lydtider; valgfri FFT/båndbredde og ikke-endelige samples; manuel optegnings validering, ankre og kildeangivelse; mere end tre valgte spor afvises eksplicit.
- Worklet-test med simuleret AudioWorkletProcessor: højre stereokanal bevares, når venstre er tavs; output er lydløst; sidste PCM-blok sendes før en eksplicit `flushed`-kvittering. Dette er en komponenttest, ikke et fysisk browser-/codec-bevis for fallbacken.
- Lokal browsertest med produktions-CSP og almindelige modul-workers: MP4-demoen afkodes, finder to spor og gennemfører søgningen. Visningen viste fire kandidater, to flybaner og cirka 0,02% model-RMSE for bedste kandidat.
- Manuel optegning: tre indtastede punkter gemmes som M1, vises som manuelt spor og vælges til søgningen. Gamle resultater fjernes. Zoom på M1 satte tidsintervallet til 8–52 sekunder og frekvensintervallet til 100–165 Hz.
- Genanalyse af det allerede åbnede lydspor ved FFT 16.384 gennemførte og gav nye spor og kandidater. Samme passage kan opdeles ved utydelige steder eller krydsende toner; de foreslåede spor skal gennemgås af brugeren.
- Ingen browserlogs blev rapporteret under de kontrollerede forløb. Ingen horisontal overflow ved den kontrollerede viewport på 1021 CSS-pixel. Fysiske mobiler er ikke testet i denne opdatering.
- Ingen geolokationsvalidering på ophavsmandens rå optagelse eller andre uafhængigt sted-/tidsbestemte virkelige optagelser. Globale data, terrænhøjder og heldagssøgning er fortsat ikke implementeret.

## Frisk MOV-optagelse og automatisk opløsningsvalg · 3. november 2026

- En brugerleveret MOV på 30,601 sekunder blev afkodet lokalt og prøvet gennem den rigtige browser-worker. Ved FFT 8.192, 16.384 og 32.768 fandt browseranalysen ingen brugbare automatiske spor. Ingen lokationskonklusion blev produceret.
- En separat lokal Core Audio-afkodning gav et svagt kurveforslag ved høj opløsning, som ikke blev genfundet gennem browserafkodningen. Det er ikke et robust eller bekræftet flyfund.
- Første analyse prøver nu højere FFT-opløsning, hvis første forsøg er tomt. Manuel genanalyse respekterer den valgte opløsning uden automatiske ekstra forsøg. Den højeste afprøvede opløsning vises, hvis alle forsøg er tomme.
- Finere FFT-vinduer kan også finde tilfældige stier gennem støj. Automatisk sporing kræver nu mindst 75% målepunkter inden for passagen og begrænser samlet frekvensvariation til to gange nettosænkningen. Kurver med store reverseringer kan derfor kræve manuel inspektion.
- Nye syntetiske tests kontrollerer en kendt svag faldende tone i støj, støj/stilhed gennem de automatiske ekstra forsøg og uændret demo uden ekstra forsøg. Ingen privat optagelse er tilføjet som testfixture.
- `npm run check`: TypeScript, build og **31 tests bestået**.
- API'ets `/data-range` svarede ved kontrollen med sidste dato 2026-11-02. Det er en separat databegrænsning for en optagelse fra 2026-11-03, ikke årsagen til manglende spor i selve lydanalysen.

## Global kandidatsøgning fra tidspunkt · 3. november 2026

- Brugeren angiver UTC-starttid uden koordinater, land eller radius. Demoen bruger global kandidatsøgning; den medfølgende kendte lokation tilføres ikke matcheren.
- TypeScript og build bestod. 38 tests bestod i en isoleret release, herunder 10 nye tests for globale forespørgsler, pagination, datagrænser, netværksfejl, koordinatfri formular, datolinje, poler, manglende tidsoverlap og tvetydige kontinenter.
- Et livekald den 3. november returnerede to historiske flybaner uden geografisk filter samt `access-control-allow-origin: *`. Arkivet angav 2025-04-28 til 2026-11-02. Hentning af hele det globale udsnit er ikke belastningstestet.
- Syntetisk test med 200 flybaner spredt over verden afsøgte alle 200 og undersøgte 64 områder på cirka 3,8 sekunder på udviklingsmaskinen. Det er ikke et løfte om runtime på reelle globale data eller mobiler.
- Lokal browserkontrol: demoen gennemfører, resultatkortet vises, og søgeformularen har ét datofelt og ingen koordinat-/radiusfelter. Der er ingen uafhængig real-world-lokationsvalidering.

## Brugerleveret klip med jetfly · 3. november 2026

En MP4 på 23,102 sekunder med et synligt jetfly blev undersøgt, fordi hørbar flylyd ikke gav automatiske kurver. Begge lydkanaler blev afkodet lokalt ved 8 kHz og prøvet med FFT 8.192, 16.384 og 32.768 i 20–2000 Hz: nul accepterede tonale spor. Et separat spektrogram af 22,05 kHz-lyd blev visuelt undersøgt op til cirka 10 kHz med kortere vindue. Der er betydelig lydenergi og brede støjbånd, men ingen dokumenteret stabil tone, der kan bære den nuværende lokaliseringsmodel.

Afvisningsdiagnostik viser korte, spredte eller stigende spektrale stier frem for et tilstrækkeligt sammenhængende faldende tonalt spor. Det er ikke en klassifikation af flyets identitet eller et bevis på, at ingen flytone findes. Filen blev også prøvet i den rigtige browser-worker: nul kurveforslag efter alle tre opløsninger og en deaktiveret lokationssøgning. Ingen koordinater blev konstrueret.

Brugerfladen siger nu “Lyd registreret · ingen brugbare Dopplerkurver” og forklarer forskellen mellem hørbar flystøj og det målbare grundlag for denne model. Forside og metode beskriver udtrykkeligt, at appen ikke er en generel flylydsklassifikator. Det er en rettelse af produktets forklaring, ikke implementering eller validering af lokalisering fra bredbåndet jetstøj.

`npm run check` bestod med **47 tests** i det aktuelle fælles checkout, inklusive de eksisterende signal-, globale søge- og afspilningstests. Ingen af brugerens rå optagelser blev tilføjet som repository-fixtures.

## Synkroniseret afspilning og nyt logo · 3. november 2026

- TypeScript og build bestod. 44 tests bestod i den isolerede release, inklusive seks nye tests for zoomet tidsmapping, video→graf, tastatur, horisontal rulning, metadata-genindlæsning og oprydning.
- Browserkontrol på den syntetiske demo: klik i spektrogrammet flyttede videoen til 29,870182 s. Alle tre grafmarkører viste samme tid. Efter spolning i videoens native kontrol viste video og alle markører 32,5461 s.
- Ved åbning af manuel optegning blev tidspunktet bevaret. Klik i grafen tilføjede ét anker og ændrede ikke videoens tidspunkt.
- Markørerne er DOM-overlays og genberegner ikke FFT under afspilning. Uden for et zoomet tidsudsnit vises tidspunktet ved kanten med en forklaring.
- Logo og favicon bruger et nyt vektorsymbol med ekkoringe og frekvenskurve. Ingen nye runtimeafhængigheder.

## Dansk og engelsk · 3. november 2026

- DA/EN-knapper i den fælles header, også ved mobilbredde. Sproget gemmes som `?lang=da` eller `?lang=en` i adressen; ingen localStorage eller eksterne oversættelsestjenester.
- Lokal browserkontrol: engelsk forside, metode, privatliv, analyse, kort, resultater, usikkerhedsbeskeder og rapporteksport. Dokumentets `lang`, sidetitel og beskrivelse følger sprogvalget. Engelske metode-/privatlivsafsnit og resultattekster blev kontrolleret for tilbageværende danske æ/ø/å.
- En kørende syntetisk analyse fortsatte efter skift fra engelsk til dansk. Ved skift tilbage bevaredes to valgte spor, fire kandidater, et åbent detaljefelt og den endnu ikke anvendte zoomværdi 5 sekunder.
- Genindlæsning af `?lang=en` åbnede fortsat engelsk. Den engelske rapport indeholdt `language: en`, engelsk afkodningsbeskrivelse og engelske advarsler.
- En tavs WAV med det danske filnavn `prøve fil.wav` viste engelske analysebeskeder og bevarede filnavnet uændret. Brugerens filnavne, kaldesignaler og vilkårlige datakilder oversættes ikke.
- Ved 390 CSS-pixels var begge sprogknapper synlige, og dokumentets bredde var 390 pixels uden horisontal overflow. Browserens normale bredde blev gendannet efter kontrollen.
- `npm run check`: TypeScript, build og **51 tests bestået**. Nye tests dækker bevarelse af URL/rute, dynamiske beskeder, indlejrede statusbeskeder, tomme resultater, nummerformat og oversættelsesparametre.

## Doppler-visning og spektral kontrast · 3. november 2026

`npm run check` består: TypeScript, statisk build og 54 tests. Tre nye tests kontrollerer forskellen mellem en kendt faldende tone og en forskudt modelkurve, neutral baggrund og manglende dækning samt at diagnosen bevarer kandidaternes rangering og accept.

Den lokale app er kontrolleret i browseren med den medfølgende syntetiske video: to modelkurver, spektral kontrast 56,5 og 53,8 dB, 100% måledækning, heatmap med farveskala samt dansk/engelsk sprogskift. Det er en kode- og visningskontrol, ikke en validering på virkelige webcamdata. Skærmbillede: `test-output/doppler-evidence.png` (lokal QA, ikke distribueret).


## Originale flydata og ekstra lydkontrol · 3. november 2026

- `npm run check`: TypeScript, build og 64 tests består. Nye tests dækker QNH på separate tidsakser, referencemiks, segmentbrud, relative readsb-tider, stale/ground/leg/geometric-flags, native genimport, flerfilsimport og dublet-ID’er.
- Lydkontrollerne består en plantet faldende tone og den samlede syntetiske demo. En lige så stærk nabotone markeres som svag støtte. Et matematisk godt kurvematch i flad baggrund afvises; utilstrækkelig kontroldækning kan ikke tælle som bestået.
- Ét live `POST /query` til adsb.aero, `limit: 2`, uden geografisk filter, for 2. november 2026 omkring 11:00 UTC: 2 flybaner, 279 punkter, 104 QNH-rettede positioner. Svaret havde cursor og er udtrykkeligt ufuldstændigt. Svaret og forespørgselsmetadata ligger lokalt i den ignorerede `test-output/`-mappe; de distribueres ikke som demo eller benchmark.
- Det originale live API-svar er også importeret i den lokale browser: 2 flybaner, korrekt kilde og ODbL-licens. Der blev ikke kørt lokalisering på den syntetiske lyd med disse flydata, da tid og kilder ikke hører sammen.
- Browserkontrol af den syntetiske demo på dansk og engelsk: begge spor består kontrollen, henholdsvis 53,2 og 50,2 dB over den stærkeste forskudte kontrol. Skærmbillede: `test-output/audio-controls.png`.
- Dette er fortsat ikke validering af lokaliseringspræcision. Ingen tilsvarende rigtig lydoptagelse med kendt mikrofonplacering er tilgængelig.
