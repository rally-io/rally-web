import React from 'react';
import { useTranslation } from 'react-i18next';
import { GitMerge, Loader2 } from 'lucide-react';

export const LOGO_URL = '/rally-logo.jpg';

export function LoadingScreen(): React.ReactElement {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4">
            <img src={LOGO_URL} alt="Rally" className="h-12 w-auto rounded-xl" />
            <Loader2 className="h-6 w-6 animate-spin text-(--pb-accent)" />
        </div>
    );
}

export function ErrorScreen({ isExpired }: { isExpired: boolean }): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
            <img src={LOGO_URL} alt="Rally" className="mb-2 h-12 w-auto rounded-xl" />
            <p className="text-lg font-bold text-(--pb-text)">
                {isExpired
                    ? t('public_bracket.errors.not_found', 'Tournament not found or this link has expired.')
                    : t('public_bracket.errors.load_failed', 'Unable to load bracket. Please check your connection.')}
            </p>
            <p className="text-sm text-(--pb-text-faint)">
                {t('public_bracket.errors.check_link', 'Check the link or ask the organiser for a new one.')}
            </p>
        </div>
    );
}

export function EmptyBracket(): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <GitMerge size={48} className="rotate-90 text-(--pb-text-faint)" />
            <p className="font-bold text-(--pb-text-muted)">{t('public_bracket.no_data', 'No bracket data yet.')}</p>
            <p className="text-sm text-(--pb-text-faint)">{t('public_bracket.no_data_desc', 'Check back once the draw has been generated.')}</p>
        </div>
    );
}
