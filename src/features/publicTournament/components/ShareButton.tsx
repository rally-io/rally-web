import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Share2 } from 'lucide-react';

const COPIED_FEEDBACK_MS = 2000;

export function ShareButton(): React.ReactElement {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        [],
    );

    async function handleShare(): Promise<void> {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title: document.title, url });
            } catch {
                // user dismissed the native share sheet — not an error
            }
            return;
        }
        await navigator.clipboard.writeText(url);
        // No toast library on this site, and a spectator page shown on a TV is the wrong
        // place for one — confirm inline on the button instead.
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    }

    const label = copied
        ? t('public_bracket.link_copied', 'Link copied')
        : t('public_bracket.share', 'Share');

    return (
        <button
            onClick={() => void handleShare()}
            aria-label={label}
            title={label}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--pb-border) bg-(--pb-card) text-(--pb-text-muted) transition-colors hover:text-(--pb-text)"
        >
            {copied ? <Check size={14} /> : <Share2 size={14} />}
        </button>
    );
}
