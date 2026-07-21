# Kin Integration Hub

A locally hosted integration service for Kin Dental Centre that keeps patient demographics in **Plato Medical** (the practice management system) and **SIDEXIS 4** (the dental imaging software) in sync, via Sirona **SLIDA**.

## Goal

Reduce patient-identification errors and duplicate patient records when taking dental X-rays, by making Plato Medical the single source of truth for patient demographics:

```
Plato Medical → Integration Service → SLIDA → SIDEXIS 4
```

The first version is a one-way, read-from-Plato / write-to-SIDEXIS integration. SIDEXIS does not write back to Plato in this version.

## Status

**Planning stage.** No official Plato API documentation, SLIDA documentation, test credentials, or confirmed field mappings have been reviewed yet. The next milestone is documentation and interface verification (Phase 0), followed by a read-only Plato API proof of concept (Phase 1).

See [`docs/master-plan.md`](./docs/master-plan.md) for the full integration master plan, including background, architecture, roadmap, and open questions for Plato Medical and Dentsply Sirona. Section 26 of that document contains a ready-to-use resume prompt for continuing this project in a future session.

## Layout

- `docs/` — architecture, data mapping, deployment, clinical workflow, security, and test-plan documents (stubs until each area is confirmed).
- `src/` — application modules (Domain, Plato connector, SLIDA adapter, Sync engine, Storage, Windows Service host, Dashboard). Empty until Phase 1 begins.
- `tests/` — unit and integration test projects. Empty until Phase 1 begins.
- `scripts/` — operational/build scripts.

## Important

Do not begin production coding or connect to real patient data until the supported SLIDA integration method and Plato API details are confirmed from official documentation or the vendors (see `docs/master-plan.md` §4, §21, §22).
