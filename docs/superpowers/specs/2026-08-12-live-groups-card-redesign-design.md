# Live groups screen — standings card redesign

- **Date:** 2026-08-12
- **Status:** Approved (brainstorming session with mockups; user selected each option)
- **Branch:** `live-groups-two-tabs`
- **Scope:** `src/features/publicTournament` (public live tournament screen), web only. No API changes.

## Context

The public live screen's בתים (groups) tab shows one `GroupBoardCard` per group on the TV board.
Three pieces of feedback on the current card:

1. Rows are spread across the full card height (`justify-evenly`), leaving large gaps.
2. Only the final games difference is shown (`+10`); players want the actual distribution.
3. Pair names truncate with `…`; full names must always be visible, on every card and screen.

## Approved decisions

These were chosen from mockup variants; they are decisions, not open questions.

1. **Tight rows.** Drop the `justify-evenly` stretch. Rows form a compact, vertically centered
   cluster with a small fixed gap; leftover card height splits around the cluster.
2. **Games distribution column (משחקונים).** Shows cumulative games as won–lost (e.g. `20–10`).
   The pair's **own games are always green, the opponents' games always red** — on every row,
   regardless of who leads. (Explicit user clarification: the green/red split is *inside* the
   distribution, not a sign color.) The separator dash is neutral/faint.
3. **`+/-` stays as its own separate column** (mockup option C — user chose explicitness over
   width). Sign-colored: green positive, red negative, muted gray at zero. It remains the visible
   tiebreaker on equal wins.
4. **Stacked names** (mockup option B): each player of the pair on their own line, uniform size
   across the card. A line only shrinks (via FitText, below) for genuinely long single names.
5. **Full names everywhere.** Every player-name `truncate` in the live-screen feature is replaced
   by shrink-to-fit: `LaneMatchCard`, `CourtRail`, `MatchCard`, `StandingsTable`, `GroupBoardCard`.
6. **Mobile/TV diff alignment.** `StandingsTable` currently computes `+/-` from `sets_won -
   sets_lost` while `GroupBoardCard` uses `games_won - games_lost`. Both move to **games** so the
   two surfaces cannot disagree about a pair's balance.

## Component changes

### `FitText` (new, `components/FitText.tsx`)

Single-purpose shared component that guarantees a full (never-truncated) single line of text.

- Props: `text: string`, `className?`, `maxPx: number`, `minPx: number` (floor), optional `dir`.
- Renders the text at `maxPx`; after layout, if content overflows its container, steps the font
  size down until it fits or hits `minPx`. At the floor the text is allowed to clip rather than
  ellipsize (in practice Hebrew names fit well above any sane floor).
- Re-measures on text change and on container resize (`ResizeObserver`).
- Sets `title={text}` so hover shows the name at full size.
- Implementation detail: measure with `scrollWidth > clientWidth` on the rendered element —
  no canvas text metrics, so it works with the loaded Heebo/Rubik webfonts for free.

### `GroupBoardCard` (TV groups tab — the main redesign)

Row layout, RTL, right-to-left reading order:

```
rank · pair chip · stacked names (flex-1) · מש' · נ' · משחקונים · +/-
```

- **Names:** two stacked lines (player 1 / player 2), uniform base size (~15px normal, smaller in
  dense mode), each line wrapped in `FitText`. Solo entries (`player_name`/`team_name` string,
  no player objects) render as a single FitText line. Disqualified rows keep the strikethrough,
  the DISQUALIFIED badge, and `—` in every numeric cell.
- **משחקונים cell:** `games_won` (green) + separator + `games_lost` (red) as **separate elements
  inside a `dir="ltr"` container** — same bidi-safe pattern the set scores already use; never a
  pre-joined `"20-10"` string, which would mirror in RTL.
- **`+/-` cell:** `games_won - games_lost`, `dir="ltr"`, prefixed `+` when positive; green/red/
  muted-zero coloring.
- **Header row** gains the משחקונים column label; keeps appearing only once results exist.
  The label is a new i18n key in both `he.json` ("משחקונים") and `en.json` ("Games") — all
  visible text goes through `t()`, like the existing `standings_headers.*` keys.
- **Spacing:** container switches from `justify-evenly` to a centered cluster with a fixed small
  gap (`justify-center` + `gap` ≈ 4–6px). Dense mode (>4 pairs) keeps its existing smaller type;
  with two-line rows a 6-pair group is the tightest case — verify at implementation time on the
  1600×900 canvas that six stacked rows plus the cutoff line fit without clipping.
- Qualifying-row tint, cutoff line placement, and the pre-results blank state are unchanged.

### `StandingsTable` (mobile + TV `large` mode)

- Already stacks one player per line in mobile mode — keep, wrap each line in `FitText`.
- Add the משחקונים won/lost-colored column; keep W / L; `+/-` switches from sets to games and
  gains the same sign coloring.
- `large` (one-line-per-team) mode: team line becomes FitText instead of `truncate`.

### `LaneMatchCard`, `CourtRail`, `MatchCard`

- Keep their one-line-per-team layouts; replace every name `truncate` with `FitText`
  (floor ≈ 9–10px). Set scores, states, and everything else unchanged.

### `themes.css`

- New per-theme tokens `--pb-won` (green) and `--pb-lost` (red), tuned for contrast on all three
  skins (dark / light / gradient). The `+/-` coloring reuses the same two tokens plus the existing
  muted token for zero.

## Data

No backend or schema work. `PublicStanding` already carries `games_won`, `games_lost`,
`sets_won`, `sets_lost`; the card simply stops collapsing games into a single difference.

## Testing

- **`groupBoardCard.test.tsx`:** update for the new columns — full pair names present in the DOM
  (both players, no `…`), won/lost values rendered as separate green/red elements, `+/-` value and
  sign coloring, DQ dashes, cutoff line position, dense mode.
- **`StandingsTable`:** diff now derived from games, not sets; distribution column renders.
- **`FitText.test.tsx`(new):** steps down on overflow, respects the floor, re-measures on text
  change — with mocked `scrollWidth`/`clientWidth`, since jsdom does no real text layout.
- Existing `laneMatchCard` / `courtRail` tests updated for the truncate → FitText swap.

## Out of scope

- Knockout/bracket views, the videos tab, and the rotation logic.
- Any change to ranking/sort order (server-provided positions stay authoritative).
- Backend payloads.
