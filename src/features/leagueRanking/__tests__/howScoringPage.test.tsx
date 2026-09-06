import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import HowScoringPage from '../pages/HowScoringPage';

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HowScoringPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HowScoringPage', () => {
  it('renders the six rule cards, in order', () => {
    renderPage();

    const cards = [1, 2, 3, 4, 5, 6].map(n => screen.getByTestId(`league-how-rule-${n}`));
    expect(cards).toHaveLength(6);

    // Each card must actually precede the next in document order — a set of
    // six present-but-shuffled nodes would satisfy getByTestId alone.
    for (let i = 0; i < cards.length - 1; i++) {
      expect(
        cards[i].compareDocumentPosition(cards[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it('pluralises the worked window\'s event counts — "1 event", never "1 events"', () => {
    renderPage();

    // The newest quarter of WINDOW_QUARTERS holds exactly one event, so the
    // ledger line is the page's only singular count. `not.toContain` is the
    // real guard here: "1 event" is a substring of "1 events", so the positive
    // assertion alone would be satisfied by the bug it exists to catch.
    const text = document.body.textContent ?? '';
    expect(text).toContain('1 event');
    expect(text).not.toContain('1 events');
    // The plural branch must survive the change too.
    expect(text).toContain('2 events');
  });
});
