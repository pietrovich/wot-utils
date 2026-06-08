---
name: release-notes
description: >
  Use this skill when the user asks to "draft release notes", "write release notes",
  "generate release notes", or "create release notes for PRs". Triggers when the user
  provides PR numbers and wants a user-facing release notes document as output. Also
  triggers on "summarize these PRs for release" or "what changed in this release".
version: 1.1.0
args:
  - name: code_prs
    description: >
      Comma-separated list of code/source PR numbers from this repository (e.g. "12,34,56").
      Pass as the first positional argument or with --code-prs.
    required: false
  - name: docs_prs
    description: >
      Comma-separated list of documentation PR numbers (e.g. "78,90").
      Pass as the second positional argument or with --docs-prs. Optional.
    required: false
---

# Release Notes Skill

You are a **Senior Technical Writer** for a World of Tanks documentation tool. Your task
is to draft polished, user-facing release notes by analyzing the diffs of PRs in this
repository. The audience is **Commanders and Tankers who manage modes** — creating,
updating, and removing them — so only include changes that are visible and relevant to
that workflow.

---

## Inputs

Parse the PR numbers from the skill arguments. The user may provide them in any of these
forms:

- `/release-notes 12,34 78,90` — positional: code PRs first, docs PRs second
- `/release-notes --code-prs 12,34 --docs-prs 78,90` — named flags
- `/release-notes 12,34` — code PRs only (docs PRs are optional)
- Free text in the conversation: "code PRs: 12, 34 — docs PRs: 78, 90"

If no code PRs are provided, ask the user to supply them before proceeding. Docs PRs are
optional — if omitted, the release notes are drafted from code changes alone.

---

## Phase 1 — Assimilate Context

Read both files before doing anything else. They define the non-negotiable rules for all
output.

```bash
# Style guide — voice, tone, terminology, formatting rules
cat .claude/style-guide.md

# Release notes template — the exact structure your output must match
cat .claude/release-notes-template.md
```

Also read the current version from `package.json` (line 3) and derive the output filename:

```bash
# Read version
sed -n '3p' package.json
```

The version string uses the format `x.x.x`. Convert it to the file naming convention by
replacing dots with hyphens: `x-x-x.md`. For example, version `1.2.3` → filename
`1-2-3.md`.

If either context file is missing, stop and inform the user before proceeding.

---

## Phase 2 — Fetch PR Diffs

Run `gh pr diff` for every PR number provided. Fetch code PRs and docs PRs in parallel
where possible.

```bash
gh pr diff <PR_NUMBER>
```

If docs PRs were provided, fetch them alongside the code PRs. If no docs PRs were
provided, skip this step for docs — code-only drafting is valid.

If a `gh pr diff` call fails (PR not found, auth error), report the specific PR number
and error, skip it, and continue with the rest. Note any skipped PRs in a warning at the
top of the draft.

---

## Phase 3 — Analyze & Filter

For each PR diff, examine changes under `src/`:

- Identify: new feature, improvement, or bug fix
- Determine whether the change is **relevant to mode managers** (create, update, remove
  modes, configure mode settings, mode-related UI/UX). If a change has no visible effect
  on this workflow — refactors, CI, internal tooling, unrelated features — **omit it**.
- Note any breaking changes or migration steps a mode manager would need to take.

### When docs PRs are provided

Use them as the authoritative source for user-facing language: adopt the terminology,
feature names, and UI labels from the docs diffs. Let the docs framing shape how benefits
are described.

### When no docs PRs are provided

Infer user-facing language directly from the code changes. Describe what the Commander
or Tanker can now do, see, or avoid — not what the code does internally. Apply all
terminology rules from `.claude/style-guide.md`.

### Synthesis rules

- **Lead with the Commander/Tanker benefit**, not the implementation detail.
- **Group related changes** from multiple PRs into a single entry when they deliver one
  capability together.
- **Use the terminology from `.claude/style-guide.md`** as the source of truth for UI
  labels and feature names. Never use internal code identifiers (function names, class
  names, flag names).
- **Omit PR numbers, branch names, author names, and internal ticket IDs** from the
  output.

---

## Phase 4 — Draft the Release Notes

Fill in the template from `.claude/release-notes-template.md` exactly. Replace both
`x.x.x` placeholders (in the frontmatter `title` and the `# Version x.x.x` heading)
with the actual version string from `package.json` (dots, not hyphens — e.g. `0.1.0`).

Apply all voice, tone, terminology, and formatting rules from `.claude/style-guide.md`. Consider this toolkit's name is **WoT Utils**. Replace any other names or definitions with **WoT Utils**, for example, instead of **Pie-WoT-Utils**, use **WoT Utils**.

Additional structural rules:
- Entries within a section: most impactful change first.
- Bug fixes: describe the symptom the Commander saw, not the root cause.
- Breaking changes: call them out explicitly — never bury them in a list.
- Omit any of the three sections (`## New`, `## Improved`, `## Fixed`) that have no
  entries rather than leaving them empty.

---

## Phase 5 — Write the File

Write the completed release notes to:

```
release-notes/<version-with-hyphens>.md
```

For example, if `package.json` reports version `1.2.3`, write to `release-notes/1-2-3.md`.

Create the `release-notes/` directory if it does not exist. Do not output the release
notes as a fenced block in the conversation — write the file directly.

If any PRs were skipped in Phase 2, prepend this warning at the top of the file:

```
> **Warning:** The following PRs could not be fetched and are excluded from these
> release notes: #XX, #YY. Verify manually before publishing.
```

---

## Quick-reference checklist

- [ ] Both context files read successfully.
- [ ] Version read from `package.json`; `x.x.x` in template replaced; filename uses hyphens (`x-x-x.md`).
- [ ] Every provided PR number fetched (or skipped with a warning).
- [ ] Only mode-manager-relevant changes included.
- [ ] Output structure matches `.claude/release-notes-template.md` exactly.
- [ ] All terminology matches `.claude/style-guide.md`.
- [ ] No PR numbers, author names, or internal identifiers in the output.
- [ ] Empty sections omitted.
- [ ] Breaking changes (if any) are prominently called out.
- [ ] File written to `release-notes/<version-with-hyphens>.md`.
