# Third-party notices

`@kangentic/branding` ships no third-party code. This file records the places a
third party's work informed a shipped asset.

## lucide

**Where:** `scripts/lib/ui-glyphs.mjs`, the `kanban` glyph
(`assets/ui/kanban.svg` and the `resources/mobile/kanban-tab-*.png` rasters).

**What was used:** the proportions of lucide's `SquareKanban` - an 18x18 frame
on a 24 grid at stroke 2, with three lanes at x 8/12/16 sharing a top edge at
y 7 and ending at y 14/11/16. That is the shape kangentic-mobile reviewed and
chose for its Board tab, against a stroke-2.5 variant and a filled-lane variant,
after finding that SF Symbols ships no kanban glyph.

**How it was used:** the geometry is declared as named constants in
`scripts/lib/ui-glyphs.mjs`, not vendored as path data. This follows the
precedent the activity set already set with lucide Mail's flap ratios: the
proportions are lucide's and the ink box is ours. No lucide source file, path
string, or build artifact is copied into or distributed by this package.

**Where, second:** `scripts/lib/activity.mjs`, the `agent-approval` shield
(`assets/activity/agent-approval.svg`), added 2026-10-29.

**What was used:** the proportions of lucide's `shield`, chosen at maintainer
review as the bar for the mark's definition: a top that rises from each corner
to a central peak, small corner radii, straight sides, and a curved base
meeting at a point.

**How it was used:** the same way as `kanban` above. The shape is rebuilt from
named constants (`SHIELD`, `R_SHIELD`, `SHIELD_CREST_TALL`) as circular arcs on
this set's own grid, 18 wide and 20 tall where lucide's is 16 by about 20. No
lucide path string or file is copied or distributed.

Feather, whose icons lucide inherited, also ships a `shield`, so lucide's may
be one of the Feather-derived icons under MIT. That was not verified when this
entry was written (2026-10-29). It would matter only if path data were ever
vendored, and nothing is, so the ISC notice below is reproduced as a courtesy,
matching the `kanban` entry.

**Where, third:** `scripts/lib/activity.mjs`, `CARD_NEIGHBOURS` (added
2026-11-04), which the review page `exploration/activity/stopped.html` draws.

**What was used:** the path data of the nine lucide glyphs a task card renders
beside its activity mark, copied verbatim from lucide-react 1.61.0. A new mark
has to be judged beside the real neighbours, and a redraw would misstate them.

**How it was used:** as comparison data for a review page. Unlike the two entries
above, this IS copied path data, so the sentence in the `kanban` entry about
nothing being copied holds for the published package, not for this repository:
`files` in `package.json` is `assets` and `resources`, so `scripts/` and
`exploration/` never reach npm. No shipped asset contains these paths. `clock`,
`terminal` and `circle-pause` (lucide's `pause-circle`) are Feather-derived, so
the MIT notice below applies to those three and the ISC notice to the other six.

lucide carries two licences: ISC for the project, and MIT for the icons it
inherited from Feather. `square-kanban` is NOT one of the Feather-derived
icons, so only the ISC notice applies to the first entry. Reproduced in full:

```
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

Verified against https://github.com/lucide-icons/lucide/blob/main/LICENSE on
2026-07-29.

The MIT notice for the Feather-derived icons, read off the `LICENSE` file in
lucide-react 1.61.0 on 2026-11-04:

```
The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Homepage: https://lucide.dev - Source: https://github.com/lucide-icons/lucide
