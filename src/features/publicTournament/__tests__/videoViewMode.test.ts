import { describe, expect, it } from 'vitest';

import { PublicBracketSchema } from '../types';

/**
 * `videos` is parsed with `z.array(...).catch([])`, which means ONE element failing
 * validation silently blanks the whole array — the same trap documented on
 * `standings` in disqualifiedStanding.test.tsx. That is why every field inside
 * PublicVideoSchema is `.catch()`-guarded: a video with a missing label must not
 * take the other videos down with it.
 */
const baseBracket = {
    tournament_id: 't1',
    tournament_name: 'Test Cup',
    structure: 'single_elimination',
    knockout_rounds: [],
    plate_rounds: [],
};

describe('PublicBracketSchema videos', () => {
    it('parses videos off the payload', () => {
        const parsed = PublicBracketSchema.parse({
            ...baseBracket,
            videos: [
                {
                    id: 'v1',
                    label: 'Court 1',
                    provider: 'YouTube',
                    embed_url: 'https://www.youtube-nocookie.com/embed/abc123',
                    url: 'https://www.youtube.com/live/abc123',
                    display_order: 0,
                },
            ],
        });
        expect(parsed.videos).toHaveLength(1);
        expect(parsed.videos[0].embed_url).toBe('https://www.youtube-nocookie.com/embed/abc123');
    });

    it('defaults to an empty list against an API that predates the field', () => {
        const parsed = PublicBracketSchema.parse(baseBracket);
        expect(parsed.videos).toEqual([]);
    });

    it('keeps the good videos when one element has junk fields', () => {
        const parsed = PublicBracketSchema.parse({
            ...baseBracket,
            videos: [
                { id: 'v1', label: 42, provider: null, embed_url: 'https://ok/embed/1', url: 'https://ok/1', display_order: 'x' },
                { id: 'v2', label: 'Court 2', provider: 'Vimeo', embed_url: 'https://ok/embed/2', url: 'https://ok/2', display_order: 1 },
            ],
        });
        expect(parsed.videos).toHaveLength(2);
        expect(parsed.videos[0].embed_url).toBe('https://ok/embed/1');
    });
});
