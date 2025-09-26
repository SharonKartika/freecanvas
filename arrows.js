// Draw arrows for a list of directed connections (edges) between pairs of elements
// connections: array of [fromElement, toElement] pairs
// NOTE: This function clears and recreates all SVG <line> nodes on each call
// (allocation/DOM churn) and reads element sizes/positions per call. For
// better perf consider caching centers/sizes (done here) and reusing <line>
// elements instead of recreating them.
function drawArrowsForConnections(svg, connections) {
    if (!Array.isArray(connections) || connections.length === 0) return;
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Hardcoded style selector: change this value to switch drawing behavior.
    // Options:
    //  - 'edge'   : draw from edge-to-edge along the center-to-center axis (default)
    //  - 'center' : draw from center-to-center (legacy behavior)
    const ARROW_STYLE = 'edge';
    // Precompute centers and sizes for all involved elements to avoid repeated DOM reads
    const allEls = Array.from(new Set(connections.flat()));
    const centerMap = new Map();
    const sizeMap = new Map();
    for (const el of allEls) {
        const xAttr = parseInt(el.getAttribute('X'), 10) || 0;
        const yAttr = parseInt(el.getAttribute('Y'), 10) || 0;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        centerMap.set(el, { x: xAttr + w / 2, y: yAttr + h / 2 });
        sizeMap.set(el, { w, h, halfW: w / 2, halfH: h / 2 });
    }
    // Center-to-center (legacy) behavior
    if (ARROW_STYLE === 'center') {
    // Gather all center points from cache to compute bounding box
    const centers = allEls.map(el => centerMap.get(el));
    const xs = centers.map(p => p.x);
    const ys = centers.map(p => p.y);
        const minX = Math.min(...xs) - 20;
        const minY = Math.min(...ys) - 20;
        const maxX = Math.max(...xs) + 20;
        const maxY = Math.max(...ys) + 20;
        const width = maxX - minX;
        const height = maxY - minY;
        // Position and size the SVG overlay to cover all points
        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        // Draw each connection as an arrow (center-to-center)
        for (const [fromEl, toEl] of connections) {
            const from = centerMap.get(fromEl);
            const to = centerMap.get(toEl);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', from.x - minX);
            line.setAttribute('y1', from.y - minY);
            line.setAttribute('x2', to.x - minX);
            line.setAttribute('y2', to.y - minY);
            line.setAttribute('stroke', 'black');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        }
        return;
    }

    // EDGE style (default): compute intersection with element edges along center-to-center axis
    function getEdgePoint(center, el, dirX, dirY) {
        const size = sizeMap.get(el) || { halfW: el.offsetWidth / 2, halfH: el.offsetHeight / 2 };
        const halfW = size.halfW;
        const halfH = size.halfH;
        const dx = dirX;
        const dy = dirY;
        // If centers coincide, just return center
        if (dx === 0 && dy === 0) return { x: center.x, y: center.y };
        // Compute candidate scalars that would reach the vertical and horizontal edges
        const sx = dx === 0 ? Infinity : halfW / Math.abs(dx);
        const sy = dy === 0 ? Infinity : halfH / Math.abs(dy);
        const s = Math.min(sx, sy);
        return { x: center.x + s * dx, y: center.y + s * dy };
    }

    // Compute start/end points for each connection using element edges (not centers)
    const pts = connections.map(([fromEl, toEl]) => {
        const fromCenter = centerMap.get(fromEl) || getCenter(fromEl);
        const toCenter = centerMap.get(toEl) || getCenter(toEl);
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        // Start on the edge of `fromEl` moving toward `toCenter`
        const start = getEdgePoint(fromCenter, fromEl, dx, dy);
        // End on the edge of `toEl` moving toward `fromCenter` (reverse direction)
        const end = getEdgePoint(toCenter, toEl, -dx, -dy);
        return { start, end };
    });

    // Gather all x/y from computed endpoints to compute bounding box
    const xs = pts.flatMap(p => [p.start.x, p.end.x]);
    const ys = pts.flatMap(p => [p.start.y, p.end.y]);
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 20;
    const maxX = Math.max(...xs) + 20;
    const maxY = Math.max(...ys) + 20;
    const width = maxX - minX;
    const height = maxY - minY;
    // Position and size the SVG overlay to cover all connection endpoints
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Draw each connection as a line between the computed edge points
    for (const { start, end } of pts) {
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

// Utility: get the center of a movable element
function getCenter(el) {
    const x = parseInt(el.getAttribute('X'), 10) || 0;
    const y = parseInt(el.getAttribute('Y'), 10) || 0;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return {
        x: x + w / 2,
        y: y + h / 2
    };
}

// Create or get the SVG overlay for a given .cameraViewContent
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

// Draw an arrow between two elements in a given SVG overlay
function drawArrowBetweenElements(svg, el1, el2) {
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const p1 = getCenter(el1);
    const p2 = getCenter(el2);
    // Calculate bounding box for the SVG overlay
    const minX = Math.min(p1.x, p2.x) - 20;
    const minY = Math.min(p1.y, p2.y) - 20;
    const maxX = Math.max(p1.x, p2.x) + 20;
    const maxY = Math.max(p1.y, p2.y) + 20;
    const width = maxX - minX;
    const height = maxY - minY;
    // Position and size the SVG overlay to cover both points
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    // Draw a line between the two centers, relative to the SVG's origin
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1.x - minX);
    line.setAttribute('y1', p1.y - minY);
    line.setAttribute('x2', p2.x - minX);
    line.setAttribute('y2', p2.y - minY);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
}

// Draw arrows between three elements, forming a triangle
function drawArrowsBetweenThreeElements(svg, el1, el2, el3) {
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const p1 = getCenter(el1);
    const p2 = getCenter(el2);
    const p3 = getCenter(el3);
    // Calculate bounding box for the SVG overlay
    const minX = Math.min(p1.x, p2.x, p3.x) - 20;
    const minY = Math.min(p1.y, p2.y, p3.y) - 20;
    const maxX = Math.max(p1.x, p2.x, p3.x) + 20;
    const maxY = Math.max(p1.y, p2.y, p3.y) + 20;
    const width = maxX - minX;
    const height = maxY - minY;
    // Position and size the SVG overlay to cover all points
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    // Draw three lines (arrows) between the three centers
    const pairs = [
        [p1, p2],
        [p2, p3],
        [p3, p1]
    ];
    for (const [start, end] of pairs) {
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

// Export functions for use in main.js
window.ArrowLib = {
    getCenter,
    createOrGetArrowOverlay,
    drawArrowBetweenElements,
    drawArrowsBetweenThreeElements,
    drawArrowsForConnections
};

// Expose to window for dynamic usage
// window.setupArrowUpdates = setupArrowUpdates;
// window.updateArrows = updateArrows;
