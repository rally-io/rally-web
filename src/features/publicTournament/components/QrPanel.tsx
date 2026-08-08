import React from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';

export function QrPanel(): React.ReactElement {
    const { t } = useTranslation();
    return (
        <div className="flex shrink-0 items-center gap-3 rounded-xl border border-(--pb-border) bg-(--pb-card) px-4 py-2">
            <div className="rounded-lg bg-white p-1">
                <QRCodeSVG value={window.location.href} size={72} />
            </div>
            <div>
                <p className="text-xs font-black uppercase tracking-wider text-(--pb-text)">
                    {t('public_bracket.qr_title', 'Follow on your phone')}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-(--pb-text-faint)">
                    {t('public_bracket.qr_caption', 'Scan for live scores & brackets')}
                </p>
            </div>
        </div>
    );
}
