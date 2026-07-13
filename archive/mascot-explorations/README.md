# Mascot exploration archive

The full progression behind the Overseer mascot and the earlier
mascot-based branding, frozen so nothing is lost. Nothing here is
regenerated or shipped; the live mascot pipeline is `scripts/gen-sprites.mjs`
+ `scripts/gen-og.mjs`, and the current app icon is the K brandmark
(`resources/`).

- **`scripts/`** - the exploration generators, superseded by the migrated
  pipeline:
  - `gen-concepts.mjs` - the creature concept rounds (invader, chomper,
    rocket, board creatures, the Overseer color studies).
  - `gen-app-icons.mjs` - app icon sets built from the amber Overseer
    (border / no-border / transparent / production). Superseded by the K
    brandmark icon tree in `resources/`; kept because the mascot-icon
    treatment may return.
  - `gen-brand.mjs` - the original OG-image + legacy logo-candidate
    generator. The OG half became `scripts/gen-og.mjs`; the logo-candidate
    half is retired (see `legacy-logo-candidates/`).
- **`sprite-concepts/`** - every sprite/creature PNG + SVG from the
  exploration: the kangaroo hop frames, the Overseer color studies, the
  board-creature variants, and the rejected arcade creatures.
- **`mascot-icon-sets/`** - the four superseded mascot-based app icon sets.
- **`legacy-logo-candidates/`** - the original blue "K" (`logo-blue-original.png`)
  and the recolored / pixel-mark candidates that predate the K brandmark.

Decision history in prose: the `sprite-drafting` skill.
