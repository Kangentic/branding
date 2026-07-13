---
description: Create a PR and drive its CI checks to all-green (auto-fixing generators, scripts, and code), then stop. Never merges. This is the Testing column skill. Use /merge-pull-request to merge a green PR.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git:*), Bash(npm:*), Bash(gh:*), Agent, mcp__kangentic__kangentic_get_current_task, mcp__kangentic__kangentic_update_task
argument-hint: [commit message]
---

# Pull Request

Commit, rebase, create a pull request, and drive its CI checks to all-green. This is the **Testing
column** skill for `@kangentic/branding`: it runs branding's real local gate (regenerate every asset
and prove the tree is deterministic), pushes a clean PR, then drives any CI checks to green,
auto-fixing the generators or scripts behind any failure.

It **never merges**. When the PR is green, the user moves the task Testing -> Merge, where
`/merge-pull-request` merges it and pulls the result back into the local `main` checkout.

**Usage:** `/pull-request [commit message]`

- `/pull-request` - auto-generates a commit message from the diff
- `/pull-request add tray monochrome variant` - uses the provided text as the commit message

**User-provided commit message (if any):** $ARGUMENTS

## Pre-flight Checks

All git commands below run from the **current working directory** - never use `cd <path> && git
...` (the single-command Bash rule forbids it, and it triggers an unbypassable security prompt). Use
`git -C <path>` to target another directory.

1. **Detect mode:**
   - If CWD contains `.kangentic/worktrees/` - **worktree mode** (the PR workflow below).
   - Otherwise - **main repo mode**: this skill runs from a task worktree (the Testing column).
     Stop and tell the user to run it from the task's worktree. For a deliberate direct
     quick-push to the source branch that bypasses the PR gate, use `/merge-back`; a version
     cut is `/release`.
2. Get the current branch name: `git rev-parse --abbrev-ref HEAD`
   - If `HEAD` (detached) - warn the user and stop.
3. Derive the project root by walking up from the worktree path - the project root is two
   directories above `.kangentic/worktrees/<slug>/` (strip `.kangentic/worktrees/<slug>` from the
   worktree path).
4. Determine the source branch: `git config kangentic.baseBranch` (fallback: `main`).
5. Run `git status --porcelain` to check for uncommitted changes.
6. Verify the GitHub CLI is authenticated: `gh auth status`. If it fails, report it and stop - this
   skill drives PR checks over `gh` and a long monitor loop must not start unauthenticated.

Report the mode, branch name, source branch, and working tree status before proceeding.

## Step 0 - Local gate (the determinism gate)

Branding is a deterministic asset package: the committed contents of `assets/` and `resources/` must
be exactly what the generators produce. This is the same gate `/release` enforces, run here so a PR
can never ship a hand-edited or stale render. There is no unit/UI/E2E tier to offload - this gate is
the local proof of correctness.

1. Ensure dependencies are present: if `node_modules` is missing (a fresh worktree - worktrees do
   not share `node_modules` with the main repo), run `npm install` first. If it fails with EBUSY, a
   file is locked by a running process; report it and stop.
2. Regenerate every asset, one Bash call each:
   - `npm run gen`
   - `npm run gen:icons`
   - `npm run gen:sprites`
   - `npm run gen:og`
   If any generator errors, report it and stop.
3. Run `git status --porcelain -- assets/ resources/`. It MUST be empty. If anything changed, a
   generator was changed without committing its regenerated output, or an asset was hand-edited
   (never allowed). Stop and report which files drifted - the fix is to commit the regenerated
   output or to fix the script, never to hand-edit the asset. This mirrors the `/release`
   determinism gate and the `generated-assets-determinism` rule.

## Step 1 - Commit Changes

If there are uncommitted changes (non-empty `git status --porcelain` output):

