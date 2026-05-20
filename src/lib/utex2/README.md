# DDSUtils

DDS texture codec — decodes and encodes BC1/DXT1, BC2/DXT3, and BC3/DXT5
compressed textures to and from raw RGBA pixel buffers.

## Origin

Inspired by and derived from [photopea/UTEX.js](https://github.com/photopea/UTEX.js/)
by the [Photopea](https://www.photopea.com/) team.

UTEX.js is a remarkable piece of work: a compact, dependency-free GPU texture
codec written in plain JavaScript, covering an impressively wide range of
formats (BC1–BC7, ATC, PVR, ETC, ASTC). The fact that something this low-level
and performance-sensitive was made freely available is genuinely appreciated.
Big thanks and kudos to the Photopea team for open-sourcing it.

## What changed from the original

- Unused format handlers (BC7/DX10, ATC, ATCA, ATCI, PVR) removed — only BC1,
  BC2, and BC3 are needed here
- Three-class split (Utex / UtexUtils / UtexDDS) collapsed into a single
  `DDSUtils` class with scratch buffers as persistent instance fields
- DDS format constants moved in as `static` fields
- Explicit `throw new Error(...)` for unsupported formats instead of silent
  fall-through
- Code formatted and linted to match project style
