# Publicering og drift

## GitHub Pages

Demoen publiceres på **https://goprogabriel.github.io/echotrace/**.

1. Vælg **Settings → Pages → Build and deployment → Source → GitHub Actions** i repositoryet.
2. Push til `main`, eller start **Actions → Build and deploy GitHub Pages → Run workflow**.
3. Workflowet kører `npm ci` og `npm run check`, uploader `dist/` og publicerer via GitHubs officielle Pages-actions. Vent, til deployment er grønt.

Workflowet ligger i [`.github/workflows/pages.yml`](../.github/workflows/pages.yml). Kun `main` kan publiceres. Relative links, ES-moduler, demoaktiver og Workers bevarer `/echotrace/` som base; hash-ruter kræver ingen serveropsætning.

GitHub Pages anvender ikke `_headers`-filen. CSP fra HTML-meta-tagget gælder stadig, men egne HTTP-sikkerhedsheadere kræver en host med den mulighed.

## Uden udviklingsopsætning

Den medfølgende `dist/` indeholder hele den færdige hjemmeside. Upload dens indhold til webroden hos en statisk HTTPS-host. Upload ikke kun kildekoden og forvent en server-renderet app; der er ingen backend eller Next.js-server.

`index.html`, `styles.css`, `assets/`, `examples/` og `js/` skal bevares i deres relative struktur. ES-moduler og Workers skal leveres som JavaScript-MIME. JSON skal kunne hentes fra samme origin. MP4 fungerer bedst med byte-range-understøttelse, som den medfølgende Node-server har.

Hash-routing kræver ikke omskrivningsregler. Et normalt webroot-deploy er den testede stiopbygning; underkataloger skal beholde relative assetstier.

`public/_headers` og dermed `dist/_headers` indeholder forslag til statiske hosts, der understøtter dette format. Andre hosts skal have tilsvarende HTTP-headere konfigureret. Filens tilstedeværelse betyder ikke i sig selv, at enhver host anvender dem.

## Browserkrav

En moderne browser med ES-moduler, Web Workers, Web Audio, Canvas og ResizeObserver. HTTPS eller localhost til sikker-kontekst-funktioner som AudioWorklet. Kodekunderstøttelsen er browser- og filafhængig. Start med et kort WAV- eller MP4-klip.

Ingen SharedArrayBuffer eller cross-origin isolation er påkrævet. Appen bruger ikke ffmpeg.wasm, eksterne scripts eller eksterne skrifttyper.

## Netværk og Content Security Policy

Ud over appens egne statiske filer hentes OpenStreetMap-kortfliser, når et kort vises. Baggrundskort kan slås fra på kortet. Ved valg af demo hentes syntetiske aktiver fra samme host. Ingen rå video uploades.

Tilladte valgfrie eksterne forbindelser:

- `https://adsb.aero` under `connect-src` til flydata.
- `https://tile.openstreetmap.org` under `img-src` til baggrundskort, som er slået til som standard.

CSP ligger også i `index.html` som meta-policy. `frame-ancestors` skal sættes som HTTP-header, ikke meta. Kamera, mikrofon og geolokation kan blokeres helt med Permissions-Policy; appen behøver dem ikke. Der er ingen formular-post eller upload-endpoint.

Fjern eller modificér ikke CSP ved deploy bare for at få en tilfældig tredjepartspakke til at virke. Hold ændringer begrænsede til de funktioner, du faktisk vælger at tilføje.

## Verificér efter deploy

1. Åbn hjemmesiden over HTTPS og kør demoen. Den skal finde to tonale spor og vise en tydeligt syntetisk resultatside.
2. Kontrollér i browserens netværksfane, at en egen video ikke uploades.
3. Åbn en understøttet lokal fil, indtast kendt UTC-starttid uden sted, og prøv lokale flydata.
4. Test særskilt et frivilligt live flykald for en dato, tjenesten aktuelt dækker. Se CORS, HTTP-status og format. Et lille livekald og CORS er verificeret; en fuld global hentning skal testes særskilt under realistisk belastning.
5. Kontrollér, at kortfliser og OSM-attribution er synlige i resultater. Test zoom og visning af alle kandidater og muligheden for at slå baggrundskort fra.
6. Test på dine måltelefoner, særligt iOS Safari, med realistiske kliplængder og hukommelsesforbrug.

Et livekald, der fejler, er ikke grund til at sende videoen til en anden tjeneste eller falde tilbage til opdigtede resultater. Lokal import er den tilsigtede fallback.

## Drift i større skala

Den offentlige flytjeneste og standard-OSM-fliser er ikke en garanti for gratis ubegrænset produktionskapacitet. Kontrollér de aktuelle vilkår og begrænsninger før større trafik. Appen laver ikke massehentning, polling, prefetch af kort eller automatisk ubegrænset pagination.

Ved behov for en anden dataleverandør er `src/core/data.ts` adaptergrænsen. En privat API-nøgle må ikke gemmes i browserkoden. En leverandør, der kræver en hemmelig nøgle, vil normalt kræve en særskilt betroet proxy — det er ikke en del af den leverede backendfri udgave.

## Lokale problemer

**Port optaget:** brug en anden port via `PORT`-miljøvariablen. macOS/Linux: `PORT=4174 node scripts/serve.mjs`. PowerShell: `$env:PORT=4174; node scripts/serve.mjs`.

**Tom side via file://:** brug startfilen eller en statisk host; dobbeltklik på HTML-filen er ikke understøttet.

**Mangler Node/Python:** installér ét af dem, eller publicér `dist/` på en statisk host. Hjemmesiden kræver ikke, at hver besøgende installerer noget.

**Mac blokerer .command:** brug terminalen og `node scripts/serve.mjs --open`. Følg operativsystemets normale sikkerhedsdialoger frem for at slå beskyttelse fra.
