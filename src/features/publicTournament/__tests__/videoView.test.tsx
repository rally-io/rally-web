import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VideoView } from '../components/VideoView';
import type { PublicVideo } from '../types';

const videos: PublicVideo[] = [
    { id: 'v1', label: 'Court 1', provider: 'YouTube', embed_url: 'https://www.youtube-nocookie.com/embed/aaa', url: 'https://www.youtube.com/live/aaa', display_order: 0 },
    { id: 'v2', label: 'Court 2', provider: 'Twitch', embed_url: 'https://player.twitch.tv/?channel=bbb&parent=localhost', url: 'https://www.twitch.tv/bbb', display_order: 1 },
];

describe('VideoView', () => {
    it('renders exactly one iframe, the first video, whatever the provider', () => {
        const { container } = render(<VideoView videos={videos} isBigScreen={false} />);
        const frames = container.querySelectorAll('iframe');
        // One player at a time: two live streams playing at once is two audio tracks.
        expect(frames).toHaveLength(1);
        expect(frames[0].getAttribute('src')).toBe('https://www.youtube-nocookie.com/embed/aaa');
    });

    it('switches the player when another video is picked', async () => {
        const user = userEvent.setup();
        const { container } = render(<VideoView videos={videos} isBigScreen={false} />);

        await user.click(screen.getByRole('button', { name: 'Court 2' }));

        const frames = container.querySelectorAll('iframe');
        expect(frames).toHaveLength(1);
        expect(frames[0].getAttribute('src')).toBe('https://player.twitch.tv/?channel=bbb&parent=localhost');
    });

    it('always offers the raw link, because a blocked embed is undetectable from here', () => {
        render(<VideoView videos={videos} isBigScreen={false} />);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', 'https://www.youtube.com/live/aaa');
        expect(link).toHaveAttribute('target', '_blank');
    });

    it('shows no chooser for a single video', () => {
        render(<VideoView videos={[videos[0]]} isBigScreen={false} />);
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('skips videos the server could not render an embed for', () => {
        const withBroken: PublicVideo[] = [
            { ...videos[0], id: 'broken', embed_url: '' },
            videos[1],
        ];
        const { container } = render(<VideoView videos={withBroken} isBigScreen={false} />);
        expect(container.querySelectorAll('iframe')[0].getAttribute('src'))
            .toBe('https://player.twitch.tv/?channel=bbb&parent=localhost');
    });
});
