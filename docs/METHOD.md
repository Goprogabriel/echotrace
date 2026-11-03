# Metode og implementering

Echotrace er en selvstændig eksperimentel implementering. Det er ikke en kopi af den oprindelige videos private kode, og den er ikke valideret som et generelt geolokationsprodukt.

## 1. Lokal afkodning

Browserens `decodeAudioData` i en OfflineAudioContext afkoder hele den valgte fil og resampler til 8.000 Hz. Kanaler blandes ikke blindt: kanalen med højest målt energi vælges for at undgå faseudslukning. Kodekunderstøttelse afhænger af browseren.

Filgrænse: 150 MB. Varighed: 5 sekunder–30 minutter. Varigheden kontrolleres efter afkodning; afkoderen kan derfor kortvarigt bruge mere hukommelse end størrelsen af det endelige 8 kHz-signal. Brug små klip, især på telefoner. Afkodning kan ikke afbrydes internt af browser-API’en; ved annullering ignoreres dens resultat. Arbejdsprocessen og netværksforespørgsler kan stoppes.

Fallback bruger brugeraktiveret, lydløs medieafspilning gennem AudioWorklet. Der anmodes ikke om mikrofonadgang. Udtrækket foregår i realtid, og afspilningsopstart kan forskyde tidsaksen. Denne fallback er implementeret, men ikke valideret på fysiske iOS-/Android-enheder.

## 2. Spektrogram

En egen radix-2 FFT bruger valgfrit 8.192, 16.384 eller 32.768 samples med Hann-vindue. Standardhop er FFT-størrelsen / 8. Bin-afstand er 8.000/8.192 ≈ 0,977 Hz; bin-afstand er ikke det samme som evnen til at adskille to nærtliggende toner. Den effektive tidsudglatning er omtrent vindueslængden (1,024 sekunder). Standardbåndet er 30–1000 Hz og kan ændres inden for 20–2000 Hz. Ved lange optagelser øges hoppet i potenser af to, indtil spektrogrammet højst indeholder fire millioner celler. Højere FFT-størrelse giver længere tidsudglatning, ikke automatisk bedre lokalisering.

Canvas-visualiseringen af brugerfilen tegner det faktisk beregnede spektrogram med kontrast relativt til hver frames estimerede spektrale støjgulv. Zoom og kontrast ændrer kun visningen, ikke lyden eller målepunkterne. Tidsaksen bruger FFT-vinduets centrum, også ved zoom. Forsidens illustration er derimod syntetisk og tydeligt mærket.

## 3. Tonale kurver

En dynamisk programmeringsbaseret ridge-tracker afvejer lokal spektral fremtræden mod spring mellem nabovinduer. Efterfølgende filtre frasorterer stationære, korte, usammenhængende og stærkt hakkende spor. Nære harmoniske dubletter fjernes heuristisk.

Automatiske spor skal ligge på lokale spektrale toppe. En lineær L1-distance-transform i hvert tidsvindue undgår en fast fem-bin-begrænsning ved høj frekvensopløsning. Spor opdeles ved tidsmæssige huller eller store frekvensspring og bedømmes inden for den enkelte passage, ikke som en fast andel af hele klippet. Et absolut dB-cutoff bruges ikke. Harmoniske dubletter sammenlignes kun, når de overlapper i tid; to separate passager i samme frekvensbånd bevares. Op til otte spor foreslås, og brugeren vælger ét til tre til søgningen.

Der kan kun vælges automatisk fundne spor. Hvis analysen ikke finder brugbare spor, kan frekvensbånd og FFT-opløsning justeres før en ny analyse.

Denne implementering er målrettet faldende kurver. Den kan overse kortvarige, svage, delvist skjulte og atypiske passager. Den indeholder ikke en trænet flylydsklassifikator og kan ikke ud fra sporet alene afgøre, om lyden er et fly, en bil, musik eller en anden kilde. Matcheren bruger højst tre udvalgte spor.

## 4. Bevægelse og akustik

Flypunkter konverteres til jordcentrerede tredimensionale koordinater på en sfærisk jord med radius 6.371.000 meter. Lineær interpolation giver position og hastighed i hvert segment. Der ekstrapoleres ikke, og tidsmæssige huller over 30 sekunder accepteres ikke. Segmenter med supersonisk/urealistisk hastighed over cirka 335 m/s bruges ikke.

