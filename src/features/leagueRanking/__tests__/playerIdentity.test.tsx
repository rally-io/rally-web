import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerIdentity } from '../components/PlayerIdentity';
import type { PlayerIdentitySource } from '../components/PlayerIdentity';

function player(overrides: Partial<PlayerIdentitySource> = {}): PlayerIdentitySource {
  return {
    first_name: 'Noa',
    last_name: 'Levi',
    avatar_url: null,
    avatar_clean_url: null,
    skill_tier: null,
    ...overrides,
  };
}

describe('PlayerIdentity — avatar source, all three branches', () => {
  it('prefers the cut-out avatar when both are present', () => {
    render(
      <PlayerIdentity
        player={player({
          avatar_clean_url: 'https://cdn.rally.test/clean.png',
          avatar_url: 'https://cdn.rally.test/raw.jpg',
        })}
      />,
    );

    const avatar = screen.getByTestId('player-avatar');
    expect(avatar).toHaveAttribute('src', 'https://cdn.rally.test/clean.png');
    expect(screen.queryByTestId('player-monogram')).toBeNull();
  });

  it('falls back to the plain avatar when there is no cut-out', () => {
    render(<PlayerIdentity player={player({ avatar_url: 'https://cdn.rally.test/raw.jpg' })} />);

    expect(screen.getByTestId('player-avatar')).toHaveAttribute(
      'src',
      'https://cdn.rally.test/raw.jpg',
    );
    expect(screen.queryByTestId('player-monogram')).toBeNull();
  });

  it('falls back to a tier-coloured monogram when both are absent', () => {
    render(<PlayerIdentity player={player({ skill_tier: 'gold' })} />);

    const monogram = screen.getByTestId('player-monogram');
    expect(monogram).toBeInTheDocument();
    expect(monogram).toHaveTextContent('NL');
    expect(monogram).toHaveAttribute('data-tier', 'gold');
    expect(screen.queryByTestId('player-avatar')).toBeNull();
  });

  it('colours the monogram differently per tier, and has a colour for no tier', () => {
    // Without this, "tier-coloured" could be satisfied by one constant colour.
    const seen = (['bronze', 'silver', 'gold', null] as const).map(tier => {
      const view = render(<PlayerIdentity player={player({ skill_tier: tier })} />);
      const className = screen.getByTestId('player-monogram').className;
      view.unmount();
      return className;
    });

    expect(new Set(seen).size).toBe(4);
  });
});

describe('PlayerIdentity — name and tier', () => {
  it('renders the full name', () => {
    render(<PlayerIdentity player={player()} />);
    expect(screen.getByText('Noa Levi')).toBeInTheDocument();
  });

  it('renders a partial name without a stray separator', () => {
    render(<PlayerIdentity player={player({ last_name: null })} />);
    expect(screen.getByText('Noa')).toBeInTheDocument();
    expect(screen.getByTestId('player-monogram')).toHaveTextContent('N');
  });

  it('renders a placeholder and a neutral monogram when the player has no name', () => {
    render(<PlayerIdentity player={player({ first_name: null, last_name: null })} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByTestId('player-monogram')).toHaveTextContent('?');
  });

  it('never renders a tier label — tier is a monogram colour, not a word', () => {
    // The badge was removed by request (2026-08-27): rows read cleaner without it,
    // and the tier already speaks through the monogram/shield colour.
    render(<PlayerIdentity player={player({ skill_tier: 'silver' })} />);
    expect(screen.queryByText('Silver')).toBeNull();
    expect(screen.queryByTestId('player-tier')).toBeNull();
  });
});
