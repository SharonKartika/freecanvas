
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

// Export functions for use in main.js
window.ArrowLib = {
    getCenter,
    createOrGetArrowOverlay,
    drawArrowBetweenElements
};

// Expose to window for dynamic usage
window.setupArrowUpdates = setupArrowUpdates;
window.updateArrows = updateArrows;
