import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, type ReactElement, type ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api/publicLeague', () => ({
  fetchPublicStandings: vi.fn(),
}));

import { FrameControls, type FrameSelection } from '../components/FrameControls';
import { usePublicStandings } from '../hooks/usePublicStandings';
import { fetchPublicStandings } from '../api/publicLeague';
import type { LeagueFetch, LeagueSeason, PublicFrame, PublicStandings } from '../types';

const mockFetchPublicStandings = vi.mocked(fetchPublicStandings);

const SEASON: LeagueSeason = {
  id: 'season-2026',
  name: '2026',
  starts_at: '2026-01-01T00:00:00+00:00',
  ends_at: '2026-12-31T00:00:00+00:00',
  counting_results: 6,
  is_active: true,
  quarters: [],
};

function emptyPayload(frame: string): LeagueFetch<PublicStandings> {
  return { kind: 'ok', data: { season: SEASON, frame, total_players: 0, rows: [], me: null } };
}

const GLOBAL: FrameSelection = { frame: 'global', band: null };

const CIRCLE_LABEL = 'Players I have faced';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchPublicStandings.mockResolvedValue(emptyPayload('global'));
});

describe('FrameControls — the circle chip shows for every visitor (rule reversed 2026-09-02)', () => {
  it('renders the circle chip, enabled, with no session at all', () => {
    // DELIBERATE REVERSAL of the launch rule that hid the chip when logged
    // out. The old rationale — "a chip with no way to earn the feature" —
    // stopped holding the day selecting it logged-out started rendering the
    // sign-in CTA instead of a table (pinned in the RankingPage tests). The
    // chip row is now identical for every visitor.
    render(<FrameControls value={GLOBAL} onChange={vi.fn()} />);

    const chips = screen.getAllByRole('button');
    expect(chips.map(chip => chip.textContent)).toEqual(['Global', 'By level', CIRCLE_LABEL]);
    expect(chips.some(chip => chip.hasAttribute('disabled'))).toBe(false);
  });

  it('selects the circle frame with no band attached', () => {
    const onChange = vi.fn();
    render(<FrameControls value={GLOBAL} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: CIRCLE_LABEL }));
    expect(onChange).toHaveBeenCalledWith({ frame: 'circle', band: null });
  });
});

describe('FrameControls — the band frame never picks a band for you', () => {
  it('emits a band frame with no band, so nothing is requested yet', () => {
    const onChange = vi.fn();
    render(<FrameControls value={GLOBAL} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));

    // NOT { band: 'A' }. A silently chosen band shows a visitor a table that is
    // not the one its heading claims.
    expect(onChange).toHaveBeenCalledWith({ frame: 'band', band: null });
  });

  it('reveals the A/B/C/D picker once the band frame is active', () => {
    render(
      <FrameControls value={{ frame: 'band', band: null }} onChange={vi.fn()} />,
    );

    const picker = screen.getByTestId('band-picker');
    expect(picker).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'D' })).toBeInTheDocument();
  });

  it('hides the picker for every other frame', () => {
    const view = render(<FrameControls value={GLOBAL} onChange={vi.fn()} />);
    expect(screen.queryByTestId('band-picker')).toBeNull();
    view.unmount();

    render(
      <FrameControls value={{ frame: 'circle', band: null }} onChange={vi.fn()} />,
    );
    expect(screen.queryByTestId('band-picker')).toBeNull();
  });

  it('shows the picker for a signed-in visitor too, because the public table cannot infer a band', () => {
    render(<FrameControls value={{ frame: 'band', band: null }} onChange={vi.fn()} />);
    expect(screen.getByTestId('band-picker')).toBeInTheDocument();
  });

  it('emits the chosen band', () => {
    const onChange = vi.fn();
    render(
      <FrameControls value={{ frame: 'band', band: null }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith({ frame: 'band', band: 'B' });
  });

  it('marks the chosen band as pressed and leaves the others unpressed', () => {
    render(
      <FrameControls value={{ frame: 'band', band: 'C' }} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'C', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'A', pressed: false })).toBeInTheDocument();
  });
});

describe('FrameControls — re-selecting what is already selected changes nothing', () => {
  it('does not fire for the active frame', () => {
    const onChange = vi.fn();
    render(<FrameControls value={GLOBAL} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Global' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not fire — and so cannot drop the chosen band — when the band chip is re-clicked', () => {
    const onChange = vi.fn();
    render(
      <FrameControls value={{ frame: 'band', band: 'D' }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not fire for the active band', () => {
    const onChange = vi.fn();
    render(
      <FrameControls value={{ frame: 'band', band: 'D' }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'D' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears the band when leaving the band frame, so no stale band survives', () => {
    const onChange = vi.fn();
    render(
      <FrameControls value={{ frame: 'band', band: 'D' }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Global' }));
    expect(onChange).toHaveBeenCalledWith({ frame: 'global', band: null });
  });

  it('marks the active frame as pressed', () => {
    render(
      <FrameControls value={{ frame: 'band', band: 'A' }} onChange={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'By level', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Global', pressed: false })).toBeInTheDocument();
  });
});

/**
 * The claim "no request fires until a band is chosen" is about the wire, not about
 * a callback, so it is asserted against the real query hook with only the API
 * module mocked. The QueryClient is built OUTSIDE the wrapper component so a
 * re-render does not silently throw the cache away — see the note in
 * usePublicStandings.test.tsx, where that detail made a guard vacuous.
 */
function createWrapper(): (props: { children: ReactNode }) => ReactNode {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function Harness(): ReactElement {
  const [selection, setSelection] = useState<FrameSelection>(GLOBAL);
  // What a page must do too: the table reads the PUBLIC endpoint, which knows
  // only `global` and `band`.
  const publicFrame: PublicFrame = selection.frame === 'band' ? 'band' : 'global';
  const { rows } = usePublicStandings({ frame: publicFrame, band: selection.band ?? undefined });

  return (
    <>
      <FrameControls value={selection} onChange={setSelection} />
      <span data-testid="row-count">{rows.length}</span>
    </>
  );
}

describe('FrameControls — wired to the query hook, no request fires without a band', () => {
  it('requests global on mount, nothing when band is selected, and the band once chosen', async () => {
    render(<Harness />, { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetchPublicStandings).toHaveBeenCalledTimes(1));
    expect(mockFetchPublicStandings).toHaveBeenLastCalledWith(
      expect.objectContaining({ frame: 'global' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'By level' }));

    // The picker is revealed and the wire stays quiet: `frame=band` with no band
    // is a 400 on the public API, and a defaulted band would be a wrong answer
    // rendered confidently.
    await waitFor(() => expect(screen.getByTestId('band-picker')).toBeInTheDocument());
    expect(mockFetchPublicStandings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'B' }));

    await waitFor(() => expect(mockFetchPublicStandings).toHaveBeenCalledTimes(2));
    expect(mockFetchPublicStandings).toHaveBeenLastCalledWith(
      expect.objectContaining({ frame: 'band', band: 'B' }),
    );
  });
});
