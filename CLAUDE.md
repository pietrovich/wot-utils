# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Never commit anything unless the user explicitly asks to.

## Commands

```bash
npm start                           # run CLI via tsx (no build needed)
npx tsx src/index.ts --help         # same, explicit

npm test                            # run all tests (vitest)
npm run test:watch                  # vitest in watch mode
npx vitest run tests/cache.test.ts  # run a single test file

npm run typecheck                   # tsc --noEmit
npm run lint                        # eslint src tests
npm run format                      # prettier --write src tests
```

## Running the CLI

No build step is required. `tsx` runs TypeScript directly via `npm start` or `npx tsx src/index.ts`.

**Commands:**
- `list-vehicles` — fetches all WoT encyclopedia vehicles, prints JSON by default, `--table` for tabular output
- `export` — saves vehicles JSON to a file (`--output <path>`, defaults to `wg-export-<timestamp>.json`)
- `cache-purge` — deletes the local cache directory

All commands accept `--app-id <id>` (overrides `WG_APP_ID`) and `--no-cache` (bypasses file cache).

## Configuration

Copy `.env.example` to `.env`:
```
WG_APP_ID=f84fa60dedf0e5ac9d885bb12cac3adb
WG_CACHE_DIR=.data/cache   # optional, this is the default
```

## Architecture

```
src/
  index.ts              # CLI entry — registers commands via commander, parses argv
  commands/
    list-vehicles.ts    # list-vehicles command handler
    export.ts           # export command handler
  lib/
    api.ts              # WG API client — fetchVehicles(), WGApiError
    cache.ts            # file-based cache — getCached/setCached/purgeCache
    config.ts           # getAppId() — reads WG_APP_ID with --app-id override
    format.ts           # printJson() / printVehiclesTable()
  types.ts              # Vehicle, VehiclesData, WGApiResponse<T>
tests/                  # vitest tests mirroring src/lib/
```

**API base URL:** `https://api.worldoftanks.eu/wot/`

**Cache:** keyed by SHA-256 of `endpoint + sorted params`, stored as `{ fetchedAt, data }` JSON files in `WG_CACHE_DIR`. No TTL — entries persist until `cache-purge` or `--no-cache`.

**ESM:** project uses `"type": "module"` — all imports must use `.js` extensions (even for `.ts` source files, per NodeNext resolution).

