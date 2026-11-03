/** Danish source text → English. {0}, {1}, … capture dynamic plain-text values. */
export const english: Record<string, string> = Object.fromEntries(`
Kurvetilpasning | Curve fit
Lavere fejl ← → Højere fejl | Lower error ← → Higher error
Relativ skala · ikke sandsynlighed | Relative scale · not probability
Cyan kurve = model | Cyan curve = model
Spektral kontrast | Spectral contrast
{0}% dækning | {0}% coverage
Passer kurven til lyden? | Does the curve fit the audio?
Den cyan kurve er flybanens forudsagte Dopplerforløb. Spektral kontrast måler lysstyrken langs kurven i forhold til frekvenserne ved siden af. Positiv kontrast betyder mere lydenergi langs modellen; det beviser ikke, at tonen kommer fra flyet. | The cyan curve is the flight track’s predicted Doppler curve. Spectral contrast measures brightness along the curve relative to neighbouring frequencies. Positive contrast means more audio energy along the model; it does not prove the tone comes from the aircraft.
Lydkontrol bestået | Audio check passed
Svag lydstøtte | Weak audio support
Utilstrækkelig kontroldækning | Insufficient control coverage
{0} dB over kontrol | {0} dB above control
Importér også originale readsb-traces eller gemte API-svar. Flere filer kan vælges sammen. | You can also import original readsb traces or saved API responses. Multiple files can be selected together.
Den cyan kurve er flybanens forudsagte Dopplerforløb. Spektral kontrast måler lysstyrken langs kurven i forhold til frekvenserne ved siden af. Lydkontrollen sammenligner med seks forskudte kurver ved de samme tidspunkter. Et kurvematch skal også bestå lydkontrollen for at blive accepteret. Det beviser stadig ikke, at tonen kommer fra flyet. | The cyan curve is the flight track’s predicted Doppler curve. Spectral contrast measures brightness along the curve relative to neighbouring frequencies. The audio check compares six shifted curves at the same times. A curve fit must also pass the audio check to be accepted. This still does not prove the tone comes from the aircraft.
Ugyldigt flybanesegment. | Invalid flight path segment.
Ukendt højdereference. | Unknown altitude reference.
Tilgængelige QNH-rettelser er anvendt ved deres egne tidspunkter. Rettet MSL-højde er stadig ikke en præcis geometrisk højde. | Available QNH corrections have been applied at their own timestamps. Corrected MSL altitude is still not a precise geometric altitude.
Nogle positioner mangler QNH-rettelse. Der interpoleres ikke mellem forskellige højdereferencer. | Some positions lack QNH corrections. Different altitude references are not interpolated together.
Ugyldigt readsb-spor eller for mange datapunkter. | Invalid readsb trace or too many data points.
readsb-punkter skal have gyldige flag og stigende tid. | readsb points must have valid flags and increasing timestamps.
readsb-sporet indeholder ingen brugbar flybane. | The readsb trace contains no usable flight path.
Lokal readsb-trace · kilde og licens skal kontrolleres | Local readsb trace · check source and licence
readsb-højder er trykhøjder i fod omregnet til meter. Geometriske højder erstatter ikke automatisk MSL-højder. | readsb altitudes are pressure altitudes converted from feet to metres. Geometric altitudes do not automatically replace MSL altitudes.
readsb-positioner kan stamme fra ADS-B, MLAT eller TIS-B. Modtagerkvalitet er ikke uafhængigt valideret. | readsb positions may originate from ADS-B, MLAT or TIS-B. Receiver quality has not been independently validated.
{0} readsb-punkter blev udeladt; spor forbindes ikke hen over dem. | {0} readsb points were omitted; traces are not connected across them.
Højst 20.000 flybaner pr. import. | At most 20,000 flight tracks per import.
Ingen brugbare positioner i det importerede API-svar. | No usable positions in the imported API response.
Det importerede API-svar har flere sider. Importen er ikke komplet. | The imported API response has more pages. The import is incomplete.
Vælg højst 100 flydatafiler og samlet højst 25 MB. | Select at most 100 flight data files totalling no more than 25 MB.
Flere lokale flydatafiler | Multiple local flight data files
Et eller flere kurvematches blev afvist af lydkontrollen: modellen skal have mindst 3 dB kontrast og 3 dB mere end alle seks forskudte kontrolkurver, mindst 12 målinger og 70% dækning. Grænserne er ikke statistisk kalibreret. | One or more curve fits failed the audio check: the model needs at least 3 dB contrast and 3 dB more than all six shifted control curves, at least 12 measurements and 70% coverage. The thresholds are not statistically calibrated.
Ingen kurvekandidater bestod den ekstra lydkontrol. Der gives ingen konklusion om placeringen. | No curve candidates passed the additional audio check. No conclusion about the location is provided.
Afvist af lydkontrollen | Rejected by the audio check
Ekstra kontrol mod lyden | Additional audio check
Efter kurvetilpasningen sammenlignes modellens lydenergi med seks forskudte kontrolkurver ved de samme tidspunkter. Hvert spor skal have mindst 3 dB kontrast, mindst 3 dB mere end den stærkeste kontrol, 12 målinger og 70% dækning. Ellers accepteres kandidaten ikke. Det er en ukalibreret heuristik, og andre lydkilder kan stadig bestå. | After curve fitting, audio energy along the model is compared with six shifted control curves at identical times. Every track needs at least 3 dB contrast, at least 3 dB above the strongest control, 12 measurements and 70% coverage. Otherwise the candidate is not accepted. This is an uncalibrated heuristic, and other sound sources can still pass.
Tilgængelige QNH-rettelser anvendes ved deres egne tidspunkter. Manglende rettelser mærkes som trykhøjde. Forskellige højdereferencer og separate dækningssegmenter forbindes ikke ved interpolation. | Available QNH corrections are applied at their own timestamps. Missing corrections are marked as pressure altitude. Different altitude references and separate coverage segments are not interpolated together.
Originale readsb-traces og gemte API-svar kan importeres direkte. Vælg flere filer sammen for at samle flybaner fra et lokalt arkiv. En hel tar- eller ZIP-fil skal udpakkes først. | Original readsb traces and saved API responses can be imported directly. Select multiple files together to combine flight tracks from a local archive. A complete tar or ZIP file must be extracted first.
Dansk | Danish
Sprog | Language
Skift til dansk | Switch to Danish
Skift til engelsk | Switch to English
Echotrace — forside | Echotrace — home
Hovedmenu | Main navigation
Sideinformation | Site information
Til forsiden | Back to home
Metoden | Method
Privatliv | Privacy
Sådan virker det | How it works
Analyser video | Analyse video
Spring til indhold | Skip to content
Find sporet | Find the trace
i lyden. | in the sound.
Echotrace — Find sporet i lyden | Echotrace — Find the trace in the sound
Metoden — Echotrace | Method — Echotrace
Privatliv — Echotrace | Privacy — Echotrace
Undersøg tonale frekvensspor i din video, og sammenlign dem med flyenes bevægelse. | Examine tonal frequency tracks in your video and compare them with aircraft movements.
Vælg en video | Choose a video
Prøv demoen | Try the demo
Din video bliver på din enhed. | Your video stays on your device.
Lyden som billede | Sound as an image
Illustration | Illustration
Illustration af frekvensspor over tid, ikke en måling | Illustration of frequency tracks over time, not a measurement
Fra optagelse til overblik | From recording to insight
Vælg en optagelse | Choose a recording
Åbn en video eller lydfil. Analysen kører i din browser. | Open a video or audio file. The analysis runs in your browser.
Se lydens spor | Explore the sound tracks
Find frekvensspor, og angiv optagelsens starttid. | Find frequency tracks and enter the recording start time.
Udforsk kortet | Explore the map
Sammenlign med flydata, og se hvilke områder der passer til lyden. | Compare with flight data and see which areas fit the sound.
Echotrace er eksperimentelt. Et muligt match er ikke en bekræftet placering. | Echotrace is experimental. A possible match is not a confirmed location.
Læs om metoden | Read about the method
Godt at vide | Good to know
Hvad skal jeg bruge? | What do I need?
En optagelse på 5 sekunder–30 minutter, højst 150 MB, med en vedvarende tone, der ændrer frekvens under en flypassage. Hørbar flystøj alene er ikke nok til denne metode. Du skal kende starttidspunktet i UTC. Appen søger selv efter mulige steder ud fra de tilgængelige flybaner verden over. | A recording of 5 seconds to 30 minutes, up to 150 MB, with a sustained tone that changes frequency during an aircraft pass. Audible aircraft noise alone is not enough for this method. You need the start time in UTC. The app searches for possible locations using available flight tracks worldwide.
Kan den genkende alle fly? | Can it recognise every aircraft?
Nej. Appen følger tonale Dopplerkurver og er ikke en generel flylydsgenkender. Tydelig jetstøj kan mangle en brugbar kurve. Propellerfly kan have stærke tonale spor, men det er heller ingen garanti for lokalisering. | No. The app follows tonal Doppler curves; it is not a general aircraft sound classifier. Clearly audible jet noise may lack a usable curve. Propeller aircraft can have strong tonal tracks, but that does not guarantee localisation either.
Bliver min video uploadet? | Is my video uploaded?
Nej. Video og lyd behandles på din enhed. Kortvisningen henter kort fra OpenStreetMap. Henter du flydata, sendes tidsintervallet til adsb.aero. | No. Video and audio are processed on your device. The map loads tiles from OpenStreetMap. If you fetch flight data, the time interval is sent to adsb.aero.
Hvad viser demoen? | What does the demo show?
En syntetisk optagelse og to simulerede flybaner. Du kan prøve hele analysen uden at finde en optagelse først. | A synthetic recording and two simulated flight tracks. You can try the full analysis without finding a recording first.
Lavet af | Made by
Lavet af GoproGabriel — se GitHub-profil (åbner i en ny fane) | Made by GoproGabriel — view GitHub profile (opens in a new tab)
Vælg video eller lyd | Choose video or audio
Slip din optagelse for at åbne den lokalt. | Drop your recording to open it locally.
Echotrace kræver JavaScript til lokal lydanalyse. Ingen videoer uploades til en server. | Echotrace requires JavaScript for local audio analysis. No videos are uploaded to a server.
Åbner … | Opening …
Undersøg flyenes frekvensspor i din video. Lokal lydanalyse, åbne flydata og ærlige resultater. Ingen medieupload. | Examine aircraft frequency tracks in your video. Local audio analysis, open flight data and honest results. No media uploads.
Vælg eller slip en video- eller lydfil | Choose or drop a video or audio file
Slip din fil her | Drop your file here
eller klik for at vælge video eller lyd | or click to choose video or audio
5 sekunder–30 minutter · maks. 150 MB | 5 seconds–30 minutes · max. 150 MB
Filen bliver på din enhed | Your file stays on your device
Din optagelse | Your recording
Din valgte video | Your selected video
Vælg en anden fil | Choose another file
Mediefil | Media file
Din analyse | Your analysis
Dit resultat | Your result
Analyserer din optagelse | Analysing your recording
Syntetisk demo | Synthetic demo
Annuller | Cancel
Lydens frekvenser | Sound frequencies
Afventer måling | Awaiting analysis
{0} kurveforslag | {0} curve suggestions
Spektrogram af den valgte optagelse. Brug punktfelterne nedenfor til manuel optegning. | Spectrogram of the selected recording. Use the point fields below for manual tracing.
Lydsporet er åbnet | Audio track opened
Leder efter lydsporet | Looking for the audio track
Frekvensdata vises, når de er beregnet. | Frequency data will appear once calculated.
Meget lavt lydniveau | Very low audio level
Lyd registreret · ingen brugbare Dopplerkurver | Audio detected · no usable Doppler curves
Appen følger smalle, vedvarende toner. Den genkender ikke fly ud fra hele lydbilledet. En tydelig jetmotor kan derfor være hørbar, selv om der ikke findes en kurve, som denne model kan bruge til lokalisering. | The app follows narrow, sustained tones. It does not recognise aircraft from the overall sound. A jet engine may be clearly audible without a curve that this model can use for localisation.
Hvilken flylyd kan undersøges? | Which aircraft sounds can be analysed?
{0} Hz pr. bin · {1} s vindue · {2} s mellem målinger. Visningen fremhæver toner i forhold til baggrundsstøjen. | {0} Hz per bin · {1} s window · {2} s between measurements. The display highlights tones relative to background noise.
Zoom, kontrast og frekvensopløsning | Zoom, contrast and frequency resolution
Fra · sekunder | From · seconds
Til · sekunder | To · seconds
Vis fra · Hz | Display from · Hz
Vis til · Hz | Display to · Hz
Kontrastløft · dB | Contrast boost · dB
Anvend zoom | Apply zoom
Vis hele optagelsen | Show full recording
Analysér fra · Hz | Analyse from · Hz
Analysér til · Hz | Analyse to · Hz
FFT / opløsning | FFT / resolution
Større FFT adskiller nærliggende toner bedre, men udglatter hurtige ændringer. Ny analyse erstatter også dine manuelle spor. | A larger FFT separates nearby tones better but smooths out rapid changes. Reanalysing also replaces your manual tracks.
Analysér lyden igen | Reanalyse audio
Vælg op til tre spor til søgningen | Select up to three tracks for the search
{0} · Manuelt optegnet | {0} · Manually traced
{0} · Automatisk | {0} · Automatic
{0} s · {1} Hz fald | {0} s · {1} Hz drop
Slet | Delete
Ingen kurver opfylder kravene til varighed, sammenhæng og frekvensfald. | No curves meet the duration, continuity and frequency-drop requirements.
Afprøvet FFT: {0}. | FFT sizes tried: {0}.
Zoom ind, eller tegn en kurve manuelt, hvis du faktisk kan se den. | Zoom in, or trace a curve manually if you can actually see it.
Manglende kurver afgør ikke, om der er et fly i optagelsen. | Missing curves do not determine whether the recording contains an aircraft.
Luk optegning | Close tracing
Tegn et svagt spor | Trace a faint track
Klik langs den synlige kurve, eller tilføj punkter med felterne. Brug mindst tre punkter over mindst 8 sekunder. Mellemrummene forbindes med rette linjer; flere punkter følger kurven bedre. | Click along the visible curve or add points using the fields. Use at least three points over at least 8 seconds. Points are joined by straight lines; adding more points follows the curve more closely.
Tid · sekunder | Time · seconds
Frekvens · Hz | Frequency · Hz
Tilføj punkt | Add point
Fortryd punkt | Undo point
Gem spor ({0} punkter) | Save track ({0} points)
{0} punkter. En optegnet kurve er din måling og er ikke en automatisk bekræftelse af flylyd. | {0} points. A traced curve is your measurement, not automatic confirmation of aircraft sound.
Bemærkninger til lyden ({0}) | Audio notes ({0})
Lydens amplitude over tid | Audio amplitude over time
Hvornår er optagelsen lavet? | When was the recording made?
Angiv tidspunktet. Vi leder efter mulige steder ud fra lyden og flybaner verden over. | Enter the time. We search for possible locations using the sound and flight tracks worldwide.
Importér flydata | Import flight data
Optagelsens starttid · UTC | Recording start time · UTC
Dato og klokkeslæt i UTC. Brug optagelsens start, også hvis flylyden kommer senere. | Date and time in UTC. Use the start of the recording, even if the aircraft sound occurs later.
Avancerede parametre | Advanced parameters
Usikkerhed i kameratid | Camera clock uncertainty
Præcis tid | Exact time
±{0} sekunder | ±{0} seconds
Mikrofonhøjde · m MSL | Microphone altitude · m MSL
Lydens hastighed · m/s | Speed of sound · m/s
Højden er over middelvandstand, ikke over gulvet. Standard 343 m/s er en tilnærmelse. Modellen korrigerer ikke for vind eller atmosfærisk brydning. | Altitude is above mean sea level, not above the floor. The default 343 m/s is an approximation. The model does not correct for wind or atmospheric refraction.
Flydata er klar | Flight data ready
Historiske flydata | Historical flight data
{0} flybaner indlæst | {0} flight tracks loaded
SYNTETISK TESTDATA | SYNTHETIC TEST DATA
LOKALT INDLÆST | LOADED LOCALLY
Fjern datasæt | Remove dataset
Vi henter tilgængelige flybaner omkring tidspunktet uden at filtrere på land eller område. | We fetch available flight tracks around this time without filtering by country or area.
Tillad at tidspunktet sendes til adsb.aero. | Allow the time to be sent to adsb.aero.
Din video og lyd sendes aldrig. | Your video and audio are never sent.
Det er min egen optagelse, eller jeg har tilladelse til at undersøge den. | This is my recording, or I have permission to analyse it.
Find mulige steder | Find possible locations
Søg globalt | Search globally
Mulige områder | Possible areas
Intet match fundet | No match found
Områderne passer til modellen, men er ikke bekræftede optagelsessteder. | The areas fit the model but are not confirmed recording locations.
Ingen kandidat bestod kriterierne. Et lavt fejlmål alene er ikke bevis for en placering. | No candidate passed the criteria. A low error alone is not evidence of a location.
Eksportér rapport | Export report
Syntetisk testdata. | Synthetic test data.
Resultatet tester kun kodeforløbet — ikke præcisionen på virkelige videoer. | This result tests the code pipeline, not accuracy on real videos.
Flere mulige områder. | Multiple possible areas.
Data peger ikke entydigt på ét sted. | The data does not uniquely identify one location.
Eksperimentel hypotese. | Experimental hypothesis.
Modellen er ikke kalibreret til at give en sikker adresse eller sandsynlighed. | The model is not calibrated to provide a reliable address or probability.
Ingen konklusion. | No conclusion.
De bedst passende beregninger vises kun til inspektion. | The best-fitting calculations are shown for inspection only.
Global kandidatsøgning | Global candidate search
{0} flybaner afsøgt · {1} område undersøgt nærmere. | {0} flight tracks screened · {1} area examined in detail.
{0} flybaner afsøgt · {1} områder undersøgt nærmere. | {0} flight tracks screened · {1} areas examined in detail.
Demoen indeholder kun to simulerede flybaner. | The demo contains only two simulated flight tracks.
Søgning i de indlæste flybaner. | Searching the loaded flight tracks.
Alle svar fra arkivet for forespørgslen er hentet. | All archive responses for this request have been retrieved.
Hentningen er begrænset; flere flybaner kan mangle. | Retrieval was limited; additional flight tracks may be missing.
Lokalt importerede data kan dække en del af verden. | Locally imported data may cover only part of the world.
Søgning i de indlæste flybaner. Hentningen er begrænset; flere flybaner kan mangle. | Searching the loaded flight tracks. Retrieval was limited; additional flight tracks may be missing.
Søgning i de tilgængelige flybaner fra arkivet ved dit tidspunkt. | Searching the flight tracks available in the archive at your time.
Søgningen er eksperimentel og undersøger ikke hvert punkt på jorden. | The search is experimental and does not examine every point on Earth.
{0} ruter uden brugbare positioner blev udeladt. | {0} tracks without usable positions were omitted.
Modelfejl | Model error
Lavere er bedre. Ikke en sikkerhedsprocent. | Lower is better. Not a confidence percentage.
Matchende flybaner | Matching flight tracks
Flybaner i den valgte tilpasning | Flight tracks in the selected fit
Muligt kandidatområde | Possible candidate area
Ikke godkendt af modellen | Rejected by the model
{0} modelfejl · {1} flybane | {0} model error · {1} flight track
{0} modelfejl · {1} flybaner | {0} model error · {1} flight tracks
Ingen beregnelige kandidater. Kontrollér, at lydens tid og flydata overlapper. | No computable candidates. Check that the audio time and flight data overlap.
Optagelsestid | Recording time
Modeljustering: {0} s | Model adjustment: {0} s
Lyd og model | Audio and model
Stiplet kurve = model | Dashed curve = model
Målte frekvensspor sammenlignet med modellens forudsagte kurver | Measured frequency tracks compared with the model predictions
Spor | Track
Fly / kaldesignal | Aircraft / callsign
Est. kildetone | Est. source tone
Ingen tilgængelige modelkurver. | No model curves available.
Om resultatet | About the result
Modelfejlen viser, hvor godt kurverne passer sammen. Den angiver ikke præcision i meter eller sandsynligheden for et sted. | Model error describes how well the curves fit. It does not represent accuracy in metres or the probability of a location.
Detaljer og forbehold | Details and limitations
{0} undersøgte hypoteser · gridafstand {1} m (ikke præcision) · {2} · stationær mikrofon · ensartet atmosfære · maks. 30 sekunders interpolationsgab. | {0} hypotheses tested · grid spacing {1} m (not accuracy) · {2} · stationary microphone · uniform atmosphere · maximum interpolation gap of 30 seconds.
Undersøg en ny optagelse | Analyse a new recording
Ret tidspunktet | Change the time
Vi kunne ikke fortsætte | We could not continue
Udtræk lyd under afspilning | Extract audio during playback
Åbn en video | Open a video
Sådan virker Echotrace | How Echotrace works
Det, der bliver på din enhed | What stays on your device
Videoen læses som en lokal File/Blob i browseren. Lydafkodning, FFT, sporing af toner og søgning i flybaner udføres på din enhed. Appen indeholder ingen endpoint til at modtage video eller lyd. | The video is read as a local File/Blob in the browser. Audio decoding, FFT, tone tracking and flight-track searches run on your device. The app has no endpoint for receiving video or audio.
Der er ingen analytics, reklamekode, eksterne skrifttyper, brugerlogin eller automatisk geolokation. Fil, frekvensdata og søgeresultater opbevares i browserens hukommelse i den aktuelle session. Der skrives ikke til localStorage, IndexedDB eller en serverdatabase. | There are no analytics, advertising scripts, external fonts, user logins or automatic geolocation. Your file, frequency data and search results stay in browser memory for the current session. Nothing is written to localStorage, IndexedDB or a server database.
De eksterne forbindelser, du selv vælger | External connections you choose
Når du giver tilladelse og trykker “Søg globalt”, kontaktes adsb.aero. Først forespørges arkivets datoperiode; dernæst sendes et tidsinterval uden geografisk filter. Tjenesten kan dermed se disse oplysninger og din IP-adresse. Din mediefil, filnavn, lyd, spektrogram og det beregnede kandidatresultat sendes ikke. | When you give permission and click “Search globally”, the app contacts adsb.aero. It first checks the archive date range, then sends a time interval without a geographic filter. The service can see this information and your IP address. Your media file, filename, audio, spectrogram and calculated candidate results are not sent.
OpenStreetMap vises som standard, når du åbner resultaterne. Browseren henter kun kortfliser til det synlige kortudsnit. Du kan slå baggrundskort fra på kortet; kortnåle, geografisk grid og flybaner tegnes stadig lokalt. Flisernes adresser afslører det viste kortudsnit for kortleverandøren. Browserens almindelige netværksoplysninger følger med. | OpenStreetMap is shown by default when you open results. The browser fetches tiles only for the visible map area. You can turn off the background map; markers, the geographic grid and flight tracks are still drawn locally. Tile URLs reveal the displayed map area to the tile provider, along with normal browser network information.
Den, der hoster denne statiske hjemmeside, leverer HTML, JavaScript, CSS og demoaktiver. Hostens almindelige adgangslogs kan registrere din IP og sideforespørgsler. Det er noget andet end, at appen uploader din valgte video. | The host of this static website serves HTML, JavaScript, CSS and demo assets. Standard hosting access logs may record your IP address and page requests. They do not contain an upload of your selected video from this app.
Rapporter er også følsomme | Reports can contain sensitive information
En rapport downloades kun, når du trykker “Eksportér rapport”. Rapporten indeholder filnavn, tid, søgemetode, beregnede kandidater og modeloplysninger — men ingen rå lyd eller videoframes. Del den ikke ukritisk. | A report is downloaded only when you click “Export report”. It contains the filename, time, search method, calculated candidates and model information, but no raw audio or video frames. Share it with care.
Brug værktøjet ansvarligt | Use the tool responsibly
Undersøg kun egne optagelser eller materiale, du har tilladelse til at analysere. Resultaterne må ikke bruges som bevis for en persons adresse eller færden. Samtykkefeltet er en påmindelse, ikke en teknisk adgangskontrol. | Analyse only your own recordings or material you have permission to examine. Results must not be used as evidence of a person's address or movements. The consent checkbox is a reminder, not a technical access control.
En selvhostet kopi kan ændres. Du skal derfor stole på den side, du åbner, eller kontrollere og hoste koden selv. “Lokal behandling” er en egenskab ved denne kode, ikke en garanti for enhver kopi på nettet. | A self-hosted copy can be modified. You therefore need to trust the site you open, or inspect and host the code yourself. “Local processing” describes this code; it is not a guarantee for every copy online.
Hvad programmet faktisk gør | What the program actually does
Echotrace er en selvstændig, eksperimentel implementering. Det er ikke den oprindelige videos kode og ikke en valideret erstatning for dens forskningsarbejde. | Echotrace is an independent, experimental implementation. It is not the original video's code or a validated replacement for that research.
Browseren afkoder lyd til PCM ved 8 kHz. En Hann-vinduesfunktion og en valgfri FFT på 8.192, 16.384 eller 32.768 punkter danner spektrogrammet. Standard er cirka 0,98 Hz frekvensafstand og 30–1000 Hz. Analysebånd, tidszoom og kontrast kan justeres. Længere FFT-vinduer forbedrer frekvensopløsningen på bekostning af tidsopløsningen. | The browser decodes audio to PCM at 8 kHz. A Hann window and an FFT of 8,192, 16,384 or 32,768 points produce the spectrogram. The default frequency spacing is about 0.98 Hz over 30–1000 Hz. The analysis band, time zoom and contrast are adjustable. Longer FFT windows improve frequency resolution at the expense of time resolution.
En kontinuitetsbegrænset sporingsalgoritme leder efter fremtrædende tonale kurver. Heuristiske filtre fjerner stationære toner, korte spor, store spring og nære harmoniske dubletter. Separate passager kan findes, selv om de kun fylder en lille del af optagelsen. Svage kurver kan også tegnes manuelt med mindst tre punkter over otte sekunder. Vælg ét til tre spor til søgningen. Manuelle målepunkter gemmes i rapporten. Hverken tonen eller kurvens form beviser, at kilden er et fly. | A continuity-constrained tracking algorithm looks for prominent tonal curves. Heuristic filters remove stationary tones, short tracks, large jumps and close harmonic duplicates. Separate passes can be found even if they occupy only a small part of the recording. Faint curves can also be traced manually with at least three points over eight seconds. Select one to three tracks for the search. Manual anchor points are saved in the report. Neither a tone nor the shape of its curve proves that the source is an aircraft.
Hørbar flylyd og brugbare kurver | Audible aircraft sound and usable curves
Der er forskel på at høre et fly og at måle en vedvarende tone, som kan sammenlignes med en Dopplermodel. Appen indeholder ingen generel model til at genkende flylyde. Den leder efter smalle, sammenhængende frekvensspor med et målbart fald. | Hearing an aircraft and measuring a sustained tone that can be compared with a Doppler model are different tasks. The app has no general aircraft sound recognition model. It looks for narrow, continuous frequency tracks with a measurable drop.
Et jetfly kan give kraftig støj over mange frekvenser uden at denne analyse finder en brugbar kurve. Både propellerfly og jetfly kan have tonale komponenter, men de skal kunne adskilles og følges i den konkrete optagelse. Nul kurveforslag betyder, at den nuværende model ikke har fundet sit nødvendige målegrundlag. Det afgør ikke, om der er et fly i lyden. Manuel optegning skal følge en faktisk synlig tone; den kan ikke skabe et målegrundlag fra bred støj. | A jet aircraft can produce loud noise across many frequencies without this analysis finding a usable curve. Both propeller and jet aircraft can have tonal components, but those tones must be distinguishable and trackable in the recording. Zero curve suggestions means the current model has not found the measurements it needs. It does not determine whether an aircraft is audible. Manual tracing must follow a genuinely visible tone; it cannot create measurements from broadband noise.
Frekvens og forsinkelse | Frequency and delay
modtaget | received
udsendt | emitted
kilde | source
Positiv radial hastighed betyder, at flyet fjerner sig. Flypositioner interpoleres i tredimensionale, jordcentrerede koordinater. En iterativ løsning finder udsendelsestiden, så lyden ikke sammenlignes med flyets position på det forkerte tidspunkt. | Positive radial velocity means the aircraft is moving away. Aircraft positions are interpolated in three-dimensional Earth-centred coordinates. An iterative solver finds emission time so that the audio is not compared with the aircraft position at the wrong time.
For hvert gridpunkt og hver urjustering tilpasses en konstant kildetone ved vægtet mindste kvadraters metode. Hvert udvalgt tonalt spor skal kunne forklares. Det bedste fly vælges separat for hvert spor. Først søges groft, dernæst finere omkring nogle gode kandidater. | At each grid point and clock adjustment, a constant source tone is fitted using weighted least squares. Every selected tonal track must be explained. The best-fitting aircraft is chosen separately for each track. A coarse search is followed by finer searches around promising candidates.
Sådan afsøges mulige steder | How possible locations are searched
Alle tidsrelevante, indlæste flybaner screenes omkring deres jordprojektion. Det tydeligst faldende spor bruges til at rangere områder. Højst 64 adskilte områder undersøges derefter på finere grids med alle dine valgte spor. Modellen bruger højst 120 km lydafstand. Der kan findes bedre løsningsområder uden for de undersøgte grids; hverken datahentning eller numerisk søgning er en garanti for komplet dækning. | All loaded flight tracks overlapping the time interval are screened around their ground projections. The clearest falling track is used to rank areas. Up to 64 separate areas are then examined on finer grids using all selected tracks. The model limits sound propagation distance to 120 km. Better-fitting areas may exist outside the tested grids; neither data retrieval nor numerical search guarantees complete coverage.
Hvad et lavt fejlmål betyder | What a low error means
Fejlmålet er den relative RMS-afvigelse mellem målte og modellerede frekvenser. Det er | The error is the relative RMS difference between measured and modelled frequencies. It is
ikke en sandsynlighed, et sikkerhedsinterval eller en afstand i meter | not a probability, confidence interval or distance in metres
. De interne grænser (bl.a. 2% samlet frekvensfejl og 75% forbedring over en konstant tone) er heuristikker. De er ikke kalibreret på et repræsentativt datasæt af virkelige videoer. | . The internal thresholds (including 2% overall frequency error and 75% improvement over a constant tone) are heuristics. They have not been calibrated on a representative dataset of real videos.
Gridafstand beskriver afstanden mellem beregnede punkter, ikke lokationspræcisionen. Søgningen finder ikke nødvendigvis det globale minimum. Flere geografiske steder kan give næsten samme kurve, især for ét fly eller ukendt kameratid. | Grid spacing describes the distance between calculated points, not location accuracy. The search may not find the global minimum. Several locations can produce almost the same curve, especially with one aircraft or an uncertain camera clock.
Det, modellen ikke kan love | What the model cannot promise
Du skal kende optagelsens starttid i UTC. Appen henter flybaner uden geografisk filter og afsøger mulige steder langs dem. Den finder ikke en ukendt dato fra lyden og tester ikke hvert punkt på jorden. Filens ændringsdato er ikke en sikker optagelsestid. | You need the recording start time in UTC. The app fetches flight tracks without a geographic filter and searches for possible locations along them. It does not find an unknown date from audio or test every point on Earth. A file's modification date is not a reliable recording time.
Modellen antager en stationær mikrofon, en vedvarende konstant kildetone og en ensartet, vindstille atmosfære. Motorregulering, reflekteret lyd, vind, temperaturgradienter, andre støjkilder, klipning og videoredigering kan gøre resultatet forkert. | The model assumes a stationary microphone, a sustained constant source tone and a uniform, windless atmosphere. Engine adjustments, reflected sound, wind, temperature gradients, other noise sources, clipping and video edits can make the result incorrect.
Der bruges en sfærisk jordmodel. Kildehøjder fra adsb.aero er trykhøjder i fod, som omregnes til meter, ikke præcist målte geometriske højder. Tidsmæssige huller over 30 sekunder interpoleres ikke. Supersoniske bevægelser understøttes ikke. | A spherical Earth model is used. Source altitudes from adsb.aero are pressure altitudes in feet converted to metres, not accurately measured geometric altitudes. Time gaps longer than 30 seconds are not interpolated. Supersonic motion is not supported.
Data og forbindelser | Data and connections
adsb.aero dokumenterer en offentlig API uden login og med CORS. Den bygger på adsb.lols historiske arkiver. Appen undersøger API’ens faktiske datoperiode ved forespørgslen. Dækning og drift er ikke garanteret. Næste sider hentes automatisk, indtil forespørgslen er færdig eller grænsen på 200 sider, 20.000 flybaner eller 1.000.000 punkter nås. En begrænset hentning markeres tydeligt. Afgange hentes op til to døgn før tidsvinduet, så fly, der allerede var i luften, kommer med. | adsb.aero documents a public API with no login and with CORS support. It uses adsb.lol's historical archives. The app checks the actual archive date range when making a request. Coverage and availability are not guaranteed. Subsequent pages are fetched automatically until retrieval finishes or reaches 200 pages, 20,000 flight tracks or 1,000,000 points. Limited retrieval is clearly marked. Departures up to two days before the time window are included to capture aircraft already in flight.
Alternativt kan du importere et lokalt JSON- eller CSV-udsnit. En hel dags globalt arkiv er ikke et passende browserdatasæt. Det medfølgende schema angiver koordinater i grader, højder i meter og tider i Unix-sekunder eller ISO 8601 med tidszone. | Alternatively, import a local JSON or CSV extract. A full day of global data is not a suitable browser dataset. The included schema specifies coordinates in degrees, altitudes in metres, and times as Unix seconds or ISO 8601 with a time zone.
Demo og teststatus | Demo and test status
Demoens lyd og flybaner er syntetiske. Den bruger samme afkodning, signalbehandling og søgekode som dine egne filer. At den passer sammen, er en funktionstest — ikke validering af geolokation på virkelige optagelser. | The demo audio and flight tracks are synthetic. It uses the same decoding, signal processing and search code as your own files. A successful demo is a functional test, not validation of geolocation on real recordings.
Se | See
i ZIP-projektet for de tests, der faktisk er kørt. Appen er ikke testet systematisk på alle Safari-, iOS- og Android-versioner. | in the project ZIP for the tests actually run. The app has not been systematically tested on every Safari, iOS or Android version.
Inspiration fra videoen | Inspiration from the video
Colstos demonstration bruger blandt andet to flypassager med cirka 920 sekunders mellemrum, terrænhøjder og en fælles tidsjustering. Hans første eksempel kender dagen, men ikke klokkeslættet. Denne version har global kandidatsøgning ved kendt UTC-starttid. Søgning efter et ukendt klokkeslæt gennem en hel dag og terrændata er endnu ikke implementeret. Den nærmere sammenligning findes i projektets | Colsto's demonstration uses two aircraft passes about 920 seconds apart, terrain elevations and a shared time adjustment. His first example knows the date but not the time. This version supports global candidate searches with a known UTC start time. Searching an entire day for an unknown time and using terrain data are not yet implemented. A detailed comparison is in the project's
Primære kilder | Primary sources
NASA — tonale og bredbåndede støjkilder i flymotorer | NASA — tonal and broadband aircraft engine noise sources
colsto — Dopplerkurver og geolokation | colsto — Doppler curves and geolocation
adsb.aero — API-kontrakt og dataformat | adsb.aero — API contract and data format
adsb.lol — historiske arkiver og ODbL | adsb.lol — historical archives and ODbL
MDN — lokal lydafkodning | MDN — local audio decoding
OpenStax — Dopplereffekten | OpenStax — the Doppler effect
OpenStreetMap — vilkår for kortfliser | OpenStreetMap — tile usage policy
Dokumentation undersøgt 3. november 2026. Eksterne tjenester kan ændre sig. Værktøjet erstatter ikke egne målinger eller faglig verifikation. | Documentation reviewed on 3 November 2026. External services may change. This tool does not replace independent measurements or expert verification.
`.trim().split('\n').map(line => line.split(' | ')));

