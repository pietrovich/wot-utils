# box-utils

Declarative rectangle-in-box alignment. Describe *where* a rectangle should sit inside a
container; get back `{ left, top, width, height }` ready to pass to `sharp.composite()`.

All output coordinates are integers — rounding is baked in at each component.

---

## Quick start

```ts
import { createAligner } from '~/lib/box-utils/index.js';

const box = { width: 80, height: 24 };

// center a rect over the box center
const aligner = createAligner(box, 'c', 'c');
aligner({ width: 30, height: 10 });
// → { left: 25, top: 7, width: 30, height: 10 }

// pin rect's top-middle to a fixed point
const aligner2 = createAligner(box, 'tm', [10, 5]);
aligner2({ width: 7, height: 6 });
// → { left: 6, top: 5, width: 7, height: 6 }

// 2 px from the right edge, 4 px from bottom
const aligner3 = createAligner(box, 'rm', ['r - 2', 'b - 4']);
```

---

## API

```ts
createAligner(box, rectAnchor, boxAnchor): (rect) => Positioned
```

| Param | Type | Meaning |
|---|---|---|
| `box` | `{ width, height }` | the container |
| `rectAnchor` | `AnchorAliasWithRound` | which point of the rect to pin |
| `boxAnchor` | `AnchorAliasWithRound \| [AxisExpr, AxisExpr]` | where in the box to pin it |

Returns an **aligner** — a function that takes `{ width, height }` and returns
`{ left, top, width, height }`.

Math: `left = boxPointX − rectOffsetX`, `top = boxPointY − rectOffsetY`.

---

## Anchor aliases

Nine named points, written any way you like:

```
tl  t  tr        top-left  top-middle  top-right
lm  c  rm   =    left      center      right
bl  bm br        bottom-left  bottom  bottom-right
```

Every point accepts multiple spellings — short, reversed, or long-form:

| Point | Accepted aliases |
|---|---|
| top-left | `tl` `lt` `top-left` `left-top` |
| top-middle | `tm` `tc` `ct` `top` `top-center` `top-middle` `center-top` `middle-top` |
| top-right | `tr` `rt` `top-right` `right-top` |
| left-middle | `lm` `lc` `cl` `ml` `left` `left-center` `left-middle` `center-left` `middle-left` |
| center | `c` `m` `cc` `center` `middle` |
| right-middle | `rm` `rc` `cr` `mr` `right` `right-center` `right-middle` `center-right` `middle-right` |
| bottom-left | `bl` `lb` `bottom-left` `left-bottom` |
| bottom-middle | `bm` `bc` `cb` `mb` `bottom` `bottom-center` `bottom-middle` `center-bottom` `middle-bottom` |
| bottom-right | `br` `rb` `bottom-right` `right-bottom` |

### Rounding suffix

Anchor offsets can be fractional (e.g. center of a 7-px-wide rect = 3.5).
Append a suffix to control rounding:

| Suffix | Rounding |
|---|---|
| none | `Math.floor` (default) |
| `.+` or `.u` | `Math.ceil` |
| `.-` or `.d` | `Math.floor` (explicit) |

```ts
createAligner(box, 'tm',   [...])  // floor(rect.width / 2)
createAligner(box, 'tm.+', [...])  // ceil(rect.width / 2)
createAligner(box, 'tm.-', [...])  // floor(rect.width / 2) — explicit
```

---

## Axis expressions

When `boxAnchor` is a `[AxisExpr, AxisExpr]` tuple, each element is resolved
independently against the box dimensions. This lets you write box-relative positions
without knowing the exact pixel values at authoring time.

### Dim refs

| Ref | Resolves to | Notes |
|---|---|---|
| `t` `l` | `0` | top / left edge |
| `r` `w` `bw` | `box.width` | right edge / width |
| `b` `h` `bh` | `box.height` | bottom edge / height |
| `c` | `box.width / 2` or `box.height / 2` | axis-aware: x→width/2, y→height/2 |

### Expression forms

```
'r'            → box.width                  (bare dim ref)
'b'            → box.height
'r - 2'        → box.width - 2             (dim ref ± number)
'r + 10'       → box.width + 10
'r / 3'        → box.width / 3             (may produce a float)
42             → 42                         (plain integer)
```

### Rounding in expressions

Suffix goes on the whole expression. Parens are required only when there's an
infix operator:

```
'c.+'          → ceil(box.width/2)          (bare dim ref + suffix, no parens)
'(r / 3).+'    → ceil(box.width / 3)        (grouped expression + suffix)
'(r / 3).-'    → floor(box.width / 3)
'(c).+'        → ceil(c)                   (parens optional for bare dim refs)
```

Default when no suffix: `Math.floor`.

### Examples

```ts
const box = { width: 80, height: 24 };

// right edge minus 2 px, fixed y=5
createAligner(box, 'rm', ['r - 2', 5])

// center horizontally (ceil), 4 px from bottom
createAligner(box, 'bm', ['ceil(c)', 'b - 4'])
// Note: ceil(c) without parens: 'c.+'
createAligner(box, 'bm', ['c.+', 'b - 4'])

// one third from the right, rounded up
createAligner(box, 'tm', ['(r / 3).+', 8])

// box center with sub-pixel control
createAligner(box, 'c.+', 'c')   // rect anchor ceiled, box anchor default-floored
```

---

## Reusing an aligner

The returned function is cheap to call repeatedly — the box and rule are closed over,
only the per-rect math runs each call:

```ts
const center = createAligner({ width: 80, height: 24 }, 'c', 'c');

for (const rect of rects) {
  const pos = center(rect);
  // use pos.left, pos.top …
}
```