Modellen antager stationær mikrofon og ensartet stillestående luft. Med c som lydhastighed, R som kilde-modtagerafstand og positiv radial hastighed for en kilde på vej væk løses:

```text
t_modtaget = t_udsendt + R(t_udsendt) / c
f_modtaget = f_kilde × c / (c + v_radial(t_udsendt))
```

Udsendelsestiden løses iterativt. Det undgår fejlen at sammenligne en hørt tone med flyets samtidige, men for sene, registrerede position. Atmosfærisk brydning, vindfelt, multipath/refleksioner, ændrede motoromdrejninger og bevægende kamera er ikke modelleret.

## 5. Global kandidatsøgning

Brugeren angiver alene UTC-starttiden. Flybaner hentes globalt i tidsvinduet. Den stejleste vedvarende frekvenssænkning i det tydeligst faldende spor bruges som startgæt på passagetid. Områder omkring hver flybanes jordprojektion undersøges i afstande fra 2,5 til 250 km med tættere punkter ved nære overflyvninger. Den endelige tilpasning løser lydforsinkelsen og bruger højst 120 km lydafstand. Op til 64 adskilte områder rangeres og undersøges derefter mere præcist med alle valgte spor. Urusikkerhed kan justeres op til ±60 sekunder. Der søges ikke efter en ukendt dato.

For hvert geografisk gridpunkt og hver diskret urjustering beregnes den forventede Dopplerfaktor. En konstant kildetone tilpasses ved vægtede mindste kvadrater. Hvert udvalgt lydspor matches mod den bedst passende flybane. Samme fly kan i princippet forklare flere spor; antal separate fly-ID’er rapporteres særskilt.

Inden for hvert valgt område afsøges et 17×17 grid i en cirkel på 50 km. Højst 100 nærliggende flybaner bruges pr. område. Op til fire adskilte kandidater raffineres i to efterfølgende grids. Dette er en heuristisk coarse-to-fine-søgning, ikke et bevis på et globalt optimum.

## 6. Fejlmål og kandidatgrænser

Et spor bedømmes efter relativ frekvens-RMSE og forbedring i forhold til en konstant observeret tone. Højst tre udvalgte spor skal alle kunne forklares; man kan ikke få et godt resultat ved kun at vælge det ene bekvemme spor og ignorere resten.

Den foreløbige acceptregel er samlet relativ RMSE under 2%, mindst 75% forbedring over konstant-tone-baseline, hvert spor under 3,5% fejl og tilstrækkeligt datamæssigt overlap. Grænserne er ikke statistisk kalibreret. Mange afprøvede hypoteser kan give tilfældige lave fejlmål.

Et enkelt fly giver ofte symmetriske eller aflange kandidatregioner. To eller flere geometrisk forskellige fly kan reducere tvetydigheden, men ukendt klokkeslæt, højde og kildetone kan stadig give falske matches. Kortets punkter og glødende gridceller er visning af beregninger — **ikke** posterior sandsynlighed eller et konfidensområde.

## 7. Hvad næste forskningsarbejde kræver

En dokumenteret præcision kræver samtykkebaserede virkelige optagelser med uafhængigt kendt sted/tid, realistiske negative kontroloptagelser, separate trænings-/valideringsdata og blindtest. Man skal måle fejlfordeling, falske matches, afvisningsrate og robusthed over for vind, mikrofon, motorvariationer, tid, datamangler og mange kandidater.

Ingen sådan real-world-benchmark er inkluderet. De medfølgende syntetiske tests deler modelantagelser med matcheren og er derfor ikke uafhængig fysisk validering.

## 8. Sammenhold med colstos video · 3. november 2026

