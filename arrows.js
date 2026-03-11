// Minimal arrows.js - draw center-to-center arrows between elements
(function () {
    // Basic utilities
    function getCenter(el) {
        const x = parseInt(el.getAttribute('X'), 10) || 0;
        const y = parseInt(el.getAttribute('Y'), 10) || 0;
        const w = el.offsetWidth || 0;
        const h = el.offsetHeight || 0;
        return { x: x + w / 2, y: y + h / 2 };
    }

    function createOrGetArrowOverlay(content) {
        let svg = content.querySelector('svg.arrowOverlay');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('arrowOverlay');
            svg.style.position = 'absolute';
            svg.style.pointerEvents = 'none';
            svg.style.zIndex = '10';
            content.appendChild(svg);
        }
        return svg;
    }

    // Compute a point on the boundary of `el` along the direction from `center`.
    // dirX/dirY are the delta from source->target (not necessarily normalized).
    function getEdgePoint(center, el, dirX, dirY) {
        const w = el.offsetWidth || 0;
        const h = el.offsetHeight || 0;
        const halfW = w / 2;
        const halfH = h / 2;
        if (dirX === 0 && dirY === 0) return { x: center.x, y: center.y };
        const len = Math.hypot(dirX, dirY) || 1;
        const nx = dirX / len;
        const ny = dirY / len;
        const sx = nx === 0 ? Infinity : halfW / Math.abs(nx);
        const sy = ny === 0 ? Infinity : halfH / Math.abs(ny);
        const s = Math.min(sx, sy);
        return { x: center.x + nx * s, y: center.y + ny * s };
    }

    // Draw arrows for connections.
    // connections: array of [fromElement, toElement]
    // propsList: optional array of per-connection options, e.g. { style: 'center'|'edge' }
    function drawArrowsForConnections(svg, connections, propsList) {
        if (!svg) return;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        if (!Array.isArray(connections) || connections.length === 0) return;

        const pairs = [];
        const pts = [];

        for (let i = 0; i < connections.length; i++) {
            const [fromEl, toEl] = connections[i] || [];
            if (!fromEl || !toEl) continue;
            const pFrom = getCenter(fromEl);
            const pTo = getCenter(toEl);
            const dx = pTo.x - pFrom.x;
            const dy = pTo.y - pFrom.y;
            const props = (Array.isArray(propsList) && propsList[i]) || {};
            const style = props.style || 'center';

            let start, end;
            if (style === 'edge') {
                start = getEdgePoint(pFrom, fromEl, dx, dy);
                end = getEdgePoint(pTo, toEl, -dx, -dy);
            } else {
                // default: center-to-center
                start = pFrom;
                end = pTo;
            }

            pairs.push({ start, end });
            pts.push(start, end);
        }
        if (pairs.length === 0) return;

        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const minX = Math.min(...xs) - 20;
        const minY = Math.min(...ys) - 20;
        const maxX = Math.max(...xs) + 20;
        const maxY = Math.max(...ys) + 20;
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);

        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        for (const { start, end } of pairs) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', start.x - minX);
            line.setAttribute('y1', start.y - minY);
            line.setAttribute('x2', end.x - minX);
            line.setAttribute('y2', end.y - minY);
            line.setAttribute('stroke', 'black');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        }
    }

    window.ArrowLib = {
        getCenter,
        createOrGetArrowOverlay,
        drawArrowsForConnections
    };
})();
