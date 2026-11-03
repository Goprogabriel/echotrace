# Flydata: kontrakt og import

## Hvor data kommer fra

Der er to indgange: den dokumenterede offentlige adsb.aero-API og egne lokale udsnit. De medfølgende fly er **udelukkende syntetiske**. Appen søger ikke automatisk gennem hele adsb.lols globale dagsarkiver.

API-adapteren spørger først `/data-range`. Derefter foretager den én afgrænset `POST /query` med `trajectory_intersects`, `include_path: true` og `limit: 100`. Den kontrollerer den faktisk returnerede arkivperiode og advarer ved afkortede svar. Ingen automatisk polling eller ubegrænset pagination. Tjenestens aktuelle drift og live CORS skal verificeres på din host.

Tidsvinduet udvides bagud til lydenes udsendelsestid; det er forkert kun at hente flypositioner fra det tidspunkt, hvor lyden blev hørt. Søgeområdet for fly er større end kandidatregionen, fordi et hørbart fly kan være langt fra mikrofonen.

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

Højst 25 MB importfil, 50 MB udpakket gzip, 100 flybaner og 250.000 punkter samlet. JSON/CSV kan pakkes som `.json.gz`/`.csv.gz`, hvis browseren understøtter DecompressionStream.

Dette er **ikke** en parser til vilkårlige readsb-arkiver eller rå `.tar`-filer. Et originalt arkiv skal først skæres til og konverteres til kontrakten ovenfor. En ZIP- eller tar-fil kan ikke blot vælges i importfeltet.

## adsb.aero-formatet

Adapteren følger dokumentationens `path.type = MultiLineString`. `path.coordinates[segment][punkt]` er `[lon, lat, pressure_alt_ft]`; `timestamps[segment][punkt]` er parallelle Unix-sekunder. Højden omregnes med `0.3048`.

De sparsomme `path_gs`/andre hastighedsserier har egne tidspunkter og må ikke zippes direkte sammen med positionerne. Matcheren udleder bevægelsen fra positionspunkterne.

Trykhøjde er **ikke** præcis geometrisk højde. Denne forskel korrigeres ikke meteorologisk i version 0.1.0 og vises som et forbehold. API-kilden er angivet som adsb.aero/adsb.lol med ODbL 1.0. Kontrollér gældende kildevilkår før videre distribution.
