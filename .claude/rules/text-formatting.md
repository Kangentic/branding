# Rule: no em-dashes or double-dashes as punctuation

Em-dashes (U+2014) render as garbled characters on Windows console code
pages, and the project ships and dogfoods on Windows. Double-dashes (`--`)
used as separators look awkward in UI text and terminal output.

## The rule

Never use an em-dash (U+2014), `&mdash;`, or `--` as a sentence or list
separator in anything you author: source code, comments, scripts, skills,
rules, docs, commit messages, and user-facing chat.

- Use a single dash for inline separators, e.g. `**Bold** - description`.
- Or restructure the sentence with a period.

This forbids em-dashes you write. It does not forbid em-dashes inside
recorded data, where the character is content, not punctuation you chose.

## Enforcement (self-maintaining)

- **Review:** authored text is scanned for U+2014 and `--` separators
  before commit. A `scripts/` + skill/doc scan for U+2014 is a candidate
  future CI check.

## Scope

Punctuation you author, in any file type. Recorded or captured content is
exempt.
