---
description: Merge an already-green PR (rebase merge, delete branch) and fast-forward the local main checkout. This is the Merge column skill. It assumes the Testing column (/pull-request) already drove the PR green. It does NOT publish - use /release to publish @kangentic/branding. Not for creating a PR (use /pull-request).
allowed-tools: Read, Glob, Grep, Edit, Write, Bash(git:*), Bash(npm:*), Bash(gh:*), Agent, mcp__kangentic__kangentic_get_current_task, mcp__kangentic__kangentic_link_pr
---

# Merge Pull Request

Merge a green pull request and pull the result back into the local `main` checkout. This is the
**Merge column** skill for `@kangentic/branding`. It assumes the **Testing column**
(`/pull-request`) already created the PR and drove its CI checks to green.

It verifies the required CI checks are green, then merges with `--admin` to waive the review
requirement: once branch protection on `main` requires an approving review, a maintainer's own PRs
get no second reviewer, so that bypass is the normal Merge path. It NEVER bypasses the CI checks -
those are confirmed green first; the `--admin` only waives the missing review. (Until branch
protection is configured, there is nothing to waive and `--admin` is a harmless no-op.)

**This skill does NOT publish.** Landing a PR onto `main` and publishing a new `@kangentic/branding`
version are separate concerns. Publishing (regenerate + determinism gate, version bump, changelog,
tag, GitHub release, npm publish) is `/release`, run deliberately when cutting a version. This skill
stops at the merge and the local `main` fast-forward.

**Usage:** `/merge-pull-request`

## Pre-flight Checks

All git commands run from the **current working directory** - never `cd <path> && git ...`. Use
`git -C <path>` to target another directory.

1. **Detect mode:** worktree mode requires CWD to contain `.kangentic/worktrees/`. If this is the
   main repo (no worktree), stop and tell the user this skill runs from a task worktree (the Merge
   column).
2. Get the current branch: `git rev-parse --abbrev-ref HEAD`. If `HEAD` (detached), warn and stop.
3. Derive the project root: two directories above `.kangentic/worktrees/<slug>/` (strip
   `.kangentic/worktrees/<slug>` from the worktree path).
4. Determine the source branch: `git config kangentic.baseBranch` (fallback: `main`).
5. Verify the GitHub CLI is authenticated: `gh auth status`. If it fails, report it and stop.

## Step 0 - Resolve the PR (by stored number first, head branch as fallback)

The PR's head branch may NOT equal the worktree's local branch. `/pull-request` pushes the unchanged
local branch to a clean PUBLIC remote name (`<type>/<desc>`) and opens the PR from THAT, keeping the
local branch as the session-safe slug-hex (see `/pull-request` Step 1.5). So resolve the PR by the
stored `pr_number` first (branch-independent), falling back to the head branch only when there is no
stored number.

1. `<branch>` is the current LOCAL branch from pre-flight. It is used later ONLY for local git
   operations (the worktree realign), NEVER for `gh pr` lookups.
