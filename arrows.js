function updateArrows() {
    // Select the second cameraViewContainer
    const containers = document.querySelectorAll('.cameraViewContainer');
    if (containers.length < 2) return;
    const secondContainer = containers[1];
    // Select the first two .movable elements inside the second container
    const movables = secondContainer.querySelectorAll('.movable');
    if (movables.length < 2) return;
    const firstElement = movables[0];
    const secondElement = movables[1];
    // Color the first two elements to confirm selection
    firstElement.style.background = 'lightgreen';
    secondElement.style.background = 'lightcoral';

    // Add or select SVG overlay inside .cameraViewContent
    const content = secondContainer.querySelector('.cameraViewContent');
    let svg = content.querySelector('svg.arrowOverlay');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('arrowOverlay');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        content.appendChild(svg);
    }
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Get logical positions from X/Y attributes
    const getCenter = (el) => {
        const x = parseInt(el.getAttribute('X'), 10) || 0;
        const y = parseInt(el.getAttribute('Y'), 10) || 0;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        return {
            x: x + w / 2,
            y: y + h / 2
        };
    };
    const p1 = getCenter(firstElement);
    const p2 = getCenter(secondElement);

    // Draw a line between the two centers
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1.x);
    line.setAttribute('y1', p1.y);
    line.setAttribute('x2', p2.x);
    line.setAttribute('y2', p2.y);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
}

function setupArrowUpdates() {
    const containers = document.querySelectorAll('.cameraViewContainer');
    if (containers.length >= 2) {
        containers[1].addEventListener('updateMovablePositions', updateArrows);
    }
}


// Expose to window for dynamic usage
window.setupArrowUpdates = setupArrowUpdates;
window.updateArrows = updateArrows;
