---
description: Direct quick-push escape hatch for the branding repo - commit, rebase, and push straight to the source branch, bypassing the PR gate. Use only when the user explicitly asks to push, land, or merge back a quick change. The normal flow is the board (the Testing column's /pull-request, then the Merge column's /merge-pull-request). NOT for a plain local commit.
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git:*), Bash(npm:*)
argument-hint: [commit message]
---

# Merge Back

Safely commit, rebase, and push changes straight to the source branch. Works from both worktrees and
the main repo.

This is the **direct quick-push escape hatch**: it bypasses the pull-request gate, so it relies on
admin push access to `main`. It is not wired to a board column. Once the PR flow is wired, the normal
path goes through the board: the **Testing** column runs `/pull-request` (create a PR and drive its
checks green) and the **Merge** column runs `/merge-pull-request` (merge the green PR and pull back).
Reach for `/merge-back` only for a small change you want to land without a PR (e.g. a one-file config
or skill edit, a docs fix, or when CI is unavailable).

**Usage:** `/merge-back [commit message]`

- `/merge-back` - auto-generates a commit message from the diff
- `/merge-back chore: wire board columns` - uses the provided text as the commit message

**User-provided commit message (if any):** $ARGUMENTS

## Pre-flight Checks

All git commands below run from the **current working directory** - never use `cd <path> && git ...`
(triggers an unbypasable security prompt, and violates `.claude/rules/bash-single-command.md`). The
only exception is Step 6, which uses `git -C <projectRoot>` to target the main repo.

1. **Detect mode:**
   - If CWD contains `.kangentic/worktrees/` -> **worktree mode**
   - Otherwise -> **main repo mode**
2. Get the current branch name: `git rev-parse --abbrev-ref HEAD`
   - If `HEAD` (detached) -> warn the user and stop.
3. **Worktree mode only:** Derive the project root by walking up from the worktree path - the project
   root is two directories above `.kangentic/worktrees/<slug>/` (i.e. strip
   `.kangentic/worktrees/<slug>` from the worktree path).
4. Determine the source branch:
   - **Worktree mode:** `git config kangentic.baseBranch` (fallback: `main`)
   - **Main repo mode:** the current branch (push to its own remote tracking branch)
5. Run `git status --porcelain` to check for uncommitted changes.

Report the mode, branch name, source branch, and working tree status before proceeding.

## Step 0 - Determinism gate (regenerate, then require a clean tree)

This repo has no typecheck / lint / test tier - the generators ARE the build, and the committed
`assets/` and `resources/` are generated output that consumers ship. The pre-push gate is therefore
the **determinism check** from `.claude/rules/generated-assets-determinism.md`: regenerating must not
change any committed asset. A drift here means a hand-edit or a stale commit, and pushing it would
ship something no script can reproduce.

1. Ensure dependencies are present: run `npm ci` (the repo has a committed `package-lock.json`; this
   installs `sharp` exactly). If it fails with EBUSY, a file is locked by a running process; report
   it and stop.
2. Regenerate every asset, each in its own Bash call (the single-command rule forbids chaining):
   - `npm run gen`
   - `npm run gen:icons`
   - `npm run gen:sprites`
   - `npm run gen:og`
3. Check the tree: `git status --porcelain assets resources`. If it prints ANY line, regenerating
   changed a committed asset - STOP. Report the changed files and tell the user this is exactly what
   the determinism gate exists to catch: either a committed asset was hand-edited (fix the generator
   / `scripts/lib/mark.mjs` and regenerate, never the asset), or the last asset change was committed
   without its regenerated output. Do not push a drifted tree.

