# Flere lydtyper og landepakker

Version 0.2.0, 4. november 2026.

Optagelse → lokal screening af alle understøttede lydtyper → sammenligning med relevante referencer/data → stedhypoteser hvor evidensen tillader det. Ingen mediefiler sendes til en server. Screening og fingerprinting kører i en annullerbar Worker.

## Hvad der faktisk er implementeret

| Lyd | Screening | Sammenligning | Geografisk resultat |
| --- | --- | --- | --- |
| Fly | Vedvarende faldende tonale spor, adaptiv FFT | Historiske ADS-B-baner, fælles urkorrektion, fysisk lydforsinkelse, frekvensfejl og lydkontrol | Eksperimentelle kandidatområder for mikrofonen |
| Kirkeklokker | Gentagne anslag med henfald og mindst tre resonanser | Normaliseret spektrum og resonansfrekvenser mod importerede, stedbundne referencer | Lignende **kilder**, aldrig en beregnet mikrofonposition |
| Vindmøller | Periodisk moduleret bredbåndsstøj, eksperimentelt | Ingen pålidelig matchning til individuelle møller implementeret | Ingen stedbestemmelse |

Det er en regelbaseret prototype, ikke en trænet AudioSet/YAMNet-klassifikator. Musik kan ligne klokker; ventilatorer, trafik og vind kan ligne møllestøj. Flyscreeningen kan overse jetstøj uden smalle toner. Ingen real-world-fejlrater eller lokationspræcision er målt for denne udvidelse.

Hver lydtype screenes uafhængigt. Klokker og periodisk støj undersøges i overlappende vinduer på højst 20 sekunder med 10 sekunders spring. Deskriptorerne beregnes separat fra flyspektrogrammet ved en fast analyserate på 8 kHz, FFT 1024 og 10 vinduer/sekund. Den simple middelværdibaserede nedprøvning er ikke et fuldt anti-alias-filter. Meget høje frekvenser, mikrofonfiltre, lav samplerate, kompression og baggrundsstøj kan ændre resultatet. FFT-zoom og flyfølsomhed ændrer ikke disse faste screeningskrav.

## Det medfølgende geografiske datasæt

`public/data/dk-sources.json` indeholder 2.485 kirker og 14 vindlokationer fra Wikidata samt 102 flypladser fra OurAirports. De 14 omfatter både møller, testcentre og parker. Flypladserne er geografiske positioner, ikke flybaner eller bevis for historisk ADS-B-dækning. Det er **ikke** et landsdækkende register over hver enkelt vindmølle og **ikke** et lyddatasæt. Historiske, planlagte eller inaktive anlæg kan være med. Kirkebygninger er ikke verificeret som aktive klokkekilder.

Strukturerede Wikidata-data er CC0. Hver kilde har et Wikidata-id, navn, koordinater og HTTPS-link samt kilde- og licensoplysninger. Query, hentetidspunkt og SHA-256 findes i `dk-sources.provenance.json`. Der medfølger **nul stedbundne lydreferencer**; geografiske positioner bruges aldrig som erstatning for lydbevis.

Opdater reproducerbart efter build:

```sh
npm run build
node scripts/update-source-catalog.mjs
npm run check
```

Alternativt kan scriptet læse gemte SPARQL JSON-svar som argumenter. Queryen tillader kun eksplicitte kirkebygnings-, katedral-, mølle- og vindparkklasser og filtrerer Danmark. Netværksfejl, forkert svarformat og et uventet lille resultat overskriver ikke det eksisterende katalog. Katalogfilen erstattes atomisk. En opdatering tilføjer aldrig opdigtede lydreferencer.

