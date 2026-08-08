import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ShareButton } from './ShareButton';
import { LOGO_URL } from './PageStates';
import type { BracketTheme } from '../types';

type PublicHeaderProps = {
    tournamentName: string;
    isReconnecting: boolean;
    updatedAt: Date | null;
    theme: BracketTheme;
    onCycleTheme: () => void;
    isBigScreen: boolean;
    clubLogoUrl?: string | null;
    clubName?: string | null;
};

export function PublicHeader({ tournamentName, isReconnecting, updatedAt, theme, onCycleTheme, isBigScreen, clubLogoUrl, clubName }: PublicHeaderProps): React.ReactElement {
    const { t } = useTranslation();
    const updatedTime = updatedAt
        ? updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';

    if (isBigScreen) {
        return (
            <header className="relative shrink-0 px-8 pb-1.5 pt-3 text-center">
                <div className="absolute start-8 top-2 flex flex-col items-center gap-1">
                    <img src={LOGO_URL} alt="Rally" className="h-14 w-auto rounded-xl" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-(--pb-text-faint)">
                        Rally
                    </span>
                </div>
                <h1 className="pb-display mt-1 text-[42px] leading-none tracking-wide text-(--pb-text)">
                    {tournamentName || t('public_bracket.tournament_fallback', 'Tournament')}
                </h1>
                <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-widest">
                    {isReconnecting ? (
                        <><WifiOff size={11} className="text-amber-500" /><span className="text-amber-500">{t('public_bracket.reconnecting', 'Reconnecting…')}</span></>
                    ) : (
                        <><span className="pb-live-dot h-1.5 w-1.5 rounded-full bg-(--pb-live)" /><span className="text-(--pb-live)">{t('public_bracket.live_scores', 'Live Scores')}</span></>
                    )}
                </div>
                <div className="absolute end-8 top-2 flex items-center gap-3">
                    <ThemeSwitcher theme={theme} onCycle={onCycleTheme} />
                    {clubLogoUrl && (
                        <div className="flex flex-col items-center gap-1">
                            <img src={clubLogoUrl} alt={clubName ?? 'Club'} className="h-18 w-auto rounded-xl" />
                            {clubName && (
                                <span className="max-w-[8rem] truncate text-[10px] font-black text-(--pb-text-faint)">
                                    {clubName}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </header>
        );
    }

    return (
        <header className="sticky top-0 z-40 border-b border-(--pb-border) bg-(--pb-card-header) px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    {clubLogoUrl && (
                        <img src={clubLogoUrl} alt={clubName ?? 'Club'} className="h-9 w-9 shrink-0 rounded-lg" />
                    )}
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-(--pb-accent)">
                            {t('public_bracket.live_scores', 'Live Scores')}
                        </p>
                        <h1 className="truncate text-sm font-black text-(--pb-text)">
                            {tournamentName || t('public_bracket.tournament_fallback', 'Tournament')}
                        </h1>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <ThemeSwitcher theme={theme} onCycle={onCycleTheme} />
                    <ShareButton />
                </div>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-(--pb-text-faint)">
                {isReconnecting ? (
                    <><WifiOff size={10} className="text-amber-500" /><span className="font-bold text-amber-500">{t('public_bracket.reconnecting', 'Reconnecting…')}</span></>
                ) : (
                    <><Wifi size={10} className="text-(--pb-highlight)" /><span>{t('public_bracket.updated', { time: updatedTime, defaultValue: `Updated ${updatedTime}` })}</span></>
                )}
            </div>
        </header>
    );
}
