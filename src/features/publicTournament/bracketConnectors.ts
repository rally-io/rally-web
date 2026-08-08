export type Rect = { left: number; top: number; right: number; bottom: number; centerY: number };

/** Position relative to an ancestor via offsetParent traversal — immune to page scroll,
 *  unlike getBoundingClientRect. */
export function getRelRect(el: HTMLElement, container: HTMLElement): Rect {
    let x = 0;
    let y = 0;
    let curr: HTMLElement | null = el;
    while (curr && curr !== container) {
        x += curr.offsetLeft;
        y += curr.offsetTop;
        curr = curr.offsetParent as HTMLElement | null;
    }
    return { left: x, top: y, right: x + el.offsetWidth, bottom: y + el.offsetHeight, centerY: y + el.offsetHeight / 2 };
}

export type Segment = { d: string; winner: boolean };

/** Elbow path from a child match to its parent. Direction is derived from measured
 *  geometry (not semantic column side) so RTL's physical mirroring is handled for free:
 *  a child physically left of its parent exits its right edge, and vice versa. */
export function buildSegments(childRect: Rect, parentRect: Rect, winner: boolean): Segment[] {
    const childOnLeft = childRect.left + childRect.right < parentRect.left + parentRect.right;
    const startX = childOnLeft ? childRect.right : childRect.left;
    const endX = childOnLeft ? parentRect.left : parentRect.right;
    const midX = startX + (endX - startX) * 0.6;
    const segments: Segment[] = [{ d: `M ${startX} ${childRect.centerY} H ${midX}`, winner }];
    if (childRect.centerY !== parentRect.centerY) {
        segments.push({ d: `M ${midX} ${childRect.centerY} V ${parentRect.centerY}`, winner });
    }
    segments.push({ d: `M ${midX} ${parentRect.centerY} H ${endX}`, winner });
    return segments;
}
