// Minimal arrows.js - draw center-to-center arrows between elements
(function () {
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

    // connections: array of [fromElement, toElement] pairs
    // Draw simple straight lines from center-to-center.
    function drawArrowsForConnections(svg, connections) {
        if (!svg) return;
        // Clear previous content
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        if (!Array.isArray(connections) || connections.length === 0) return;

        // Collect center points and pairs
        const pairs = [];
        const pts = [];
        for (const [fromEl, toEl] of connections) {
            if (!fromEl || !toEl) continue;
            const p1 = getCenter(fromEl);
            const p2 = getCenter(toEl);
            pairs.push({ p1, p2 });
            pts.push(p1, p2);
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

        for (const { p1, p2 } of pairs) {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p1.x - minX);
            line.setAttribute('y1', p1.y - minY);
            line.setAttribute('x2', p2.x - minX);
            line.setAttribute('y2', p2.y - minY);
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
