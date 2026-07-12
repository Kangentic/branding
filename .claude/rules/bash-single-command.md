# Rule: one command per Bash tool call

Claude Code does not support chained, piped, or stderr-redirected shell
commands. A multi-command Bash call produces errors or silent data loss,
and the `cd <path> && git ...` pattern specifically triggers a security
prompt that cannot be bypassed.

## The rule

Every Bash tool call MUST contain exactly ONE command.

- **Forbidden operators:** `&&`, `||`, `|`, `;`, `2>/dev/null`, `2>&1`.
- **Use dedicated tools instead of shell text:**
  - `Read` (with `offset` / `limit`) replaces `cat`, `head`, `tail`.
  - `Grep` replaces `grep`, `rg`, and any pipe into `grep`.
  - `Glob` replaces `find` and `ls` for file discovery.
  - `Write` replaces `echo` redirection and `cat <<EOF`.
  - The Bash `timeout` parameter replaces `sleep`.
  - Run commands in separate Bash calls instead of joining them.
- **Git in another directory:** always use `git -C <path> ...`. Never
  `cd <path> && git ...`.

This applies everywhere: main sessions, subagents, commands, and skills.
On Windows, prefer the PowerShell tool for multi-line strings.

## Enforcement (self-maintaining)

- **Hook (blocking):** `scripts/bash-guard.js` runs as a `PreToolUse`
  hook (registered in `.claude/settings.json`) and denies any Bash
  command that contains a forbidden operator outside quotes.

## Scope

Governs the Bash tool only. Operators inside quoted strings (e.g. a grep
regex `"a|b"`) are allowed because they are arguments, not separators.
Does not govern shell scripts committed under `scripts/`, which run
outside the agent.
