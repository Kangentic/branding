# Rule: no personal or machine-specific info in committed code

This repository is public. Hardcoded usernames, emails, personal names, or
machine-specific absolute paths leak personal data and break on other
machines.

## The rule

Never hardcode personal or machine-specific values in committed code,
scripts, skills, rules, or docs:

- No personal names, usernames, or emails. Attribute decisions to roles,
  not people: "the maintainer", "maintainer sign-off", "selected
  <date>", "picked from the live review". A dated decision needs no name.
- No home-directory or machine-specific absolute paths (e.g.
  `C:\Users\<name>`, `/Users/<name>`, `/home/<name>`). Derive paths at
  runtime (`import.meta.url` + `fileURLToPath`, `__dirname`, env vars) as
  the generators already do; use `C:\Users\dev` in any example.
- Keep every committed file environment-agnostic and person-agnostic.

## Enforcement (self-maintaining)

- **Review:** any content change is scanned for personal names, emails,
  and home-directory path patterns before commit.
- No mechanical test yet. Given the public-repo stakes, a scan for
  `C:\Users\<name>` (other than `dev`), `/Users/<name>`, `/home/<name>`,
  email literals, and a maintainer-name denylist is a strong candidate
  future CI check.

## Scope

All committed files. Does not apply to gitignored local-only files
(`.kangentic/`, `.claude/settings.local.json`, `kangentic.local.json`) or
to machine config outside the repo.
