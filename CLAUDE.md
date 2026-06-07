# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Never commit anything unless the user explicitly asks to.

## Collaboration

When a direct instruction seems wrong, redundant, or improvable — say so and ask for confirmation before doing anything differently. Never silently substitute a reduced or altered version. Surfacing concerns is good; acting on them unilaterally is not.

## Commit messages

Focus on the *why* — what problem is solved or what capability is added. Implementation
details (data structures, method names, algorithmic choices) belong in the diff, not the
message. One concise sentence or short paragraph is enough.

Never add a `Co-Authored-By` trailer or any other AI attribution footer to commit messages.

For commits where AI assistance produced the actual code changes (not just commit message
wording or routine git operations), append `[AI:Claude]` to the title line:

```
Add atlas extraction scripts for Linux and Windows [AI:Claude]
```

"Assisted" means Claude wrote or substantially modified source files. Drafting the commit
message, formatting, running git commands, or invoking auto-formatting/linting tools
(eslint --fix, prettier, etc.) does not count — even if those tools touch many files.

## Pull request descriptions

Describe the *result* — what the user gets and why it matters. Do not narrate
implementation details or internal design decisions. A short prose summary plus a ticked
test-plan checklist is the expected format:

```
Short description of what was added or changed and why.

## Test plan
- [x] key observable behaviour to verify
```

## Coding standards

Always use curly braces for every `if`, `else`, `for`, `while`, and similar block — even when the body is a single statement. No brace-free one-liners. This matches the project's `curly: all` ESLint rule and avoids the class of bugs that creep in when a second line gets added later.

One class per file where possible. Don't bundle multiple classes into a single module.

File naming follows what the file contains. Files that export a class use PascalCase matching the class name (e.g. `BackgroundFactory.ts` for `class BackgroundFactory`). Everything else — utilities, functions, constants, registries — uses kebab-case.

**Do not read or analyse gitignored directories** (`./samples`, `./notes`, `./.data`, `./.wg-data`, etc.). Only read a
specific file from those locations if the user explicitly points to it.

**Image compositing must use `sharp.composite()`** — never manual per-pixel blending loops. `sharp` is already a
dependency and handles alpha blending, positioning, and opacity correctly and efficiently. If a task feels like manual
blending might be more appropriate (e.g. tight inner loop on a tiny synthetic buffer where pulling in a full sharp
pipeline seems like overkill), ask before reaching for manual blending.

**To control layer opacity, use `applyAlpha(buffer, opacity)` from `~/lib/utils.ts`** before passing the buffer to
`sharp.composite()`. `sharp.composite()` has no built-in opacity option — alpha must be pre-multiplied on the input
buffer directly.

**Prefer a single return over early-return + late-return.** When a fast path and a slow path produce the same type, use the lookup→check→compute→return shape:
```ts
let result = cache.get(key);
if (result === undefined) {
  result = /* compute */;
  cache.set(key, result);
}
return result;
```
Not an early `return cache.get(key)!` followed by a second `return result` at the end.

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
pie-wot icon fetch [query]         # download vehicle icons (all, or one by query)
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
  WGData.ts                       # WGData class — WG API + cache wiring
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
    AtlasManager.ts               # AtlasManager — listNames, pick, extractAll, pack
    texture-atlas.ts              # readTextureAtlas(xmlPath) → TextureRegion[]
    PixelFont.ts                  # PixelFont class, Font type, 4-level alpha encoding
    render-text.ts                # renderText(fontName, text, color?) → RenderedText (RGBA buffer)
    fonts/
      index.ts                    # fonts registry: Record<string, Font>
      monaco.ts                   # Monaco 8px font definition
      font8.ts                    # font8 definition
      minecraft.ts                # Minecraft bitmap font definition
    icons/
      BackgroundFactory.ts        # BackgroundFactory — generates per-type gradient + shield backgrounds
      background-colors.ts        # bgColors — gradient row data per vehicle type
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

**Path alias:** `~` maps to `./src` in both `tsconfig.json` (`paths`) and `vitest.config.ts` (`resolve.alias`). Use
`~/lib/foo.js` style in all imports.

**ESM:** project uses `"type": "module"` — all imports must use `.js` extensions (even for `.ts` source files, per
NodeNext resolution).
