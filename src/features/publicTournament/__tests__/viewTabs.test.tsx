import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { ViewTabs } from '../components/ViewTabs';

/**
 * The rotation progress bar promises a change that is about to happen. It must only ever
 * render when rotation is actually possible — `showAutoRotate` is what the page computes as
 * `isBigScreen && canAutoRotate`, so a false there means either the rotation list has
 * collapsed to one entry (parked pre-start board) or the board has no toggle to offer at
 * all. `isAutoRotate` alone is not enough: it defaults to `true` on any big screen, so
 * gating on it by itself lets a phantom bar render and fill toward a rotation that will
 * never come.
 */
describe('ViewTabs auto-rotate progress bar', () => {
    it('does not render the bar when rotation is impossible, even though isAutoRotate is true', () => {
        const { container } = render(
            <ViewTabs
                view="games"
                onSelect={vi.fn()}
                isAutoRotate={true}
                onToggleAutoRotate={vi.fn()}
                showAutoRotate={false}
                tabs={['games']}
                rotateMs={12000}
            />,
        );
        expect(container.querySelector('.pb-rotate-bar')).toBeNull();
    });

    it('renders the bar on the active tab once rotation is both possible and on', () => {
        const { container } = render(
            <ViewTabs
                view="groups"
                onSelect={vi.fn()}
                isAutoRotate={true}
                onToggleAutoRotate={vi.fn()}
                showAutoRotate={true}
                tabs={['groups', 'games']}
                rotateMs={12000}
            />,
        );
        expect(container.querySelector('.pb-rotate-bar')).not.toBeNull();
    });

    it('renders no bar at all when auto-rotate is toggled off, regardless of showAutoRotate', () => {
        const { container } = render(
            <ViewTabs
                view="groups"
                onSelect={vi.fn()}
                isAutoRotate={false}
                onToggleAutoRotate={vi.fn()}
                showAutoRotate={true}
                tabs={['groups', 'games']}
                rotateMs={12000}
            />,
        );
        expect(container.querySelector('.pb-rotate-bar')).toBeNull();
    });
});