If the tree is clean under `assets/` and `resources/`, proceed. (This is the branding analog of
kangentic's typecheck/lint/guard; there is no code test tier to run here.)

## Step 1 - Commit Changes

If there are uncommitted changes (non-empty `git status --porcelain` output):

1. Show the user `git status` and `git diff --stat` for a summary of changes.
2. **Determine the commit message:**
   - If `$ARGUMENTS` is non-empty:
     - Check if it already starts with a conventional commit prefix (`feat:`, `fix:`, `refactor:`,
       `chore:`, `docs:`, `test:`, `style:`, `perf:`, `ci:`, `build:`, or any of these with `!`
       before the colon).
     - If it does, use it as-is.
     - If it does not, analyze the diff to determine the appropriate type prefix and prepend it. For
       example: `/merge-back wire board columns` becomes `chore: wire board columns`.
   - If `$ARGUMENTS` is empty:
     - Read the full diff (`git diff`), draft a concise commit message.
     - The message **MUST** use conventional commit format.
     - Determine the primary change type from the diff:
       - `feat:` - new capabilities (a new mark tier, a new generated surface)
       - `fix:` - corrections to a generator or the mark geometry
       - `refactor:` - restructuring a script without changing its output
       - `chore:` - maintenance (deps, config, board wiring, tooling)
       - `docs:` - documentation-only changes
       - `style:` - formatting-only changes
       - `ci:` - CI/CD changes
       - `build:` - build/packaging changes
     - If the change is breaking (a new brand generation - a package major), add `!` after the type
       (e.g. `feat!:`). A brand-generation major must be cut through `/release`, which enforces the
       archive gate; do not fake one here.
     - Scope is optional but encouraged (e.g. `feat(mark):`, `fix(sprite):`, `chore(board):`).
3. Stage changes: `git add -A`
4. Write the commit message using the **Write tool** to the relative path `.kangentic/COMMIT_MSG.tmp`
   (resolved from CWD - do NOT resolve an absolute path, do NOT use the system temp directory, do NOT
   use `os.tmpdir()`).

   `.kangentic/` is gitignored, so `git add -A` won't stage it and no cleanup is needed. Then commit:
   `git commit -F .kangentic/COMMIT_MSG.tmp`
   **Never write to `.git/`** - in worktrees `.git` is a file, not a directory.
   **Never use `$(...)` or backtick command substitution** - triggers a safety prompt.

If the working tree is clean, skip to Step 2.

## Step 2 - Fetch Latest Source Branch

Run: `git fetch origin <sourceBranch>`

Report if the fetch succeeded or if there were errors (e.g. no remote, authentication failure).

## Step 3 - Rebase onto Source Branch

Run: `git rebase origin/<sourceBranch>`

**If the rebase succeeds** - proceed to Step 4.

**If conflicts occur:**

1. Show the conflicting files: `git diff --name-only --diff-filter=U`
2. Ask the user which approach they prefer:
   - **Resolve conflicts** - open each conflicting file, edit the conflict markers, then
     `git add <file>` and `git rebase --continue`
   - **Abort and merge instead** - `git rebase --abort` then `git merge origin/<sourceBranch>`
     (creates a merge commit)
   - **Abort entirely** - `git rebase --abort` and stop the merge-back process
3. If resolving: read each conflicting file, use `Edit` to resolve the markers, stage the file, and
   continue the rebase. Repeat until all conflicts are resolved. If a conflict is inside a generated
   file under `assets/` or `resources/`, do NOT hand-resolve it - resolve the generator/source
   change, then re-run Step 0 to regenerate, so the committed output stays reproducible.

## Step 4 - Push to Source Branch

**Worktree mode:** push to the **source branch** (e.g. `main`), NOT the worktree branch name. The
worktree branch is a local working branch only; the goal is to land commits directly on the source
branch.

Run: `git push origin HEAD:<sourceBranch>`

After a successful rebase this is a fast-forward push.

**If the push fails** (e.g. someone else pushed in the meantime):

1. Report the error clearly.
2. Suggest re-running `/merge-back` to fetch the latest and rebase again.
3. Stop - do not force-push.

## Step 5 - Report

Summarize:
- Mode (worktree or main repo)
- Branch name that was merged
- Source branch that received the changes
- Number of commits landed (e.g. `git log origin/<sourceBranch>@{1}..origin/<sourceBranch> --oneline`)
- **Worktree mode only:** remind the user they can clean up the worktree by moving the task to Done
  on the board (which triggers `cleanup_worktree`) or manually.

## Step 6 - Update Local Source Branch (worktree mode only, always runs after Step 5)

**Skip this step entirely in main repo mode** - you are already on the branch.

The project root (from pre-flight step 3) always has the source branch checked out. Keep it in sync.

1. Fast-forward it: `git -C <projectRoot> pull --ff-only`. If this succeeds, you are done.
2. **If it fails, do NOT just log a soft warning - that is how divergence compounds.** A fast-forward
   is impossible the moment the local source branch has even one commit the remote lacks. Diagnose
   and surface it loudly:
   a. `git -C <projectRoot> status -sb` to read the ahead/behind counts.
   b. If the local branch is **behind only** (ahead 0) and the ff still failed, the working tree
      likely has uncommitted changes. Report that and stop - do not stash or discard the user's work.
   c. If the local branch is **ahead** (has unpushed local commits), list them with
      `git -C <projectRoot> log --oneline origin/<sourceBranch>..<sourceBranch>` and name them.
3. **Offer to reconcile the ahead case** (do not do it silently):
   - Rebase: `git -C <projectRoot> rebase origin/<sourceBranch>`.
   - If the user wants those commits on the source branch, push:
     `git -C <projectRoot> push origin <sourceBranch>`.
   - **On conflict, abort cleanly:** `git -C <projectRoot> rebase --abort`, then report the manual
     steps. NEVER leave the running checkout in a half-finished rebase.

**Prevention:** the local source-branch checkout should only ever fast-forward. Do not commit
directly to it - use a worktree or feature branch.

## Rules

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE command. Never use `&&`,
`||`, `|`, or `;`. For git commands in another directory, use `git -C <path>` - never
`cd <path> && git ...`. Conventional commit messages. No em-dashes or `--` as punctuation
(`.claude/rules/text-formatting.md`). No personal names, emails, or machine paths in the commit
message or any committed file (`.claude/rules/no-personal-info.md`).