Primær kilde: [I discovered a sound that leaks your exact location (and it’s everywhere)](https://www.youtube.com/watch?v=UytYrhYLOKI), colsto. Gennemgangen bygger på videoens automatiske engelske transskription og ophavsmandens udvidede beskrivelse, ikke på adgang til hans kode. Beskrivelsen siger, at kode og værktøjer ikke udgives.

- **1:26–2:35:** Zoom og højere frekvensopløsning afslører svage Dopplerkurver og harmoniske. Echotrace tilbyder nu justerbar FFT, analysebånd, visningszoom og relativ kontrast.
- **3:02–7:46:** Han henter en dags amerikanske flydata, fjerner kendte jettyper og bruger to passagers omtrentlige tidsafstand på 920 sekunder. CPA-tider korrigeres for slantafstand og lydforsinkelse; terrænhøjden hentes fra en DEM.
- **8:28–12:55:** En idealiseret Dopplertilpasning giver intervaller for hastighed og CPA-afstand. De bruges til kandidatudvælgelse sammen med tidsafstand og et forsigtigt stilhedsfilter. Manglende automatisk detektion i Echotrace bruges ikke som bevis for stilhed.
- **13:49–20:57:** Faktiske ændringer i flyenes retning, hastighed og højde indgår i modellen. Udsendelsestiden løses før Dopplerberegningen. To events deler samme tidsforskydning; hvert event må ikke flyttes frit for at få et match. Echotraces matcher bevarer dette fælles ur og de oprindelige lydtider, også for separate passager.
- **18:14–20:06:** Hans score summerer spektrogramstyrke langs modelkurven med søgning over kildetone og tidsfejl. Den nuværende Echotrace-version bruger stadig vægtet frekvensfejl mod automatisk fundne linjer; den implementerer ikke hans spektrale brightness-score.
- **22:53–24:29:** I en alternativ søgning bruges cirka ét minuts lyd med kendt tidspunkt og en manuelt optegnet kurve. Hans første eksempel havde kun kendt dag og to passager; præcist klokkeslæt er derfor ikke et generelt fysisk krav. Denne app kræver UTC-starttiden og finder selv mulige områder gennem global kandidatsøgning.

Denne opdatering forbedrer lydarbejdet og lokal kurvetilpasning. Automatisk terrænhøjde, typeklassifikation, udtømmende lands-/verdenssøgning, heldagssøgning, silence-filter og egen historisk datalagring er ikke implementeret. Flydataindlæsningen henter nu det globale tidsudsnit via tidsfilter og begrænset pagination. Lange klip kan bruge meget hukommelse under selve browserafkodningen, selv om spektrogrammets celleantal er begrænset.

### Automatisk genforsøg ved tom lydanalyse

Første indlæsning prøver 16.384 og derefter 32.768 FFT-punkter, hvis den oprindelige opløsning ikke giver spor, og klippet er langt nok til mindst 25 overlappende observationer. Første brugbare resultat beholdes. Hvis ingen opløsning giver spor, vises den højeste afprøvede opløsning og en tydelig forklaring; der konstrueres ingen placering fra et tomt resultat. Den manuelle knap til genanalyse holder sig til brugerens præcise FFT-valg.

For at begrænse tilfældige stier gennem lokale støjtoppe kræver et automatisk spor mindst 75% dækning inden for passagen og samlet frekvensvariation højst to gange nettosænkningen. Disse er stadig heuristiske filtre, ikke statistisk validerede sandsynligheder. Ikke-monotone rigtige passager kan blive afvist og skal undersøges manuelt. De afprøvede opløsninger gemmes i rapportens `resolutionAttempts`.

### Hørbar flylyd er ikke i sig selv en lokaliseringsmåling

Denne implementation følger en smal, vedvarende tone. Den har ikke en generel lydklassifikator, der genkender flylyde ud fra hele optagelsen. En kraftig overflyvning kan derfor være hørbar og synlig på videoen, mens algoritmen afviser alle tonale kurveforslag. Bredt fordelt støj kan ikke omdannes til et målt frekvensspor ved blot at tegne en faldende linje gennem spektrogrammet.

Jet- og propelmotorer kan begge have tonale og bredbåndede komponenter. Det afgørende for denne metode er, om den konkrete optagelse har en adskillelig tone, hvis udvikling kan måles. NASA beskriver eksempelvis både tone- og bredbåndsstøj fra rotor/stator-interaktion: https://www1.grc.nasa.gov/aeronautics/acoustics/instrumentation/hotwire-hotfilm-and-laser-doppler-velocimetry/ . I colstos inspirationsvideo filtreres kendte jettyper fra før kandidatsøgningen omkring 3:35–4:13. Demonstrationen er derfor ikke en validering af generel lokalisering fra enhver tydelig flylyd.

Generel flylydsgenkendelse og lokalisering er forskellige opgaver. En eventuel fremtidig klassifikator kan foreslå, at et klip indeholder flystøj, men det giver ikke i sig selv en position. Lokalisering af klip uden stabile tonale spor kræver en anden fysisk måling/model og selvstændig validering. Denne opdatering implementerer ikke en sådan model.

## 9. Direkte sammenligning med spektrogrammet

Inspireret af [Paras Chopras Southampton-eksempel](https://x.com/paraschopra/status/2117561731065274562) vises modellens Dopplerkurve i cyan på det målte spektrogram. Kortets farvede gridceller viser relativ kurvefejl: gul er lavere fejl, lilla højere. Skalaen går fra laveste fejl til 90-percentilen blandt de beregnede celler og klippes udenfor dette interval. Cellestørrelsen følger søgegriddet i meter; farverne er ikke sandsynligheder. Overlappende globale søgegrids kan tegnes oven på hinanden.

For hver færdig modelkurve måles desuden spektral kontrast. Ved hvert modelleret tidspunkt tages den stærkeste FFT-bin inden for ±1 bin af den forudsagte frekvens. Herfra trækkes medianen af otte nabobins i afstandene 5–8 bins på hver side. Resultatet er medianen af disse dB-forskelle. Målepunkter uden tidsdækning eller med utilstrækkelig plads til sidebånd udelades; dækningen rapporteres. En høj positiv værdi indikerer lydenergi langs modellen, men sidebånd, harmoniske toner og andre lydkilder kan påvirke målingen.

Positionssøgningen og heatmappet bruger stadig frekvensfejl mod valgte spor. Efter søgningen sammenlignes hver modelkurve med seks kontrolkurver forskudt ±12, ±20 og ±32 FFT-bins. Alle kurver bruger de samme tidspunkter med fuld frekvensdækning. Modellen skal have mindst 3 dB median kontrast og mindst 3 dB mere end den stærkeste kontrol, mindst 12 målinger og 70% dækning. Alle valgte spor skal bestå. Kandidatens oprindelige kurveaccept bevares i `curveAccepted`; den endelige `accepted` kræver også lydstøtte. Accepterede kandidater vises først, dernæst sorteres efter kurvefejl. Rapportformat `echotrace-report/3` gemmer kontrolparametrene i `result.audioValidation`.

Grænserne er konservative heuristikker, ikke statistisk kalibrerede p-værdier eller sandsynligheder. Kontrollerne bruger samme optagelse som kurvetilpasningen og er ikke et uafhængigt valideringssæt. Harmoniske toner og andre fly kan medføre afvisning af rigtige spor; tilfældige eller andre lydkilder kan stadig bestå. Kontrollen søger ikke over ukendte kildetoner og er ikke en replikation eller validering af Southampton-forsøget.

## 10. Højdereferencer og originale flydata

adsb.aeros `alt_correction_ft` anvendes som en separat tidsserie: seneste kendte rettelse ved eller før hvert positionspunkt lægges til trykhøjden før omregning fra fod til meter. Der fyldes ikke baglæns før første rettelse, og rettelser genbruges ikke på tværs af dækningssegmenter. Punkterne mærkes `pressure` eller `qnh-msl`. Fysikmodellen interpolerer hverken mellem forskellige referencer eller forskellige segmenter. QNH-rettet MSL er stadig ikke præcis geometrisk højde.

Lokale readsb-traces kan importeres direkte, flere filer ad gangen. Relative sekunder lægges til filens UTC-basistid. Flag for nyt flight leg starter en ny flybane; stale-, ground- og geometrisk-højde-punkter udelades og afbryder forbindelsen mellem nabopunkter. Geometrisk højde er ellipsoidreference og erstatter ikke automatisk MSL. Der gættes ikke på manglende punkter, vind eller terræn. Enkeltstående API-fly og paginerede API-svar kan også importeres uden manuel formatkonvertering.

Et afgrænset liveudsnit med 2 historiske flybaner, 279 positioner og 104 QNH-rettede positioner er indlæst til parserkontrol. Det er ikke et lyd-/lokaliseringsbenchmark. Original lyd med kendt tid og sted mangler stadig.