1. Show the user `git status` and `git diff --stat` for a summary of changes.
2. **Determine the commit message:**
   - If `$ARGUMENTS` is non-empty:
     - Check if it already starts with a conventional commit prefix (`feat:`, `fix:`, `refactor:`,
       `chore:`, `docs:`, `test:`, `style:`, `perf:`, `ci:`, `build:`, or any of these with `!`
       before the colon).
     - If it does, use it as-is.
     - If it does not, analyze the diff to determine the appropriate type prefix and prepend it.
       For example: `/pull-request add tray variant` becomes `feat: add tray variant`.
   - If `$ARGUMENTS` is empty:
     - Read the full diff (`git diff`), draft a concise commit message.
     - The message **MUST** use conventional commit format.
     - Determine the primary change type from the diff:
       - `feat:` - new features or capabilities
       - `fix:` - bug fixes
       - `refactor:` - restructuring without behavior change
       - `chore:` - maintenance (deps, config, tooling)
       - `docs:` - documentation-only changes
       - `test:` - test-only changes
       - `style:` - formatting-only changes
       - `perf:` - performance improvements
       - `ci:` - CI/CD changes
       - `build:` - build system changes
     - If the change is breaking, add `!` after the type (e.g., `feat!:`)
     - Scope is optional but encouraged for multi-area changes (e.g., `feat(icons):`, `fix(mark):`)
3. Stage changes: `git add -A`
4. Write the commit message using the **Write tool** to the relative path
   `.kangentic/COMMIT_MSG.tmp` (resolved from CWD - do NOT resolve an absolute path, do NOT use the
   system temp directory, do NOT use `os.tmpdir()`).

   `.kangentic/` is gitignored, so `git add -A` won't stage it and no cleanup is needed.
   Then commit: `git commit -F .kangentic/COMMIT_MSG.tmp`
   **Never write to `.git/`** - in worktrees `.git` is a file, not a directory.
   **Never use `$(...)` or backtick command substitution** - triggers a safety prompt.

If the working tree is clean, skip to Step 1.5.

## Step 1.5 - Compute the clean PUBLIC branch name (never rename the local branch)

The local branch, the worktree folder, and the task's stored `branch_name` together encode
Kangentic's session identity: on a Done-back round-trip the worktree folder is re-derived from them,
and Claude keys its transcript by that folder's path, so renaming the LOCAL branch to a non-auto
name can recreate the worktree at a different path and orphan the session. We therefore NEVER rename
the local branch.

A branch only needs to look professional where it is PUBLIC: the remote branch and the PR head. We
push the unchanged local branch to a clean remote name and open the PR from that. PR state resolves
by `pr_number` (branch-independent), so the local-vs-remote name mismatch is a non-issue once Step 5b
links the number.

Compute `<branch>`, the clean public name. The local HEAD is the push SOURCE and is never touched:

1. `<type>` = the conventional prefix of the Step 1 commit message (`feat`, `fix`, `chore`, ...).
2. `<desc>` = a clean kebab slug of the work. Resolve the task with `kangentic_get_current_task`
   (pass the worktree cwd + the local branch) and slugify its TITLE: lowercase, words joined by
   single hyphens, drop filler ("build", "the", "a", "add", "support for"), drop any trailing
   parenthetical or punctuation, cap to ~4-5 meaningful words. If `$ARGUMENTS` supplied a name,
   prefer it (strip a leading `<type>/`). Per the Conventional Branch spec: only `[a-z0-9-]`, no
   leading or trailing hyphen, no consecutive hyphens.
   - Example: "Two-tier the app icon by displayed context" -> `two-tier-app-icon`.
3. `<branch>` = `<type>/<desc>` (e.g. `feat/two-tier-app-icon`). Every later step uses `<branch>` as
   the push TARGET and the PR head; the push SOURCE is always `HEAD` (the untouched local branch).
4. RESUMING: if the task already has a PR (`task.pr_number` set, or you previously pushed a remote
   branch for it), reuse that existing remote name as `<branch>` so the PR head stays valid - do not
   invent a new one.

## Step 2 - Fetch Latest Source Branch

Run: `git fetch origin <sourceBranch>`

Report if the fetch succeeded or if there were errors (e.g., no remote, authentication failure).

## Step 3 - Rebase onto Source Branch

Run: `git rebase origin/<sourceBranch>`

**If the rebase succeeds** - proceed to Step 4.

