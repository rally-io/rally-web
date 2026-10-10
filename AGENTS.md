# AGENTS.md — rally-web

Instructions for coding agents working in this repo (Antigravity, Codex, Cursor and others).
Claude Code loads the same text from `.claude/rules/rally-wiki.md`.

## Rally wiki (read first)

The shared knowledge base for all Rally repos is the sibling checkout `../wiki/`
(https://github.com/rally-io/rally-wiki; its rules are in `../wiki/WIKI.md`).

- Before exploring code, read `../wiki/index.md` and open the 1–3 relevant pages. This repo's
  pages are named `web-*`. They hold flows, invariants and gotchas that grep won't surface.
  Trust pages with `verified_at` within 30 days; spot-check older ones against the code.
- Before trusting a doc or spec in this repo, check `../wiki/gotchas/stale-docs.md`. Before
  re-deriving a defect, check `../wiki/gotchas/suspected-bugs.md` (API-side defects; rally-web has no page of its own yet).
- After work that changed code or taught you something non-obvious, update the wiki: run the
  `wiki-ingest` skill (`/rally:wiki-ingest` in Claude Code), or follow the Ingest workflow in
  `../wiki/WIKI.md`.
- No `../wiki/` folder? Clone https://github.com/rally-io/rally-wiki next to this repo, named
  `wiki`. The expected layout and tool setup are in its `playbooks/agent-os-setup.md`.
