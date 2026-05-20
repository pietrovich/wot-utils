# pie-wot

A CLI toolkit for World of Tanks modders. Fetches live vehicle data from the Wargaming API, manipulates DDS textures and texture atlases, and generates custom icon sets — all from the terminal, no build step required.

The long-term goal is to make it trivial to maintain and publish a custom icon set: when new vehicles are added to the game or tank characteristics change, re-running a handful of commands should be enough to produce an updated, publish-ready set. The [PogS icon set](https://github.com/pavelmaca/WoT-PogsIconSet) by @pavelmaca serves as the reference implementation and first supported style.

## Install

```bash
git clone https://github.com/pietrovich/wot-utils.git
cd wot-utils
npm install
cp .env.example .env   # add your WG_APP_ID
```

Get a free application ID at [developers.wargaming.net](https://developers.wargaming.net/).

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

pie-wot font render [font] [text] # render text as PNG using a pixel font

pie-wot cache purge               # clear the local API response cache
```

Vehicle commands accept `--app-id <id>` (overrides `WG_APP_ID`) and `--no-cache`.

## How it works

API responses are cached locally (SHA-256 keyed, no TTL) so repeated runs don't hammer the Wargaming API. DDS encode/decode uses a trimmed BC1/BC3 codec derived from [photopea/UTEX.js](https://github.com/photopea/UTEX.js). Image compositing uses [sharp](https://sharp.pixelplumbing.com/).

## Credits

- Gradient data and assets for the PogS icon style ported from [WoT-PogsIconSet](https://github.com/pavelmaca/WoT-PogsIconSet) by [@pavelmaca](https://github.com/pavelmaca)
- DDS codec derived from [photopea/UTEX.js](https://github.com/photopea/UTEX.js) by the Photopea team
