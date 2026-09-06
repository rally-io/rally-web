import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlayerSearchProps = {
  value: string;
  onChange: (next: string) => void;
  className?: string;
};

/**
 * The board's name search box — a controlled input and nothing else. The
 * debounce, the two-character threshold and the "which frames can search"
 * rule all live in the page: this component must not know them, or clearing
 * and frame changes would have two owners.
 */
export function PlayerSearch({ value, onChange, className }: PlayerSearchProps): ReactElement {
  const { t } = useTranslation();
  return (
    <div className={cn('relative', className)}>
      <Search
        aria-hidden
        className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rally-text-muted"
      />
      <input
        type="text"
        data-testid="league-search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={t('league.search.placeholder')}
        aria-label={t('league.search.placeholder')}
        className="w-full rounded-full border border-rally-border bg-rally-surface py-2.5 ps-10 pe-10 text-sm text-rally-text transition-colors placeholder:text-rally-text-muted focus:border-rally-accent/60 focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          data-testid="league-search-clear"
          aria-label={t('league.search.clear')}
          onClick={() => onChange('')}
          className="absolute end-3 top-1/2 -translate-y-1/2 text-rally-text-muted transition-colors hover:text-rally-text"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
