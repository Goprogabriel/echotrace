# Primære kilder

Dokumentation undersøgt 3. november 2026. Det er dokumentationshenvisninger, ikke bevis for live drift eller geolokationspræcision.

1. adsb.aero — API-kontrakt, datoperiode, trajectory query og feltenheder:
   https://adsb.aero/llms.txt
2. adsb.lol — historiske arkiver og datalicens:
   https://www.adsb.lol/docs/open-data/historical
3. MDN — `BaseAudioContext.decodeAudioData`, fuld-fil-afkodning og resampling:
   https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData
4. MDN — AudioWorklet og sikker kontekst:
   https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet
5. OpenStax University Physics — Dopplereffekten og kilde/modtagerbevægelse:
   https://openstax.org/books/university-physics-volume-1/pages/17-7-the-doppler-effect
6. OpenStreetMap Foundation — raster tile usage policy:
   https://operations.osmfoundation.org/policies/tiles/

Kildekode, FFT, signalsporing, fysikmodel, UI, korttegning og demo er skrevet til dette projekt. Der er ikke hentet kode fra den oprindelige videos ophavsmand. Browserens medieafkoder og operativsystemets installerede skrifttyper anvendes uden at distribuere dem.

- colsto — original demonstration, transcript and description reviewed 3 November 2026: https://www.youtube.com/watch?v=UytYrhYLOKI

- adsb.aero OpenAPI, `alt_correction_ft` og forward-fill pr. segment: https://adsb.aero/api/openapi.json
- readsb trace-format, relative sekunder, højdeenheder og leg/stale/height-flags: https://github.com/wiedehopf/readsb/blob/dev/README-json.md#trace-jsons

De seneste parserændringer er kontrolleret med et lille live API-svar. Ingen påstand om adgang til Paras Chopras originale data eller kode.

- SciPy ShortTimeFFT: vinduescentre, hop og frekvensbins, konsulteret som signalbehandlingsreference (ingen SciPy-runtime i appen): https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.ShortTimeFFT.html
- SciPy peak prominence: lokal kontrast mod baggrund, konsulteret som begrebsreference (vores kontrastmål er ikke SciPys algoritme): https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.peak_prominences.html
