/* One guard for spec D2: no league surface prints a tier or band while silently dropping the
 * verification that came with it. This is what catches "sealed on six surfaces out of seven".
 *
 * A NAIVE VERSION OF THIS GUARD IS NOT ENOUGH, and this codebase already proves both directions
 * of the failure by the time this file exists:
 *
 *   - A bare `/level_verified|levelVerified/` source match is satisfied by an inert COMMENT.
 *     `PlayerShield.tsx`'s doc comment (documenting exactly why it carries no seal) contains the
 *     literal string `level_verified` — a naive guard would call that file "covered" while it is
 *     the one surface that must NEVER draw the seal. See the negative assertion below.
 *   - The same bare match produces a FALSE NEGATIVE for `StandingsTable.tsx`: that file never
 *     spells the field name at all — it hands the whole `row` object to `PlayerIdentity`, which
 *     draws the seal — so a token-match guard would flag an already-correct surface as broken,
 *     which teaches everyone to stop trusting the guard.
 *
 * So this file uses two different techniques, chosen by how each surface actually carries the
 * seal, and states for every surface why it is checked the way it is:
 *
 *   - DIRECT DRAWERS (import `VerificationMark` — the single place, per its own doc comment,
 *     that turns `level_verified` into pixels — and forward the raw field into its `verified`
 *     prop) are checked by reading their source for that exact forwarding
 *     (`VerificationMark verified={<ident>.level_verified}`), which a stale prop-type
 *     declaration or a bare mention in a comment cannot satisfy. This surface used to import
 *     `VerifiedSeal` directly and branch on the field itself with a ternary; `VerificationMark`
 *     now owns that branching everywhere (call sites never branch on the field themselves — see
 *     `VerificationMark.tsx`), so the genuine-usage proof is the forwarding, not a ternary.
 *   - DELEGATORS (hand the whole row/card object to a child that draws the seal) are checked by
 *     asserting the exact whole-object passthrough expression survives — the real behavioural
 *     proof is a render test elsewhere, cited alongside each check here so a reader lands on the
 *     assertion that actually fails when the seal is deleted, rather than assuming this file is it.
 *
 * Sources are pulled in via Vite's `?raw` suffix (declared by `vite/client`, referenced in
 * `src/vite-env.d.ts`) rather than `node:fs` — this project's `tsconfig.json` pins `types` to
 * `vitest/globals` only, keeping Node globals out of browser-code type-checking, so `node:fs` /
 * `process` do not type-check here (see the note in `src/lib/og.test.ts`, which hit the same
 * constraint and resolved it the same way with `?raw`).
 */
import { describe, expect, it } from 'vitest';

import personalCardSrc from '../components/PersonalCard.tsx?raw';
import playerIdentitySrc from '../components/PlayerIdentity.tsx?raw';
import playerSeasonContentSrc from '../components/PlayerSeasonContent.tsx?raw';
import playerShieldSrc from '../components/PlayerShield.tsx?raw';
import standingsTableSrc from '../components/StandingsTable.tsx?raw';
import topRanksSrc from '../components/TopRanks.tsx?raw';
import rankingPageSrc from '../pages/RankingPage.tsx?raw';
import typesSrc from '../types.ts?raw';

/**
 * Surfaces that draw the seal themselves. Each must import `VerificationMark` from the level kit
 * AND forward `.level_verified` (or camelCase `.levelVerified`) straight into its `verified` prop
 * — not just declare the field in a prop type, and not just mention it in a comment.
 */
const DIRECT_DRAWERS: Array<[name: string, src: string]> = [
  ['PersonalCard.tsx', personalCardSrc],
  ['PlayerIdentity.tsx', playerIdentitySrc],
  ['PlayerSeasonContent.tsx', playerSeasonContentSrc],
  ['TopRanks.tsx', topRanksSrc],
];

describe('every league surface that draws its own seal actually gates it on the field', () => {
  it.each(DIRECT_DRAWERS)('%s imports VerificationMark and forwards the raw field into it', (_name, src) => {
    expect(src).toMatch(/VerificationMark/);
    // A genuine forwarding of the raw field into VerificationMark's `verified` prop — deleting
    // the render line (but leaving a `level_verified?: boolean` prop-type declaration behind, as
    // PlayerIdentity.tsx has) fails this, even though the bare token `level_verified` would still
    // be present in the file. `verified=` is matched anywhere among the element's props, not only
    // immediately after the tag name — `showLabel={false}` legitimately comes first at several of
    // these call sites, and a guard that broke on prop reordering would be exactly the kind of
    // guard nobody trusts (see this file's own warning about naive guards, above).
    expect(src).toMatch(/<VerificationMark\b[^>]*\bverified=\{[a-zA-Z_]+\.(level_verified|levelVerified)\}/);
  });
});

describe('PlayerShield stays free of the seal — the row beside it already carries the words', () => {
  it('never imports or renders VerificationMark, despite naming it in its own exclusion comment', () => {
    // Sanity: this file DOES contain the literal string (in its doc comment explaining the
    // exclusion) — proving that string-presence alone cannot be this guard's signal.
    expect(playerShieldSrc).toMatch(/VerificationMark/);
    expect(playerShieldSrc).not.toMatch(/import\s*\{[^}]*VerificationMark[^}]*\}\s*from/);
    expect(playerShieldSrc).not.toMatch(/<VerificationMark/);
  });
});

describe('LeagueResult (the frozen tournament-award record) carries no level fields to drop', () => {
  it('the schema comment documents the exclusion, and the type has no level_verified/level_reliability keys', () => {
    const schemaMatch = typesSrc.match(/export const LeagueResultSchema = z\.object\(\{[\s\S]*?\}\);/);
    expect(schemaMatch).not.toBeNull();
    const schemaBody = schemaMatch![0];
    expect(schemaBody).not.toMatch(/level_verified|level_reliability/);
  });
});

describe('delegating surfaces hand the WHOLE row/card through — never a stripped-down projection', () => {
  it('StandingsTable passes the whole row to PlayerIdentity (seal render pinned in board.seal.test.tsx)', () => {
    expect(standingsTableSrc).toMatch(/<PlayerIdentity\s+player=\{row\}\s*\/>/);
  });

  it('RankingPage passes the whole card/rows through to PersonalCard/TopRanks/StandingsTable (seal render pinned in rankingPage.test.tsx)', () => {
    expect(rankingPageSrc).toMatch(/card=\{myCard\.card\}/);
    expect(rankingPageSrc).toMatch(/rows=\{featured\}/);
    expect(rankingPageSrc).toMatch(/rows=\{tableRows\}/);
  });
});