**If conflicts occur:**

1. Show the conflicting files using `git diff --name-only --diff-filter=U`
2. Ask the user which approach they prefer:
   - **Resolve conflicts** - open each conflicting file, edit the conflict markers, then `git add
     <file>` and `git rebase --continue`
   - **Abort entirely** - `git rebase --abort` and stop the process
3. If resolving conflicts: read each conflicting file, use `Edit` to resolve the conflict markers,
   stage the file, and continue the rebase. Repeat until all conflicts are resolved.

**After any rebase that touched a generator or a file under `scripts/`, re-run Step 0** - a rebase
can combine two changes that each regenerated cleanly alone but drift together.

## Step 4 - Push the Branch

Run: `git push origin HEAD:<branch> --force-with-lease`

`--force-with-lease` is safe here (a personal worktree branch) and required after a rebase. If it
fails because someone else pushed to the branch, report it and stop - never bare `--force`.

## Step 5 - Create the Pull Request

1. **Determine PR title:** the first line of the most recent commit. If there are several commits
   since the source branch, combine them into one concise title.
2. **Determine PR body:** write a rich, reviewer-facing body and save it to `.kangentic/PR_BODY.tmp`
   with the Write tool (avoids shell escaping). Branding has no `.github/pull_request_template.md`,
   so use these sections:
   - `## What` - what changed and which assets/generators it touches.
   - `## Why` - the motivation or problem. Link any related issue with a closing keyword
     (e.g. `Closes #123`).
   - `## How` - the approach and any trade-offs worth a reviewer's attention.
   - `## Tests` - how it is verified: the determinism gate (all four generators re-run, `assets/`
     and `resources/` clean) plus any CI checks.
   - Footer: `Generated with [Claude Code](https://claude.com/claude-code)`
3. Run: `gh pr create --base <sourceBranch> --head <branch> --title "<title>" --body-file .kangentic/PR_BODY.tmp`

**If PR creation fails because one already exists:** run `gh pr view <branch>` and proceed to
Step 5b with the existing PR.

## Step 5b - Link the PR to the task

1. Extract the PR URL from the `gh pr create` output (or `gh pr view` if it already existed).
2. Parse the PR number from the URL (the numeric ID after `/pull/`).
3. Find the task with `kangentic_get_current_task` (pass the worktree cwd + the local branch).
   `<branch>` is the remote/PR name, NOT the task's `branch_name`, so it is not a valid lookup key.
4. If a task is found, call `kangentic_update_task` with the task ID, `prUrl`, and `prNumber`.

This link is REQUIRED, not just best-effort: because `<branch>` (the PR head) differs from the
worktree's local HEAD by design, Kangentic's branch-based auto-detection will NOT find this PR - the
stored `pr_number` is the only thing connecting the task to it. If the update fails, retry it; do not
leave the task unlinked.

**If the kangentic MCP is unavailable** (it can disconnect/reconnect mid-run): the PR work itself
does not need it - only the Step 1.5 slug and this link do. Do not abort. For the slug, fall back to
deriving `<desc>` from the commit messages instead of the task title. For the link, keep going (the
PR is created and pushed) and retry `kangentic_get_current_task` + `kangentic_update_task` once the
MCP is back (the notification fires when it reconnects); if it never returns this run, report the PR
number prominently so the user can link it in-app.

## Step 6 - Monitor checks until green

Wait for the PR's CI checks to finish, then branch on the outcome. Use `gh pr checks` in watch mode
rather than a manual poll loop (no `sleep` - the single-command rule forbids it):

1. The PR head is `<branch>` (the clean public name from Step 1.5), so `gh pr checks <branch>`
   resolves it. The local HEAD differs by design; PR resolution does not need them to match.
2. Run `gh pr checks <branch> --watch --fail-fast --interval 30` with the Bash tool `timeout` set to
   its MAXIMUM of `600000` ms (10 minutes). Do NOT pass a larger value: the Bash tool clamps/rejects
   anything over 600000. `--watch` returns when the checks settle; `--fail-fast` returns as soon as
   one fails so the fix loop starts promptly.

   Expect a non-zero exit while checks are unfinished. `gh pr checks` returns exit code `8` when not
   all checks have passed yet (still pending OR a genuine failure), which the Bash tool surfaces as a
   "Bash error exit code 8". That is STATUS, not a tooling failure - read the printed rows to decide.
