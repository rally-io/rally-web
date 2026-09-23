import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerIdentity } from '../components/PlayerIdentity';

const player = {
  player_id: 'p1',
  first_name: 'Noa',
  last_name: 'Levi',
  avatar_url: null,
  avatar_clean_url: null,
  skill_tier: 'gold' as const,
};

describe('PlayerIdentity verification', () => {
  it('shows the seal for a verified player', () => {
    render(<PlayerIdentity player={{ ...player, level_verified: true }} />);
    expect(screen.getByTestId('verified-seal')).toBeInTheDocument();
  });

  it('shows no seal for an unverified player', () => {
    render(<PlayerIdentity player={{ ...player, level_verified: false }} />);
    expect(screen.queryByTestId('verified-seal')).not.toBeInTheDocument();
  });

  it('the tier is unchanged either way', () => {
    // spec §8: the seal is additive; a tier never becomes dashed or doubtful.
    //
    // NOTE: this deliberately does NOT use a `player-tier` testid. PlayerIdentity
    // never renders the tier as a label — `playerIdentity.test.tsx` pins
    // `queryByTestId('player-tier')` as always null, because tier is a monogram
    // colour, not a word (see PlayerIdentity.tsx MONOGRAM_TONE). The monogram is
    // the actual tier-bearing element, so this compares ITS colour and its
    // `data-tier` attribute before and after toggling verification.
    const { rerender } = render(<PlayerIdentity player={{ ...player, level_verified: true }} />);
    const monogram = screen.getByTestId('player-monogram');
    const sealedTier = monogram.getAttribute('data-tier');
    const sealedClassName = monogram.className;

    rerender(<PlayerIdentity player={{ ...player, level_verified: false }} />);
    const unsealedMonogram = screen.getByTestId('player-monogram');
    expect(unsealedMonogram.getAttribute('data-tier')).toBe(sealedTier);
    expect(unsealedMonogram.className).toBe(sealedClassName);
  });
});
