# Third-party notices

`@kangentic/branding` ships no third-party code. This file records the one place
a third party's work informed a shipped asset.

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

lucide carries two licences: ISC for the project, and MIT for the 158 icons it
inherited from Feather. `square-kanban` is NOT one of the Feather-derived
icons, so only the ISC notice applies here. Reproduced in full:

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

Homepage: https://lucide.dev - Source: https://github.com/lucide-icons/lucide