Object.assign(english, Object.fromEntries(`
Zoom ind | Zoom in
Zoom ud | Zoom out
Vis alle mulige områder | Show all possible areas
Vis hele søgeområdet | Show full search area
Vis baggrundskort | Show background map
OpenStreetMap-bidragsydere | OpenStreetMap contributors
Geografisk grid · træk for at flytte | Geographic grid · drag to pan
Kortfliser kunne ikke hentes. Du kan stadig bruge koordinater, markører og zoom. | Map tiles could not be loaded. Coordinates, markers and zoom are still available.
Kort med flybaner og kandidatområder. Brug piletaster til at flytte og plus/minus til at zoome. Ctrl eller Command og rul zoomer også. | Map with flight tracks and candidate areas. Use arrow keys to pan and plus/minus to zoom. Ctrl or Command + scroll also zooms.
Vælg søgeområde på kortet. Klik for at sætte centrum. Brug piletaster til at flytte og plus/minus til at zoome. Ctrl eller Command og rul zoomer også. | Choose the search area on the map. Click to set its centre. Use arrow keys to pan and plus/minus to zoom. Ctrl or Command + scroll also zooms.
Klik eller træk for at spole. Piletaster: 1 sekund. Shift + piletast: 10 sekunder. Rul vandret eller Shift + rul for at spole. | Click or drag to seek. Arrow keys: 1 second. Shift + arrow: 10 seconds. Scroll horizontally or Shift + scroll to seek.
· uden for udsnit | · outside view
af | of
Klar til en optagelse | Ready for a recording
Analysen er annulleret | Analysis cancelled
Annulleret | Cancelled
Beregningen er stoppet. Ingen video blev sendt. | Calculation stopped. No video was sent.
Der opstod en uventet fejl. | An unexpected error occurred.
Beregningen er stoppet | Calculation stopped
Åbner din optagelse lokalt | Opening your recording locally
Analysearbejderen kunne ikke startes. Åbn appen via localhost eller HTTPS — ikke direkte som en file://-fil. | The analysis worker could not start. Open the app through localhost or HTTPS, not directly as a file:// URL.
Angiv optagelsens starttid i UTC. | Enter the recording start time in UTC.
Angiv en gyldig optagelsestid mellem år 2000 og 2100. | Enter a valid recording time between 2000 and 2100.
Kontrollér tidspunkt, urusikkerhed, mikrofonhøjde og lydhastighed. | Check the time, clock uncertainty, microphone altitude and speed of sound.
Vælg mellem ét og tre tonale spor til søgningen. | Select one to three tonal tracks for the search.
Bekræft, at du har ret til at undersøge denne optagelse. | Confirm that you have permission to analyse this recording.
Tillad forespørgslen til flytjenesten, eller importér lokale flydata. Din video bliver på enheden. | Allow the flight service request or import local flight data. Your video stays on your device.
Henter flybaner verden over ved dit tidspunkt | Fetching worldwide flight tracks for your time
Henter globale flydata · {0} sider · {1} flybaner | Fetching global flight data · {0} pages · {1} flight tracks
Sammenligner {0} spor med {1} flybaner | Comparing {0} tracks with {1} flight tracks
Modelberegningen kunne ikke gennemføres i denne browser. | The model calculation could not be completed in this browser.
Åbner den medfølgende testoptagelse. Alle beregninger kører lokalt. | Opening the included test recording. All calculations run locally.
Testvideoen mangler. | The test video is missing.
Demoen kunne ikke åbnes. | The demo could not be opened.
Eksperimentelle hypoteser, ikke bekræftede placeringer. Fejlmål er frekvensafvigelser, ikke sandsynligheder. Ingen kalibreret lokationspræcision. Brug ikke rapporten til at identificere en person. | Experimental hypotheses, not verified locations. Scores are frequency errors, not probabilities. No calibrated position accuracy. Do not use this report to identify a person.
Rapporten indeholder tid og kandidatområder. Del den med omtanke. | The report contains a time and candidate areas. Share it with care.
Vælg mindst 1 sekund og 5 Hz inden for den analyserede tid og frekvens. | Choose at least 1 second and 5 Hz within the analysed time and frequency range.
Indtast tid og frekvens inden for det analyserede spektrogram. | Enter a time and frequency within the analysed spectrogram.
Sporet er gemt. Fravælg et andet spor for at bruge det i søgningen. | Track saved. Deselect another track to use it in the search.
Åbn optagelsen igen for at genanalysere. | Reopen the recording to reanalyse it.
Vælg et analysebånd inden for 20–2000 Hz, mindst 20 Hz bredt. | Choose an analysis band within 20–2000 Hz, at least 20 Hz wide.
Genanalyserer den lokale lyd | Reanalysing local audio
Kontrollér lydindstillingerne. | Check the audio settings.
Vælg højst tre spor ad gangen. | Select at most three tracks at a time.
{0} flybaner indlæst lokalt. | {0} flight tracks loaded locally.
Data kunne ikke indlæses. | The data could not be loaded.
Filen er tom. | The file is empty.
Filen er for stor. Brug et klip på højst 150 MB og 30 minutter. | The file is too large. Use a clip no larger than 150 MB and no longer than 30 minutes.
Vælg en video- eller lydfil, fx MP4, MOV, WebM eller WAV. | Choose a video or audio file, such as MP4, MOV, WebM or WAV.
Åbner lydsporet på din enhed | Opening the audio track on your device
Browseren understøtter ikke lokal lydafkodning. Prøv en nyere Chrome, Edge eller Safari. | The browser does not support local audio decoding. Try a recent version of Chrome, Edge or Safari.
Browseren kan ikke åbne dette lydformat direkte. Prøv “Udtræk under afspilning”, eller vælg en WAV/MP4 med understøttet lyd. | The browser cannot open this audio format directly. Try “Extract audio during playback”, or choose a WAV/MP4 with supported audio.
Optagelsen er længere end 30 minutter. Klip den ned først, så analysen ikke overbelaster din browser. | The recording is longer than 30 minutes. Trim it first to avoid overloading your browser.
Vælg en optagelse med mindst 5 sekunders lyd. | Choose a recording with at least 5 seconds of audio.
Web Audio · lokal afkodning | Web Audio · local decoding
Kanal {0} med højest energi blev analyseret; stereo er ikke blandet sammen. | Channel {0}, with the highest energy, was analysed; stereo channels were not mixed.
Afspilningsudtræk kræver HTTPS eller localhost og AudioWorklet. | Playback capture requires HTTPS or localhost and AudioWorklet.
Videoformatet kunne ikke åbnes. | The video format could not be opened.
Browseren kan ikke afspille dette videoformat. | The browser cannot play this video format.
Afspilningsudtræk kræver et klip på 5 sekunder–30 minutter. | Playback capture requires a clip of 5 seconds to 30 minutes.
Afspilning gik i stå. Hold fanen åben, eller brug WAV. | Playback stalled. Keep the tab open or use WAV.
Udtrækker lyd under lydløs afspilning · {0} / {1} s | Extracting audio during silent playback · {0} / {1} s
Intet lydspor kunne udtrækkes. | No audio track could be extracted.
AudioWorklet · lydløst afspilningsudtræk | AudioWorklet · silent playback capture
Lyd udtrukket under realtidsafspilning. Startforsinkelse og browser-timing kan forskyde lydens tidsakse; tillad urusikkerhed. Hold fanen i forgrunden. | Audio was captured during real-time playback. Startup delays and browser timing can shift the audio timeline; allow clock uncertainty. Keep the tab in the foreground.
Ugyldig samplerate. | Invalid sample rate.
Vælg mindst 5 sekunders lyd. 30–90 sekunder er bedre. | Choose at least 5 seconds of audio. 30–90 seconds is better.
Klip optagelsen ned til højst 30 minutter. | Trim the recording to no more than 30 minutes.
Vælg 20–2000 Hz, mindst 20 Hz båndbredde og en gyldig FFT-størrelse. | Choose 20–2000 Hz, a bandwidth of at least 20 Hz and a valid FFT size.
For lidt lyd til frekvensanalyse. | Not enough audio for frequency analysis.
Frekvensvindue {0} af {1} | Frequency window {0} of {1}
Følger sammenhængende tonale spor | Following continuous tonal tracks
Meget lavt lydniveau eller intet lydspor. | Very low audio level or no audio track.
Lydsporet klipper. Det kan forvrænge frekvenssporene. | The audio clips. This can distort frequency tracks.
Ingen tilstrækkeligt lange, faldende tonale spor. Det udelukker ikke flystøj. | No sufficiently long, falling tonal tracks. This does not rule out aircraft noise.
Et kort klip giver få observationer og større tvetydighed. | A short clip provides fewer observations and more ambiguity.
Tonale spor kan også komme fra musik, biler eller maskiner. De er ikke i sig selv bevis for et fly. | Tonal tracks may also come from music, cars or machinery. They are not evidence of an aircraft on their own.
Den lokale lydanalyse er klar | Local audio analysis is ready
Ny søgning med FFT {0} · {1} | Retrying with FFT {0} · {1}
Standardopløsningen fandt ingen spor. FFT {0} gav {1} automatisk(e) kurveforslag. Kontrollér kurven visuelt; det er ikke en bekræftet flypassage. | The default resolution found no tracks. FFT {0} produced {1} automatic curve suggestions. Inspect the curve visually; this is not a confirmed aircraft pass.
Ingen automatiske spor ved FFT {0}. Zoom ind og undersøg lyden; en optagelse indeholder ikke nødvendigvis en målbar flykurve. | No automatic tracks at FFT {0}. Zoom in and examine the audio; a recording does not necessarily contain a measurable aircraft curve.
Markér mindst tre punkter med forskellige tider inden for spektrogrammet. | Mark at least three points at different times within the spectrogram.
Et manuelt spor skal dække mindst 8 sekunder. | A manual track must span at least 8 seconds.
Der er ingen tonale spor at matche. | There are no tonal tracks to match.
Vælg højst tre spor til én søgning. | Select at most three tracks for one search.
Datasættet indeholder ingen anvendelige flybaner. | The dataset contains no usable flight tracks.
Brug højst 100 flybaner ad gangen. | Use no more than 100 flight tracks at a time.
Ugyldige søgeparametre. | Invalid search parameters.
Søgeparametrene ligger uden for modellens grænser. | The search parameters exceed the model limits.
Sammenligner lyd med {0} flybaner · {1} hypoteser | Comparing audio with {0} flight tracks · {1} hypotheses
Undersøger kandidatområde {0} af {1} · trin {2}/2 | Examining candidate area {0} of {1} · step {2}/2
Eksperimentel model. Et godt kurvematch er ikke bevis for optagelsens placering. | Experimental model. A good curve fit is not evidence of the recording location.
Der søges kun i det valgte område og tidsinterval. Et bedre match kan eksistere udenfor. | Only the selected area and time interval are searched. A better match may exist outside them.
Modellen antager en stationær mikrofon, en konstant motortone og ensartet, vindstille luft. | The model assumes a stationary microphone, a constant engine tone and uniform, windless air.
ADS-B-højder, lydens hastighed og ukendt kameratid kan give systematiske fejl. Gridafstand er ikke en sikkerhedsradius. | ADS-B altitudes, the speed of sound and an uncertain camera clock can cause systematic errors. Grid spacing is not a confidence radius.
Manuelle spor bygger på brugerens optegnede punkter med lineær interpolation. Et match bekræfter ikke, at kurven findes i lyden. | Manual tracks use the user's anchor points with linear interpolation. A match does not confirm that the curve exists in the audio.
Kun én uafhængig flybane matcher. Spejlede og aflange løsningsområder kan ikke udelukkes. | Only one independent flight track matches. Mirrored and elongated solution areas cannot be ruled out.
Flere adskilte områder passer til modellen. Resultatet er tvetydigt. | Several separate areas fit the model. The result is ambiguous.
Ingen kandidater bestod den eksperimentelle kvalitetsgrænse. | No candidates passed the experimental quality threshold.
Urkorrektionen er kun afsøgt på et diskret grid; den er ikke et uafhængigt fund af optagelsestiden. | Clock correction is tested only on a discrete grid; it is not an independent determination of recording time.
Hypoteser og modelkurver er klar | Hypotheses and model curves are ready
Vælg mellem ét og tre frekvensspor. | Select one to three frequency tracks.
Global søgning kræver 1–20.000 flybaner. | Global search requires 1–20,000 flight tracks.
Kontrollér tidspunkt og avancerede parametre. | Check the time and advanced parameters.
Frekvenssporet mangler brugbare punkter. | The frequency track has no usable points.
Søger globalt · {0} af {1} flybaner | Searching globally · {0} of {1} flight tracks
Undersøger muligt område {0} af {1} | Examining possible area {0} of {1}
Eksperimentel global kandidatsøgning, ikke en bekræftet lokation. Et godt kurvematch er ikke bevis. | Experimental global candidate search, not a confirmed location. A good curve fit is not proof.
Alle {0} tidsrelevante, indlæste flybaner blev groft afsøgt. De {1} bedst rangerede områder blev undersøgt nærmere. Ikke hvert punkt på jorden er testet. | All {0} loaded flight tracks overlapping the time interval were screened. The {1} highest-ranked areas were examined in detail. Not every point on Earth was tested.
Søgningen bruger højst 120 km lydafstand og grov geografisk/tidsmæssig afsøgning. Fly uden data eller kandidater uden for disse modelgrænser kan blive overset. | The search uses a maximum sound propagation distance of 120 km and coarse geographic/time sampling. Aircraft without data and candidates outside these model limits may be missed.
Modellen antager stationær mikrofon, konstant kildetone og ensartet vindstille luft. Gridafstand er ikke lokationspræcision. | The model assumes a stationary microphone, a constant source tone and uniform, windless air. Grid spacing is not location accuracy.
I tætte områder blev højst de 100 nærmeste flybaner sammenlignet i den detaljerede søgning. | In dense areas, only the 100 nearest flight tracks were compared during detailed search.
Manuelle spor er brugerens optegning, ikke en automatisk bekræftelse af flylyd. | Manual tracks are user measurements, not automatic confirmation of aircraft sound.
Kun én flybane matcher. Spejlede og aflange løsningsområder kan ikke udelukkes. | Only one flight track matches. Mirrored and elongated solution areas cannot be ruled out.
Den globale kandidatsøgning er færdig | Global candidate search complete
Analysen mislykkedes. | Analysis failed.
Forventede et JSON-objekt. | Expected a JSON object.
Ugyldig værdi: {0}. | Invalid value: {0}.
Tidsstempler skal være ISO 8601 med tidszone eller Unix-sekunder (ikke millisekunder). | Timestamps must be ISO 8601 with a time zone or Unix seconds (not milliseconds).
ISO-tidspunkter skal indeholde Z eller en tidszone. | ISO timestamps must include Z or a time zone.
En flyposition eller flyhøjde ligger uden for de tilladte grænser. | An aircraft position or altitude is outside the permitted limits.
Datasættet skal indeholde 1–20.000 fly i feltet flights. | The dataset must contain 1–20,000 aircraft in the flights field.
Fly {0} mangler mindst to punkter. | Aircraft {0} needs at least two points.
Højst 250.000 datapunkter pr. import. | At most 250,000 data points per import.
Flybanen har kun ét unikt tidsstempel. | The flight track has only one unique timestamp.
Fly-id’er skal være unikke. | Flight IDs must be unique.
Lokalt importerede flydata | Locally imported flight data
Importeret lokalt datasæt | Locally imported dataset
Vælg søgeområde på kortet. Klik for at sætte centrum. | Choose the search area on the map. Click to set its centre.
Kort med flybaner og kandidatområder. | Map with flight tracks and candidate areas.
Ukendt | Unknown
Importerede data er ikke uafhængigt kontrolleret. Højder forventes i meter over middelvandstand. | Imported data has not been independently verified. Altitudes are expected in metres above mean sea level.
Flytjenesten returnerede et ukendt format. Prøv lokal import. | The flight service returned an unknown format. Try local import.
Kildehøjder er trykhøjder omregnet fra fod til meter, ikke præcise geometriske højder. Det kan forskyde løsningen. | Source altitudes are pressure altitudes converted from feet to metres, not precise geometric altitudes. This can shift the solution.
API-svaret er afkortet. Flere fly kan findes; indsnævr søgeområdet eller importér et komplet udsnit. | The API response is truncated. More aircraft may exist; narrow the search area or import a complete extract.
{0} ruter uden tilstrækkelige punkter i tidsvinduet blev udeladt. | {0} tracks without enough points in the time interval were omitted.
Flytjenesten har nået sin forespørgselsgrænse. Prøv senere eller importér data. | The flight service request limit has been reached. Try later or import data.
Flytjenesten svarede HTTP {0}. Importér et lokalt datasæt som alternativ. | The flight service returned HTTP {0}. Import a local dataset instead.
Flytjenesten kunne ikke kontaktes. Netværk, CORS eller driftsstop kan være årsagen. Videoen er ikke sendt. Brug lokal JSON/CSV-import. | The flight service could not be reached. Network issues, CORS or an outage may be responsible. Your video was not sent. Use local JSON/CSV import.
Flytjenesten svarede ikke inden for 45 sekunder. Prøv lokal import. | The flight service did not respond within 45 seconds. Try local import.
Kunne ikke aflæse arkivets datoperiode. | Could not read the archive date range.
Datoen ligger uden for tjenestens arkiv ({0} → {1}). Importér historiske data i stedet. | The date is outside the service archive ({0} → {1}). Import historical data instead.
Ingen brugbare flybaner i dette tidsrum. Prøv lokal import. | No usable flight tracks in this time interval. Try local import.
Browserens datagrænse blev nået (20.000 flybaner / 1.000.000 punkter). | The browser data limit was reached (20,000 flight tracks / 1,000,000 points).
Flytjenesten gentog sin næste side. Søgningen blev stoppet for at undgå en uendelig hentning. | The flight service repeated its next page. Retrieval was stopped to avoid an infinite loop.
Hentningen blev begrænset til 200 sider for at skåne den gratis flytjeneste. | Retrieval was limited to 200 pages to avoid overloading the free flight service.
Ingen brugbare flybaner ved tidspunktet i arkivet. Dækning kan mangle; prøv lokal import. | No usable flight tracks in the archive at this time. Coverage may be missing; try local import.
{0} ruter manglede tilstrækkelige positioner i tidsvinduet. | {0} tracks lacked enough positions in the time interval.
Tidsudsnittet medtager afgange op til to døgn før optagelsen. Ældre afgange og fly uden arkivdata kan mangle. | The time extract includes departures up to two days before the recording. Earlier departures and aircraft without archive data may be missing.
Global hentning betyder arkivets tilgængelige flybaner, ikke alle faktiske fly. Dækningen er ujævn. | Global retrieval means the flight tracks available in the archive, not every actual aircraft. Coverage is uneven.
CSV indeholder et ikke-afsluttet anførselstegn. | The CSV contains an unclosed quotation mark.
CSV mangler kolonnen {0}. Se det medfølgende eksempel. | The CSV is missing the {0} column. See the included example.
CSV-række mangler flight_id. | A CSV row is missing flight_id.
Flydata må højst fylde 25 MB. Importér et tids- og områdeudsnit, ikke et globalt dagsarkiv. | Flight data must not exceed 25 MB. Import a time and area extract, not a full global day archive.
Udpak gzip-filen før import i denne browser. | Decompress the gzip file before importing in this browser.
Udpakket datasæt er for stort (maks. 50 MB). | The decompressed dataset is too large (max. 50 MB).
Echotrace syntetisk test — ingen virkelige fly | Echotrace synthetic test — no real aircraft
adsb.aero / adsb.lol · globalt tidsudsnit | adsb.aero / adsb.lol · global time extract
Ingen kandidater | No candidates
Syntetisk test | Synthetic test
`.trim().split('\n').map(line => line.split(' | '))));
