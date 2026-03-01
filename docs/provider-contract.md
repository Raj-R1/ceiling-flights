# Provider Contract

Any flight backend should implement:

```ts
interface FlightProvider {
  fetchSnapshot(center: GeoPoint, radiusKm: number): Promise<AircraftSnapshot[]>;
}
```

Returned aircraft objects must include:

- stable `id`
- `lat`, `lon`
- `timestampMs`

Optional values:

- `callsign`
- `altitudeFt`
- `headingDeg`
- `groundSpeedKt`
