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

Manuel optegning kræver mindst tre punkter over mindst otte sekunder. Punkterne forbindes lineært til kurvetilpasningen. De oprindelige ankre og `source: manual` bevares i rapporten. Optegningen beviser ikke, at der er en tone i lyden; det er brugerens måling. Automatisk og manuelt optegnede spor bruger samme matcher og fælles tidsjustering.

Denne implementering er målrettet faldende kurver. Den kan overse kortvarige, svage, delvist skjulte og atypiske passager. Den indeholder ikke en trænet flylydsklassifikator og kan ikke ud fra sporet alene afgøre, om lyden er et fly, en bil, musik eller en anden kilde. Matcheren bruger højst tre udvalgte spor.

## 4. Bevægelse og akustik

Flypunkter konverteres til jordcentrerede tredimensionale koordinater på en sfærisk jord med radius 6.371.000 meter. Lineær interpolation giver position og hastighed i hvert segment. Der ekstrapoleres ikke, og tidsmæssige huller over 30 sekunder accepteres ikke. Segmenter med supersonisk/urealistisk hastighed over cirka 335 m/s bruges ikke.

Modellen antager stationær mikrofon og ensartet stillestående luft. Med c som lydhastighed, R som kilde-modtagerafstand og positiv radial hastighed for en kilde på vej væk løses:

```text
t_modtaget = t_udsendt + R(t_udsendt) / c
f_modtaget = f_kilde × c / (c + v_radial(t_udsendt))
```

Udsendelsestiden løses iterativt. Det undgår fejlen at sammenligne en hørt tone med flyets samtidige, men for sene, registrerede position. Atmosfærisk brydning, vindfelt, multipath/refleksioner, ændrede motoromdrejninger og bevægende kamera er ikke modelleret.

## 5. Afgrænset søgning

Brugeren angiver et område og en UTC-starttid. UI tilbyder radius op til 50 km og urusikkerhed op til ±60 sekunder. Der er ikke en global geografisk søgning eller søgning efter en ukendt dato.

For hvert geografisk gridpunkt og hver diskret urjustering beregnes den forventede Dopplerfaktor. En konstant kildetone tilpasses ved vægtede mindste kvadrater. Hvert udvalgt lydspor matches mod den bedst passende flybane. Samme fly kan i princippet forklare flere spor; antal separate fly-ID’er rapporteres særskilt.

Først afsøges et 17×17 grid afgrænset til en cirkel. Op til fire adskilte kandidater raffineres i to efterfølgende grids. Dette er en heuristisk coarse-to-fine-søgning, ikke et bevis på et globalt optimum.

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
- **18:14–20:06:** Hans score summerer spektrogramstyrke langs modelkurven med søgning over kildetone og tidsfejl. Den nuværende Echotrace-version bruger stadig vægtet frekvensfejl mod automatiske eller manuelt optegnede linjer; den implementerer ikke hans spektrale brightness-score.
- **22:53–24:29:** I en alternativ søgning bruges cirka ét minuts lyd med kendt tidspunkt og en manuelt optegnet kurve. Hans første eksempel havde kun kendt dag og to passager; præcist klokkeslæt er derfor ikke et generelt fysisk krav. Denne app kræver stadig en omtrentlig UTC-starttid og et afgrænset område.

Denne opdatering forbedrer lydarbejdet og lokal kurvetilpasning. Automatisk terrænhøjde, typeklassifikation, CPA-baseret lands-/verdenssøgning, heldagssøgning, silence-filter og egen historisk datalagring er ikke implementeret. Flydataindlæsningen er bevaret til en efterfølgende opdatering. Lange klip kan bruge meget hukommelse under selve browserafkodningen, selv om spektrogrammets celleantal er begrænset.
