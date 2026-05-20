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

This version is tailored to the project's needs — only BC1, BC2, and BC3 are
supported; everything else was removed.
