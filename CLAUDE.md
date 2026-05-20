# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Never commit anything unless the user explicitly asks to.

## Commit messages

Focus on the *why* — what problem is solved or what capability is added. Implementation
details (data structures, method names, algorithmic choices) belong in the diff, not the
message. One concise sentence or short paragraph is enough.

## Pull request descriptions

Describe the *result* — what the user gets and why it matters. Do not narrate
implementation details or internal design decisions. A short prose summary plus a ticked
test-plan checklist is the expected format:

```
Short description of what was added or changed and why.

## Test plan
- [x] key observable behaviour to verify
```

**Do not read or analyse gitignored directories** (`./samples`, `./notes`, `./.data`, `./.wg-data`, etc.). Only read a
specific file from those locations if the user explicitly points to it.

## Commands

```bash
npm run build                               # compile src/ → dist/ via tsup (required before npm link)
npm start                                   # run CLI directly via tsx (no build needed)
npx tsx src/index.ts --help                 # same, explicit

npm test                                    # run all tests (vitest)
npm run test:watch                          # vitest in watch mode
npx vitest run tests/some.test.ts           # run a single test file
npm run test:coverage                       # coverage report (excludes src/commands/**)

npm run typecheck                           # tsc --noEmit
npm run lint                               # eslint src tests
npm run lint:fix                           # eslint --fix src tests
npm run format:check                       # prettier --check src tests
npm run format:fix                         # prettier --write src tests
npm run qa                                 # lint + format:check + test:coverage
```

## Running the CLI

No build step is required — `tsx` runs TypeScript directly.

```
pie-wot vehicle list              # list WoT encyclopedia vehicles (table by default)
pie-wot vehicle export            # save vehicles JSON to file
pie-wot vehicle fetch-icons       # download vehicle icons
pie-wot vehicle stats             # short-name character statistics
pie-wot vehicle best-config       # best module config per vehicle
pie-wot vehicle chars             # character distribution in short names

pie-wot atlas inspect <map>       # list texture names in an atlas XML
pie-wot atlas pick <map> <img>    # extract a single named texture to stdout
pie-wot atlas extract             # extract all textures to a directory
pie-wot atlas pack                # pack a directory of PNGs into a texture atlas

pie-wot font render [font] [text] # render text as PNG using a pixel font

pie-wot cache purge               # delete the local cache directory
```

Vehicle commands accept `--app-id <id>` (overrides `WG_APP_ID`) and `--no-cache`.

## Configuration

Copy `.env.example` to `.env`:

```
WG_APP_ID=f84fa60dedf0e5ac9d885bb12cac3adb
WG_CACHE_DIR=.data/cache   # optional, this is the default
```

## Architecture

```
src/
  index.ts                        # CLI entry — commander setup, command tree, argv parse
  app.ts                          # App class — WG API + cache wiring
  types.ts                        # Vehicle, VehiclesData, WGApiResponse<T>
  commands/
    vehicle/
      list.ts                     # vehicle list
      export.ts                   # vehicle export
      fetch-icons.ts              # vehicle fetch-icons
      stats.ts                    # vehicle stats
      best-config.ts              # vehicle best-config
      chars.ts                    # vehicle chars
    atlas/
      inspect.ts                  # atlas inspect
      pick.ts                     # atlas pick
      extract.ts                  # atlas extract (--from base or --image + --map, --to dir)
      pack.ts                     # atlas pack (--from/--src, --to/--dst, --padding, --max-width)
    cache/
      purge.ts                    # cache purge
    font/
      render.ts                   # font render ([font] [text], lists fonts if omitted)
  lib/
    api.ts                        # WG API client — fetchVehicles(), WGApiError
    cache.ts                      # file-based cache — getCached/setCached/purgeCache
    config.ts                     # getAppId() — reads WG_APP_ID with --app-id override
    format.ts                     # printJson() / printVehiclesTable()
    atlas-manager.ts              # AtlasManager — listNames, pick, extractAll, pack
    texture-atlas.ts              # readTextureAtlas(xmlPath) → TextureRegion[]
    pixel-font.ts                 # PixelFont class, Font type, 4-level alpha encoding
    png.ts                        # minimal PNG encoder (node:zlib only, RGB)
    fonts/
      index.ts                    # fonts registry: Record<string, Font>
      monaco.ts                   # Monaco 8px font definition
      font8.ts                    # font8 definition
      minecraft.ts                # Minecraft bitmap font definition
tests/                            # vitest tests mirroring src/lib/
```

**API base URL:** `https://api.worldoftanks.eu/wot/`

**Cache:** keyed by SHA-256 of `endpoint + sorted params`, stored as `{ fetchedAt, data }` JSON files in `WG_CACHE_DIR`.
No TTL — entries persist until `cache-purge` or `--no-cache`.

**AtlasManager:** centralises all texture atlas logic. XML format uses child elements, not attributes (
`<SubTexture><name>…</name><x>…</x>…</SubTexture>`), parsed with `fast-xml-parser`. Packing uses `maxrects-packer` (
named import `{ MaxRectsPacker }`).

**PixelFont:** `Font = Record<string, string[]>`. Four alpha levels: `' '`=0x00, `'-'`=0x40, `'+'`=0xBF, `'X'`=0xFF.
`getPixels()` is memoized with a `Map`.

**`src/lib/png.ts`:** minimal PNG encoder using only `node:zlib` (RGB color type). Used by `font render`. Atlas commands
use `pngjs` for full decode/encode.

**Path alias:** `~` maps to `./src` in both `tsconfig.json` (`paths`) and `vitest.config.ts` (`resolve.alias`). Use
`~/lib/foo.js` style in all imports.

**ESM:** project uses `"type": "module"` — all imports must use `.js` extensions (even for `.ts` source files, per
NodeNext resolution).