3. **No-checks case (branding today).** CI (GitHub Actions + npm OIDC) is a separate task and may not
   be wired yet. If `gh pr checks <branch>` reports `no checks reported on the '<branch>' branch`,
   there is nothing to gate: skip straight to Step 8 (success) and note explicitly in the report that
   no CI checks are configured yet, so the PR is created and pushed but not CI-verified. Do NOT
   invent checks and do NOT block. When CI lands, this same step gains teeth automatically.
4. Otherwise interpret the result:
   - **All checks passed** (every row `pass`; the watch exited 0): go to Step 8 (success).
   - **A check failed** (a `fail`/`failure` row, or `--fail-fast` returned on a failure): go to
     Step 7 (auto-fix).
   - **The 10-minute Bash timeout fired with checks still only pending** (no failure yet, just
     slow): RE-RUN the same `--watch` command - it resumes from the current state. Repeat as needed.
     Only when the checks have made NO forward progress across two consecutive full 10-minute watches
     (genuinely stuck, not merely slow) go to Step 8b (escalate, stuck checks).

## Step 7 - Auto-fix loop (max 3 rounds, fully automatic)

Do NOT pause to ask. Each round, diagnose every failing check and fix it, then push and re-monitor.
Hard cap: 3 rounds. After the 3rd unsuccessful round, go to Step 8b.

For each round:

1. Pull the failure detail: identify the run (`gh pr checks <branch> --json name,state,link`), then
   `gh run view <run-id> --log-failed`.
2. Classify each problem and act automatically. For branding, a CI failure is almost always one of:
   - **Determinism gate failed on CI** (regenerating changed a committed asset): the committed
     output is stale. Re-run the generators locally (Step 0) and commit the regenerated `assets/` /
     `resources/`.
   - **Generator or script error**: fix the generator or the `scripts/lib` source with `Edit`, then
     regenerate.
   - **A real regression in shipped code**: fix it with `Edit`.
3. Commit the fixes (conventional message via `.kangentic/COMMIT_MSG.tmp`), then push:
   `git push origin HEAD:<branch> --force-with-lease`.
4. Return to Step 6 to re-monitor.

## Step 8 - Report (success)

The PR is green (or has no CI checks yet). Report:
- PR URL (with link) and branch name.
- Number of commits and the determinism-gate result (all four generators re-run, `assets/` and
  `resources/` clean).
- Check status: "all checks green" or "no CI checks configured yet (arrives with the CI task)".
- Next step: the user moves the task Testing -> Merge, where `/merge-pull-request` merges it.

**Do NOT merge.** Merging is `/merge-pull-request`'s job.

## Step 8b - Escalate (after 3 rounds, or stuck checks)

Stop. Do not start a 4th round and do not `--admin` bypass. Leave the PR open, pushed, and with no
half-finished rebase. Report concrete, learned recommendations so a human can finish quickly:
- For each still-failing check: the classification, what each round tried, and the root cause as far
  as you determined it.
- Specific recommendations, e.g. "the generator at `scripts/gen-icons.mjs:<line>` produces
  non-deterministic output", or "the regression is in `scripts/lib/mark.mjs:<line>`".
- The PR URL and the current red/pending check summary.

## Rules

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE command. Never use
`&&`, `||`, `|`, or `;`. For git commands in another directory, use `git -C <path>` - never `cd
<path> && git ...`. Conventional commit messages. No em-dashes or `--` as punctuation.

**Never fork a side-check while this skill is active.** A `subagent_type: "fork"` agent inherits the
full conversation context, including these very instructions. Spawning one to "check on" a background
agent with an ambiguous prompt can cause it to pick up and independently execute the REST of this
skill (commit, push, create a duplicate PR). To check on a background agent, wait for its natural
`<task-notification>` instead of spawning another agent.
