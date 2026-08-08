import React, { useLayoutEffect, useState } from 'react';

/** The screen this view is designed against. Every size inside is tuned for this canvas. */
export const TV_WIDTH = 1600;
export const TV_HEIGHT = 900;

type TvCanvasProps = { children: React.ReactNode };

/**
 * Renders the venue screen at a fixed design size and scales it to fit the display, the way the
 * approved mockup was drawn.
 *
 * Reflowing instead — letting the layout take whatever height the browser happens to give — meant
 * the same tournament showed six games on a 900px screen and two on a 750px one, because the
 * standings and the games competed for a height that changed per device. On a canvas the layout is
 * settled once: what fits, fits everywhere, and a smaller screen shows the same board smaller
 * rather than a different board.
 */
export function TvCanvas({ children }: TvCanvasProps): React.ReactElement {
    const [scale, setScale] = useState<number | null>(null);

    useLayoutEffect(() => {
        const update = (): void => {
            setScale(Math.min(window.innerWidth / TV_WIDTH, window.innerHeight / TV_HEIGHT));
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    return (
        <div className="flex h-screen w-screen items-center justify-center overflow-hidden">
            <div
                className="flex shrink-0 flex-col overflow-hidden"
                style={{
                    width: TV_WIDTH,
                    height: TV_HEIGHT,
                    // Hidden until measured so the un-scaled canvas never flashes at full size.
                    transform: `scale(${scale ?? 1})`,
                    visibility: scale === null ? 'hidden' : 'visible',
                }}
            >
                {children}
            </div>
        </div>
    );
}
