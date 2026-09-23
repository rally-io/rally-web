import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankCell } from '../components/RankCell';

/**
 * RankCell is the primitive that makes ties safe. It takes `rank` as a prop and
 * has no access to any array, index or sibling row, so there is nowhere for a
 * client-side renumbering to hide.
 */
describe('RankCell — the rank comes from the server', () => {
  it('renders rank 51 as 51', () => {
    // The paging case, and the assertion no client-side derivation can satisfy.
    // Index-based numbering yields 1; even a client-side competition ranking over
    // the page yields 1. Nothing on the client can invent 51.
    render(<RankCell rank={51} />);
    expect(screen.getByText('51')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('renders two players tied on rank 1 as 1 and 1, disambiguating neither', () => {
    render(
      <div>
        <RankCell rank={1} />
        <RankCell rank={1} />
      </div>,
    );
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('1a')).not.toBeInTheDocument();
  });

  it('renders a dash for an unranked player rather than a zero or a blank', () => {
    // `global_rank` is nullable on the personal card: a player with no counted
    // results has no rank. Rendering 0 would place them last; blank reads broken.
    render(<RankCell rank={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});

describe('RankCell — movement indicator, all four cases', () => {
  // In the mobile build only the upward case was tested, so replacing the whole
  // expression with a constant up-arrow passed the entire suite: a player who fell
  // twelve places was told they rose twelve. Each case is asserted separately, and
  // each asserts the absence of the other directions.

  it('renders an up indicator for a positive change', () => {
    render(<RankCell rank={9} rankChange={3} />);

    const indicator = screen.getByTestId('rank-movement');
    expect(indicator).toHaveAttribute('data-direction', 'up');
    expect(indicator.textContent).toContain('▲');
    expect(indicator.textContent).toContain('3');
    expect(screen.getByLabelText('Moved up')).toBeInTheDocument();
    expect(screen.queryByLabelText('Moved down')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('No change')).not.toBeInTheDocument();
  });

  it('renders a DOWN indicator for a negative change', () => {
    render(<RankCell rank={9} rankChange={-12} />);

    const indicator = screen.getByTestId('rank-movement');
    expect(indicator).toHaveAttribute('data-direction', 'down');
    expect(indicator.textContent).toContain('▼');
    expect(indicator.textContent).not.toContain('▲');
    expect(screen.getByLabelText('Moved down')).toBeInTheDocument();
    expect(screen.queryByLabelText('Moved up')).not.toBeInTheDocument();
  });

  it('shows the magnitude of a fall, not its sign', () => {
    // Direction is carried by the glyph and the label. The number is the distance,
    // so it must be 12 and never -12 — a minus sign next to a down arrow in an RTL
    // layout is both redundant and prone to reordering.
    render(<RankCell rank={9} rankChange={-12} />);
    expect(screen.getByTestId('rank-movement').textContent).toContain('12');
    expect(screen.getByTestId('rank-movement').textContent).not.toContain('-12');
  });

  it('renders the neutral marker for a zero change', () => {
    render(<RankCell rank={9} rankChange={0} />);

    const indicator = screen.getByTestId('rank-movement');
    expect(indicator).toHaveAttribute('data-direction', 'same');
    expect(screen.getByLabelText('No change')).toBeInTheDocument();
    expect(indicator.textContent).not.toContain('▲');
    expect(indicator.textContent).not.toContain('▼');
  });

  it('renders no indicator at all when the change is null', () => {
    // Unknown movement is not "no movement". A player whose previous snapshot is
    // missing must see nothing, not a neutral marker claiming they held station.
    render(<RankCell rank={9} rankChange={null} />);

    expect(screen.queryByTestId('rank-movement')).toBeNull();
    expect(screen.queryByLabelText('Moved up')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Moved down')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('No change')).not.toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('renders no indicator when the change is omitted entirely', () => {
    render(<RankCell rank={9} />);
    expect(screen.queryByTestId('rank-movement')).toBeNull();
  });
});
