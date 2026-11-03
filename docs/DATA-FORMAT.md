# Flydata: kontrakt og import

## Hvor data kommer fra

Der er to indgange: den dokumenterede offentlige adsb.aero-API og egne lokale udsnit. De medfølgende fly er **udelukkende syntetiske**. Appen søger ikke automatisk gennem hele adsb.lols globale dagsarkiver.

API-adapteren spørger først `/data-range`. Derefter foretager den `POST /query` med `trajectory_intersects`, `include_path: true` og `limit: 100`. Global hentning følger cursor med grænserne beskrevet nedenfor. Den kontrollerer den faktisk returnerede arkivperiode og advarer ved afkortede svar. Ingen automatisk polling eller ubegrænset pagination. Tjenestens aktuelle drift og live CORS skal verificeres på din host.

Tidsvinduet udvides bagud til lydenes udsendelsestid; det er forkert kun at hente flypositioner fra det tidspunkt, hvor lyden blev hørt. Flydata hentes uden geografisk filter. Tidspunkter for udsendelse med op til 120 km lydafstand medtages.

## Lokal JSON

Vælg **Importér flydata** på analysesiden. Se `public/examples/schema-example.json`. Dette er et format-eksempel, ikke et brugbart rigtigt flydatasæt.

```json
{
  "schema": "echotrace-flights/1",
  "synthetic": false,
  "source": "Din kilde og dit udsnit",
  "license": "Den relevante datalicens",
  "flights": [
    {
      "id": "unik-flybane-id",
      "callsign": "EKSEMPEL",
      "points": [
        { "t": "2026-08-18T10:59:00Z", "lat": 55.7, "lon": 12.5, "altM": 2200 },
        { "t": "2026-08-18T10:59:02Z", "lat": 55.7, "lon": 12.5036, "altM": 2200 }
      ]
    }
  ]
}
```

Eksempelkoordinaterne ovenfor er opdigtede. Behold `synthetic: true` på alle syntetiske datasæt. For reelle målinger skal du bevare kilde, licens og kvalitetsoplysninger.

| Felt | Betydning |
|---|---|
| `t` | Unix-sekunder som tal eller ISO 8601-streng med `Z`/tidszone. Ikke millisekunder. |
| `lat`, `lon` | Bredde-/længdegrader i decimalgrader. |
| `altM` | Højde i **meter**, ideelt geometrisk højde over middelvandstand. Ikke fod/flight level. |
| `id` | Unikt ID for én kontinuerlig flybane, ikke kun et genbrugt kaldesignal. |
| `callsign` | Menneskeligt læsbart navn. Bruges kun til visning. |
| `type` | Valgfrit, visnings-/metadatafelt. Ingen særskilt motortonedatabase. |

To punkter er minimum for et gyldigt importformat; men meningsfuldt match kræver mange punkter over hele det relevante interval. Punkterne sorteres på tidspunkt, og duplikerede tider fjernes. Der interpoleres ikke over huller på mere end 30 sekunder. Meget sparsomme baner giver dårlig eller ingen tilpasning.

Sigt efter korte intervaller (for eksempel få sekunder) fra lidt før lydens start til lidt efter slutningen, med ekstra historik til lydens rejsetid. Klip ikke til mikrofonens øjeblikkelige position; flyet kan befinde sig langt væk.

## CSV

Påkrævede overskrifter:

```csv
flight_id,callsign,timestamp,lat,lon,alt_m
EXAMPLE-001,SYNTHETIC,2026-08-18T10:59:00Z,55.70,12.50,2200
EXAMPLE-001,SYNTHETIC,2026-08-18T10:59:02Z,55.70,12.5036,2200
```

`callsign` er valgfri. Brug komma som feltseparator og punktum som decimaltegn. Citerede felter og citerede kommaer understøttes. Tidsstempel kan være Unix-sekunder eller ISO 8601 med tidszone. CSV har ikke et felt til datasættets licens eller synthetic-flag; JSON er derfor bedst til dokumenterede/syntetiske datasæt. CSV-import mærkes med ukendt licens — du skal selv kontrollere den.

## Størrelsesgrænser

Højst 25 MB importfil, 50 MB udpakket gzip, 20.000 flybaner og 250.000 punkter samlet. JSON/CSV kan pakkes som `.json.gz`/`.csv.gz`, hvis browseren understøtter DecompressionStream.

Originale readsb-tracefiler (`icao`, `timestamp`, `trace`) understøttes nu direkte som JSON eller gzip. Vælg op til 100 filer sammen; de deler grænsen på 25 MB og 250.000 punkter. Rå ZIP- og tar-arkiver skal stadig udpakkes først. Hver original trace indeholder ét fly med relative tidspunkter, og kan rumme flere flight legs. Dublerede flybane-ID’er afvises frem for at tælle den samme flyvning to gange.

## adsb.aero-formatet

Adapteren følger dokumentationens `path.type = MultiLineString`. `path.coordinates[segment][punkt]` er `[lon, lat, pressure_alt_ft]`; `timestamps[segment][punkt]` er parallelle Unix-sekunder. Højden omregnes med `0.3048`.

De sparsomme `path_gs`/andre hastighedsserier har egne tidspunkter og må ikke zippes direkte sammen med positionerne. Matcheren udleder bevægelsen fra positionspunkterne.

Trykhøjde er **ikke** præcis geometrisk højde. Tilgængelige `alt_correction_ft`-værdier lægges nu til trykhøjden ved hjælp af deres egne tidspunkter og forward-fill inden for hvert segment. Manglende rettelser giver trykhøjde som fallback. Der hentes ikke yderligere meteorologiske data. API-kilden er angivet som adsb.aero/adsb.lol med ODbL 1.0. Kontrollér gældende kildevilkår før videre distribution.

## Global API-hentning

`trajectory_intersects` indeholder kun `time_from` og `time_to`, ingen `geometry`. Der hentes sider via samme forespørgsel og `cursor`, med `start_from` to døgn før tidsvinduet. En enkelt side bruger limit 100. Højst 200 sider, 20.000 unikke fly eller 1.000.000 tidsrelevante punkter beholdes. `retrieval` gemmer faktiske sider, rå flyantal, udeladte ruter, tidsgrænser og om API-hentningen blev fuldført. Lokal import har ingen garanti for global dækning.


## Import af originale data og kvalitetsmærkning

Importer gemte adsb.aero-forespørgselssvar eller et enkelt API-fly direkte. Har svaret en cursor, vises en advarsel om manglende sider; importen henter ikke automatisk mere fra nettet. Kilde og licens bevares for API-data. Generiske readsb-filer får ukendt licens, da formatet alene ikke dokumenterer datakilden.

Punkter kan indeholde `segment` (ikke-negativt heltal) og `altitudeReference` (`msl`, `pressure`, `qnh-msl`). De bevares ved genimport. Segment- og referenceskift afbryder fysisk interpolation. Native filer uden disse felter følger den eksisterende MSL-kontrakt.

readsb-import følger [det originale traceformat](https://github.com/wiedehopf/readsb/blob/dev/README-json.md#trace-jsons). Flag 1 (stale), ground-rækker og flag 8 (geometrisk højde) udelades; flag 2 starter en ny flybane. Hvert udeladt punkt afbryder forbindelsen mellem omgivende punkter. Kildens sparsomme positionskvalitetsmetadata bruges endnu ikke som måleusikkerhed. Den resterende trykhøjde omregnes med 0,3048 m/fod.
