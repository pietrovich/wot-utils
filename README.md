# pie-wot

A CLI toolkit for World of Tanks modders. Fetches live vehicle data from the Wargaming API, manipulates DDS textures and texture atlases, and generates custom icon sets — all from the terminal, no build step required.

The long-term goal is to make it trivial to maintain and publish a custom icon set: when new vehicles are added to the game or tank characteristics change, re-running a handful of commands should be enough to produce an updated, publish-ready set. The [PogS icon set](https://github.com/pavelmaca/WoT-PogsIconSet) by @pavelmaca serves as the reference implementation and first supported style.

## Pre-baked ready to use sets

If you just want the icons without running the pipeline yourself, pre-baked sets are published periodically at [pietrovich/wot-pogs-like-icon-sets](https://github.com/pietrovich/wot-pogs-like-icon-sets) and kept in sync with game updates.

## Install

```bash
npm install -g @pietrovich/pie-wot-utils
cp .env.example .env  # add your WG_APP_ID
```

Get a free application ID at [developers.wargaming.net](https://developers.wargaming.net/).

> **Node.js ≥ 24** required.

## Uninstall

```bash
npm uninstall -g @pietrovich/pie-wot-utils
```

## Commands

```
pie-wot vehicle list              # list vehicles from the WG encyclopedia (table)
pie-wot vehicle export            # save full vehicle data to JSON
pie-wot vehicle fetch-icons       # download official vehicle icons
pie-wot vehicle stats             # short-name character statistics
pie-wot vehicle best-config       # best module configuration per vehicle
pie-wot vehicle chars             # character distribution in short names

pie-wot atlas inspect <map>       # list texture names in an atlas XML
pie-wot atlas pick <map> <img>    # extract a single named texture
pie-wot atlas extract             # extract all textures to a directory
pie-wot atlas pack                # pack a directory of PNGs into a texture atlas

pie-wot dds decode <file>         # decode a DDS texture to PNG
pie-wot dds encode <file>         # encode a PNG to DXT5/BC3 DDS

pie-wot icon dump-background      # generate per-type background images (PogS style)
pie-wot icon render <query>       # render a vehicle icon: type background + short name label

pie-wot font render [font] [text] # render text as PNG using a pixel font

pie-wot cache purge               # clear the local API response cache

pie-wot bake <script>             # run a bundled build script (see below)
```

Vehicle commands accept `--app-id <id>` (overrides `WG_APP_ID`) and `--no-cache`.

### bake

Runs a bundled shell script that drives the full icon-bake pipeline. All arguments after the script name are forwarded to the script unchanged.

```bash
pie-wot bake clear --src ./in/wot-2.3/ --out ./out/clear
pie-wot bake color --src ./in/wot-2.3/ --out ./out/color
```

Available scripts:

| Name | Description |
|------|-------------|
| `clear` | PogS clear variant (no colour background) |
| `color` | PogS colour variant with DMG/FSR/VR/RLD labels |

## Development

### Running from source

No build step needed — `tsx` runs TypeScript directly:

```bash
npm start -- <command>
# e.g.
npm start -- vehicle list
```

### LOCAL_DEV

The bundled baker scripts (`scripts/`) detect whether the `pie-wot` global binary is available and use it by default. Set `LOCAL_DEV=true` in your `.env` (or environment) to force them to use `npm start` from the local clone instead:

```
LOCAL_DEV=true
```

This is useful when iterating on the CLI itself — changes to `src/` take effect immediately without a publish/reinstall cycle.

## How it works

API responses are cached locally (SHA-256 keyed, no TTL) so repeated runs don't hammer the Wargaming API. DDS encode/decode uses a trimmed BC1/BC3 codec derived from [photopea/UTEX.js](https://github.com/photopea/UTEX.js). Image compositing uses [sharp](https://sharp.pixelplumbing.com/).

## Credits

- Gradient data and assets for the PogS icon style ported from [WoT-PogsIconSet](https://github.com/pavelmaca/WoT-PogsIconSet) by [@pavelmaca](https://github.com/pavelmaca)
- DDS codec derived from [photopea/UTEX.js](https://github.com/photopea/UTEX.js) by the Photopea team

---

GL, HF

[![wtfpl-badge-2.png](wtfpl-badge-2.png)](./LICENSE)
