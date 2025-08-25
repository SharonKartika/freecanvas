import { onTransformChange, onElementMove } from './main.js';

// Helper to initialize arrows for a specific container
export function initArrowsForContainer(container, sourceId, targetId, lineId) {
    const svg = container.querySelector('.arrowOverlay');
    const line = svg.querySelector(`#${lineId}`);
    const content = container.querySelector('.cameraViewContent');
    let currentScale = 1;

    function updateArrow() {
        const source = container.querySelector(`#${sourceId}`);
        const target = container.querySelector(`#${targetId}`);
        if (!source || !target) return;
        const contentRect = content.getBoundingClientRect();
        const srcRect = source.getBoundingClientRect();
        const tgtRect = target.getBoundingClientRect();
        const srcX = (srcRect.left - contentRect.left + srcRect.width / 2) / currentScale;
        const srcY = (srcRect.top - contentRect.top + srcRect.height / 2) / currentScale;
        const tgtX = (tgtRect.left - contentRect.left + tgtRect.width / 2) / currentScale;
        const tgtY = (tgtRect.top - contentRect.top + tgtRect.height / 2) / currentScale;
        line.setAttribute('x1', srcX);
        line.setAttribute('y1', srcY);
        line.setAttribute('x2', tgtX);
        line.setAttribute('y2', tgtY);
    }

    onTransformChange((cameraX, cameraY, scale) => {
        // Only update if this container is affected (optional: add container-specific transform events)
        svg.style.transform = `translate(${-cameraX * scale}px, ${-cameraY * scale}px) scale(${scale})`;
        svg.style.transformOrigin = 'top left';
        currentScale = scale;
        updateArrow();
    });

    onElementMove(() => {
        requestAnimationFrame(updateArrow);
    });

    // Initial draw
    updateArrow();
}