2. Resolve the PR number `<pr>`:
   - Call `kangentic_get_current_task` (it reads the worktree's task) and take its `pr_number`. If
     present, that is `<pr>` (the reliable, branch-independent path). Also record the returned task's
     ID as `<taskId>` - it is reused in Step 2 to force an immediate board refresh after the merge.
     If no task is found, `<taskId>` stays unset and that refresh is skipped.
   - If absent, fall back to the head branch: `gh pr list --head <branch> --state open --json number`
     (covers older PRs where the local branch IS the head); `<pr>` is the first match's number.
3. Run `gh pr view <pr> --json number,url,state,mergeable,mergeStateStatus,statusCheckRollup,headRefName`.
   Record `<prHead>` = `headRefName` (the PR's REMOTE head branch - the push and merge target).
4. If no PR resolves either way, stop and report that the Testing column should have created one (run
   `/pull-request` from the Testing column first). Do not create a PR here.

Every later `gh pr` command (view, checks, merge) targets `<pr>` or `<prHead>`; the local `<branch>`
is for local git only.

## Step 1 - Re-verify (rebase if main moved, confirm green and mergeable)

1. `git fetch origin <sourceBranch>`.
2. If `<sourceBranch>` moved since the PR went green, rebase onto it: `git rebase origin/<sourceBranch>`
   (resolve conflicts the same way `/pull-request` does, or abort and report). If the rebase changed
   history, push the local HEAD to the PR's remote head: `git push origin HEAD:<prHead> --force-with-lease`.
   After any rebase that touched a generator or a file under `scripts/`, re-run branding's
   determinism gate (`npm run gen`, `gen:icons`, `gen:sprites`, `gen:og`, then
   `git status --porcelain -- assets/ resources/` must be empty) before merging.
3. Re-read the PR state: `gh pr view <pr> --json mergeable,mergeStateStatus,statusCheckRollup`.
   **Require every required status check in `statusCheckRollup` to be green (SUCCESS).** That is the
   real gate - do not rely on the merge command to enforce it.
   - **No required checks yet (branding today):** if `statusCheckRollup` is empty because CI has not
     landed, the check gate is vacuously satisfied - proceed. When CI lands, this same gate has teeth
     automatically.
   - `mergeStateStatus` may read `BLOCKED` rather than `CLEAN` once branch protection requires a
     review the maintainer's own PR does not have; that block is EXPECTED and is waived by the
     `--admin` merge in Step 2. But if a required CHECK is failing or still pending (not merely the
     review), stop (or wait - step 4); never `--admin` past a red or pending check.
4. If the rebase (step 2) re-triggered checks and they are pending, wait for them with
   `gh pr checks <pr> --watch --fail-fast --interval 30` (Bash `timeout` = `600000` ms, re-run while
   still pending). If they go red, stop and report - this should be rare because Testing already
   drove them green; the user can move the task back to Testing to re-run `/pull-request`.

## Step 2 - Merge the PR

Only after Step 1 confirmed every required CHECK is green (or there are none yet), merge with the
maintainer bypass that waives the missing review:

Run: `gh pr merge <pr> --admin --rebase --delete-branch`

- `--admin`: waives the required approving review (the maintainer's own PR gets no second reviewer).
  It does NOT relax the CI gate - Step 1 already verified the checks; this only clears the review
  block. Until branch protection is configured there is no review to waive, so it is a no-op. NEVER
  run it without the green-check verification (it would also bypass any checks that exist).
- `--rebase`: lands the individual commits on the source branch (no merge commit).
- `--delete-branch`: deletes the remote PR head branch (`<prHead>`). The local `<branch>` has a
  different name (the slug-hex), so gh's local-branch delete is a no-op and the worktree branch stays
  for the realign below.

**Merge-method fallback - if `--rebase` fails with "can't be rebased":** the PR history contains a
merge commit (typically from a mid-task `git merge origin/<sourceBranch>` that integrated the base
with conflict resolutions). GitHub cannot linearize that, so a rebase merge is impossible. Fall back
to a SQUASH, which still keeps `<sourceBranch>` LINEAR and lands the feature as one commit (the
granular history stays preserved in the PR): `gh pr merge <pr> --admin --squash --delete-branch`. Do
NOT use `--merge`: a merge commit would break the linear-`main` convention this repo maintains.
Record `<mergeMethod>` (rebase or squash) - it selects the realign below.

**If the merge fails** for any OTHER reason than the expected missing-review block (e.g. the branch
is behind and needs a rebase first, or a required check actually went red), do NOT force past it -
report the unmet requirement and stop.

### Refresh the board's PR status

The board caches each task's PR state and only re-resolves it on a background timer (default 5 min)
or on project open, so the Merge card would otherwise keep showing "PR #<pr> open" for minutes after
this merge. Force an immediate re-resolve so the card flips to "merged" right away:

- If Step 0 resolved a `<taskId>`, call `kangentic_link_pr` with that task ID. It re-resolves the PR
  by number (branch-independent, so it works after `--delete-branch`), writes the fresh `merged`
  state, and pushes the update so the board card re-renders at once.
- If no `<taskId>` was resolved (the worktree has no linked task), skip this - there is no board card
  tracking the PR, so nothing is stale.

Run this right after the merge succeeds, before the realign below, so the board updates even if the
realign later needs to stop for a conflict.

### Realign the worktree branch (so move-to-Done reads clean)

The merge rewrote the PR commits onto `<sourceBranch>` (new SHAs for a rebase merge, or a single new
squash commit), so the worktree's local branch still holds the pre-merge commits. Left as-is, the
board's move-to-Done check reports them as "N commits remain only on the local branch" - a false
positive. Realign the worktree branch onto the merged base, by `<mergeMethod>`:

1. Confirm the worktree is clean: `git status --porcelain` (empty right after the merge). If it is
   NOT empty, skip the realign and report - never discard uncommitted work.
2. `git fetch origin <sourceBranch>` to refresh the merged base.
3. Realign by merge method:
   - **rebase merge:** `git rebase origin/<sourceBranch>`. Git drops the now-merged commits (matched
     by patch-id) and replays only any genuinely-unmerged local commits, leaving the branch at the
     merged HEAD (plus any real leftover work, which SHOULD still warn on move-to-Done).
   - **squash merge:** the local commits do NOT patch-match the single squash commit, so a rebase
     would not cleanly drop them. Since step 1 confirmed the worktree is clean and every change is
     now in the squash on `<sourceBranch>`, reset the branch to the merged base instead:
     `git reset --hard origin/<sourceBranch>`. This is safe PRECISELY because the worktree is clean
     and the content is fully merged; never reset if step 1 found uncommitted work.
4. On a rebase conflict (rare - only a genuinely-unmerged local commit can clash), abort cleanly:
   `git rebase --abort`, then report. Never leave a half-finished rebase in the worktree.

## Step 3 - Pull back into the local main checkout

The project root is the maintainer's `main` checkout, so keep it fast-forwarded to the freshly merged
`main`. Handle divergence loudly rather than letting it compound.

1. Fast-forward it: `git -C <projectRoot> pull --ff-only`. If this succeeds, you are done.
2. **If it fails, do NOT just log a soft warning - that is how divergence compounds.** A
   fast-forward is impossible the moment the local source branch has even one commit the remote
   lacks. Diagnose and surface it:
   a. Run `git -C <projectRoot> status -sb` to read the ahead/behind counts.
   b. If the local branch is **behind only** (ahead 0) and the ff still failed, the working tree
      likely has uncommitted changes. Report that and stop - do not stash or discard the user's work.
   c. If the local branch is **ahead** (has unpushed local commits), list them with
      `git -C <projectRoot> log --oneline origin/<sourceBranch>..<sourceBranch>` and name them. These
      block every future ff-pull until reconciled.
3. **Offer to reconcile the ahead case** (do not do it silently):
   - Rebase: `git -C <projectRoot> rebase origin/<sourceBranch>`.
   - If the user wants those commits upstream, push: `git -C <projectRoot> push origin <sourceBranch>`.
   - **On conflict, abort cleanly:** `git -C <projectRoot> rebase --abort`, then report manual steps.

The remote `main` is already updated by Step 2, so a failure here is non-fatal to the merge - but it
is not "ignore and move on": an un-surfaced local commit will keep breaking this step.

**Prevention:** the local `main` checkout should only ever fast-forward. Do not commit directly to
it - use a worktree or feature branch.

## Step 4 - Report

Summarize:
- PR URL (with link) and the branch that was merged.
- The source branch that received the changes and the number of commits landed.
- Branch cleanup status: the remote PR head (`<prHead>`) deleted by `--delete-branch`; the local
  worktree branch (`<branch>`, a different name) realigned to the merged base and removed later by
  move-to-Done.
- Local `main` checkout status (fast-forwarded, or the divergence you surfaced).
- **This skill did NOT publish.** To ship a new `@kangentic/branding` version to consumers
  (kangentic.com, the desktop app, kangentic-mobile), run `/release` deliberately.
- **Reminder:** move the task to Done on the board to trigger worktree cleanup and remove the local
  worktree.

## Rules

**CRITICAL: No chained commands.** Every Bash call must contain exactly ONE command. Never use
`&&`, `||`, `|`, or `;`. For git commands in another directory, use `git -C <path>` - never `cd
<path> && git ...`. Conventional commit messages. No em-dashes or `--` as punctuation.