Energistyrelsens [stamdataregister](https://ens.dk/analyser-og-statistik/data-oversigt-over-energisektoren) er det relevante næste trin til bedre vindmølledækning. Koordinaterne er EUREF89/UTM32, dog UTM33 på Bornholm, og mangler for nogle anlæg. Det register er undersøgt som kilde, men er ikke importeret eller omdannet i denne version. Forsøg på at hente et samlet OSM/Overpass-udtræk mislykkedes i udviklingsmiljøet; der hævdes derfor ingen OSM-registerdækning.

## Opret og brug lydreferencer

1. Åbn en optagelse og lad screeningen blive færdig.
2. Åbn **Opbyg et referencebibliotek**, søg efter en kirke og vælg den kendte kilde.
3. Angiv referencens ophav og licens, og bekræft brugsretten og kildeplaceringen.
4. Åbn en separat referenceoptagelse. Dens første 20 sekunder skal indeholde flere tydelige klokkeslag. Appen beregner deskriptoren lokalt og eksporterer en JSON-referencepakke.
5. Importér referencepakken senere med **Importér katalog / referencer**. Referencer bevares mellem filvalg i samme session, men forsvinder ved genindlæsning, hvis de ikke eksporteres.

Syntetiske referencer skal markeres og ignoreres altid ved stedmatch. De medfølgende syntetiske klokker og modulerede støj er oprindelige CC0-testsignaler, skabt af `scripts/generate_sound_demos.mjs`. De repræsenterer ingen virkelig kirke eller mølle. De er rørledningstests, ikke træningsdata eller dokumentation for genkendelse i naturen.

Klanglig afstand er 0,4 × spektral cosineafstand plus 0,3 × summen af to retningsbestemte gennemsnitlige relative resonansafstande. Klokkekilder vises kun ved afstand ≤ 0,055 og en positiv klokkelydindikation. Tærsklen er ukalibreret. Alternative lignende kilder bevares. Tallet er hverken sandsynlighed eller lokationsfejl. Vindmøllereferencer kan beskrives i formatet, men matcheren giver ingen lokationsmatch for dem.

Ingen rå referenceoptagelser inkluderes i eksporten. Referencefrekvenser og kildeoplysninger kan stadig være følsomme.

## JSON-kontrakt

```json
{
  "schema": "echotrace-sources/1",
  "country": "DK",
  "source": "Eget referencebibliotek",
  "license": "Kildernes egne licenser gælder",
  "fetchedAt": "2026-11-04T10:00:00Z",
  "coverage": "Udvalgte verificerede kilder; ikke fuld dækning",
  "sources": [],
  "references": []
}
```

Kilde: `id`, `country`, `kind` (`church_bell` eller `wind_turbine`), `name`, `lat`, `lon`, `url` (HTTPS), samt valgfrit `provenance` og `license`, som ellers arves fra pakken. Referencens egen licens gælder separat.

Reference: `id`, `sourceId`, `kind`, `provenance`, `license`, `synthetic` (boolean), valgfrit `recordedAt`, samt `signature`:

- `version`: `acoustic-signature/1`.
- `spectrum`: præcis 32 endelige, ikke-negative tal, L2-normaliseret til 1.
- `peaksHz`: højst 8 resonanser inden for 40–4000 Hz.
- `onsetRate`: anslag pr. sekund; `modulationHz`: anslået repetitionsfrekvens.
- `periodicity`, `tonality`: relative deskriptorer mellem 0 og 1.

Importer valideres: højst 15 MB, 30.000 kilder og 3.000 referencer, ingen dublet-id'er, ukendte sourceId'er, ugyldige koordinater, ikke-endelige værdier eller usikre links. Konflikter mellem samme kilde-id og andre koordinater/typer afvises. Tekst HTML-escapes før visning. Se `src/types.ts` og tests for den konkrete kontrakt. At en pakke valideres teknisk, verificerer ikke dens ophav eller sandhed.

## Flere lande og lydtyper

`src/core/regions.ts` samler landekode, navn, aktivering, geografisk boks og katalogsti. Danmark er aktiveret; GB og DE er deaktiverede udvidelsespunkter. Storbritannien omfatter England, men en selvstændig England-afgrænsning kræver en separat region.

Flyhypoteser afgrænses **før** kandidatrangering og i hvert fint grid til den danske boks (54,45–57,9 N, 7,5–15,3 E). Det er en praktisk landepakkeafgrænsning, ikke et præcist landegrænsepolygon; nabolande og hav i boksen kan indgå. Grønland og Færøerne indgår ikke. ADS-B-forespørgslen er stadig et globalt tidsudsnit for at bevare ruter omkring grænsen.

Nye lande kræver kildedata, licenser, en afgrænsning og lokale testoptagelser før aktivering. Nye lydtyper tilføjes i `SoundKind`, registret `SOUND_TYPES`, med deres egen detektor og matchmetode. Kategorier kan ikke forventes at dele én lokaliseringsmodel. En fremtidig trænet model bør have et versioneret modelartefakt, lokal inferens, en ukendt-klasse og feltmålt evaluering; AudioSets geografisk uspecificerede labels kan ikke stedbestemme danske kirker.

## Flyforbedringer og AeroDoppler

Gennemgået repository: [leo-aa88/aerodoppler](https://github.com/leo-aa88/aerodoppler), commit `644c16bf7f5ceb7d4579ad365cfc07d631d1f0cb`.

Filer undersøgt: `docs/theory.md`, `search/score.py`, `search/rank.py`, `audio/ridges.py`, `audio/template_detect.py`, `physics/doppler.py`, `tests/unit/test_locked_scoring.py` og MIT-licensen.

Overført som selvstændige TypeScript-implementeringer:

- Forankret harmonisk gruppering (heltalsforhold 2–4, tidsmæssigt overlap og stabilt frekvensforhold). Ingen transitiv sammenkædning. Standardvalg tager én repræsentant pr. gruppe; adaptiv FFT fortsætter efter en anden uafhængig passage, selv om én passage har flere harmoniske toner.
- Sammenligning med adskilte, tidsforskudte kontrolvinduer i optagelsen. Op til 16 foreslås; mindst fire skal have brugbar dækning. Kurvematch med mindre end 3 dB forskel til stærkeste kontrol afvises. Korte optagelser markeres som utilstrækkelige til denne ekstra kontrol, uden at det udlægges som bestået eller kalibreret sikkerhed.
- Diagnostik af hvert spors foretrukne klokkeoffset mod den fælles urkorrektion samt næsten lige gode adskilte kandidater. Diagnostikken ændrer aldrig hvert spors tidspunkt selvstændigt.

Vi havde allerede emissionstidskorrigeret Doppler, fælles urkorrektion, grov/fin søgning og fuldpasagekontrol med forskudte frekvenser og omvendt tid. Det blev bevaret. Vi har **ikke** importeret deres Python-backend, terrænmodel, ukendt-tid-søgning, RPM-drift, template-detektor, confidence-grader eller benchmarkresultater. Deres målte tal gælder ikke Echotrace. Se tredjepartsnotitsen i repositoryroden.

## Kontrol

`npm run check` kører typekontrol, bygger den leverede `dist/` og kører alle automatiske enhedstests. Nye tests dækker blandet lyd, negative signaler, samplerate/lydniveau, importfejl, referenceadskillelse, syntetiske referencer, harmoniske grupper, kontrolvinduer og dansk geografisk afgrænsning.

`tests/browser-smoke.mjs` kontrollerer den rigtige statiske side, browserafkodning, ES-module Worker, de to nye demoer, katalogindlæsning, referenceoprettelse/-eksport/-import, mobilbredde og flydemoens diagnostik. Det kræver Playwright installeret separat og en kørende lokal server. Valgfri miljøvariable: `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`, `ECHOTRACE_URL`. Der er ingen Playwright-afhængighed i den leverede app.

## Samlet datakort

Åbn **Datakort** i menuen (`#/sources`). Siden kan åbnes uden en optagelse og viser det indlæste danske kildekatalog på ét kort. Filtre for kirker/kirkeklokker, flypladser og vindmøller/parker kan kombineres med navnesøgning og **Kun steder med lydreferencer**. Kun ikke-syntetiske referencer tælles; geografiske poster alene giver aldrig lydreferencedækning.

Markørfarver følger de tre lag. Talmarkører grupperer nærliggende punkter pr. kategori; klik zoomer ind. Hvid ring viser, at gruppen eller kilden har mindst én indlæst lydreference. En tilgængelig, pagineret liste giver adgang til alle filtrerede kilder. Valg i listen centrerer kortet; kildedetaljer viser navn, koordinater, ophav, licens og link til originalen. Filtrene bevarer kortets udsnit, og målknappen tilpasser det til alle filtrerede kilder. Baggrundskort kan slås fra.

Kortet tegner ikke en opdigtet hørbarhedsradius. Kirkebygninger er ikke verificerede aktive klokker; parkpositioner er ikke hver enkelt vindmølle; en flyplads er ikke en flybane. Flybanedækning afhænger fortsat af optagelsens tidspunkt og arkivet.

### Flypladsdata

102 danske små, mellemstore og store flypladser er udtrukket fra OurAirports' offentlige `airports.csv`, med `iso_country=DK` og samme geografiske afgrænsning som landepakken. Heliporte, søflybaser og registrerede lukkede pladser er udeladt. Græsbaner og private pladser kan være med; aktiv driftsstatus er ikke verificeret. Grønland/Færøerne indgår ikke. Data er public domain uden garanti for nøjagtighed ifølge [OurAirports](https://ourairports.com/data/).

Reproducerbar opdatering:

```sh
npm run build
node scripts/update-source-catalog.mjs
node scripts/update-airports.mjs
npm run check
```

Det sidste script kan også læse en gemt `airports.csv` som argument. Kataloget valideres før atomisk erstatning; kildeadresse, hentetid, CSV-hash, antal og filtre gemmes i `public/data/dk-airports.provenance.json`. Opdateringen af Wikidata bevarer allerede indlæste flypladsposter. `dk-sources.provenance.json` beskriver den oprindelige Wikidata-snapshot; det kombinerede katalogs hash findes i flypladsproveniensen efter berigelsen.

`SoundSource.kind` tillader nu også `airport`. Det tilføjer et geografisk lag, ikke en ny akustisk klassifikationskategori. Flypladsposter kan ikke bruges som klokkereferencer. Eksisterende referenceimporter bevarer deres format. Browseren henter hele kataloget fra samme host som appen; den foretager ikke opslag hos OurAirports.

Kortudvidelsen er kontrolleret med 92 automatiske tests samt `tests/coverage-browser.mjs` på den reelle statiske side. Browserkontrollen dækker lag, søgning, referencefilter, markørvalg, kildedetaljer, paginering, mobilbredde og engelsk visning. Det eksisterende lyd-/flybrowserforløb er også kontrolleret efter udvidelsen.

## Klokkegenkendelse opdateret med en virkelig optagelse

Den brugerleverede video blev analyseret lokalt 4. november 2026. Den varer 368,454125 sekunder og indeholder ifølge brugerens beskrivelse gentagne kirkeklokker gennem næsten hele klippet. Titlen angiver Vor Frue Kirke; dette er ikke en automatisk verificeret stedbestemmelse. Videoen, dens rå lyd og udtrukne medieklip distribueres ikke i appen eller testfixtures.

Den oprindelige klokkescreening markerede 7 af 37 overlappende 20-sekunders vinduer. Målingen af samlet RMS-anslag og gennemsnitlig tonalitet overså lange klokkepassager. En separat STFT-analyse viste flere kortvarige resonanser, også hvor gennemsnitsspektret ikke havde nok skarpe toppe.

`src/core/bells.ts` undersøger nu korte spektre ved 8 kHz, FFT 2048 (256 ms, ca. 3,9 Hz pr. bin), med 400 samples/50 ms mellem vinduer. Lokale resonanstoppe sammenlignes med frekvensbaggrunden. Positiv ændring i resonansenergien mod en løbende baggrund erstatter kravet om kraftige RMS-spring. Flere samtidige, delvist ikke-harmoniske resonanser og gentagne ændringer kræves. Perfekte harmoniske maskintoner og stationære flerklange er negative kontroltilfælde. Dette er fortsat en eksperimentel regelbaseret metode; musik og andre klokker kan give falske indikationer.

Den nye analyse markerede 37/37 vinduer i netop denne udviklingsoptagelse og gav 548 anslagsforslag. Anslagsforslag er ikke verificerede slag: klangsvingninger, ekko og overlap kan skabe ekstra forslag, og samtidige slag kan blive slået sammen. De må ikke bruges som antal fysiske klokker. Forbedringen fra 7 til 37 er dækning på en optagelse brugt under udvikling, **ikke** målt præcision eller validering på uafhængige virkelige optagelser.

`SoundScan.method` er nu `local-acoustic-screen/2`. Den stabile reference-deskriptor `acoustic-signature/1` er bevaret, så eksisterende biblioteker fortsat kan importeres. `scan.bells` tilføjer metodeversion, analyseparametre, alle screeningsvinduer, forslag med tid og lokale resonanser samt omtrentlige intervaller. Screening køres én gang over hele klippet, så forslag ikke duplikeres af de overlappende 20-sekunders vinduer. Tidsintervallerne har omtrent ét sekunds opløsning.

Lydoversigten viser nu en klikbar tidslinje, alle screeningsvinduer og en scrollbar liste over anslagsforslag. Klik flytter medieafspilleren til tidspunktet. Højst 1.000 forslag vises i brugerfladen; JSON-lydrapporten indeholder den fulde liste. Referenceoprettelse bruger samme nye klokkescreening på de første 20 sekunder, men kræver fortsat en brugbar signatur.

Nye regressionstests dækker overlappende, svingende klokkemodeller, uforanderlige flerklange, harmonisk moduleret maskinstøj, støj/stilhed, stille klip, ikke-endelige samples og lange pauser mellem ringninger. Den virkelige video er også kontrolleret gennem den faktiske browsers afkodning og analyseworker: 37 vinduer, 548 forslag, visning af hele listen, søgning til 100 sekunder, eksport og mobilbredde. Testartefakter og den fulde personlige analyse ligger uden for de distribuerede data.
