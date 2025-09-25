
function createMovable({ id, x, y }) {
    const div = document.createElement('div');
    div.classList.add('movable');
        if (id !== undefined) div.id = id;
    if (typeof x === 'number') div.setAttribute('X', x);
    if (typeof y === 'number') div.setAttribute('Y', y);
    return div;
}

function createCameraViewContainer(movables) {
    const container = document.createElement('div');
    container.classList.add('cameraViewContainer');
    const content = document.createElement('div');
    content.classList.add('cameraViewContent');
    movables.forEach(movable => content.appendChild(createMovable(movable)));
    container.appendChild(content);
    return container;
}


const STORAGE_KEY = 'freecanvas_state';
// Clear localStorage for this key so new default IDs are loaded
localStorage.removeItem(STORAGE_KEY);

function getDefaultState() {
    // Assign IDs unique only within each container
    function makeMovables(arr) {
        return arr.map((xy, idx) => ({ id: idx + 1, x: xy[0], y: xy[1] }));
    }
    const containers = [
        makeMovables([
            [30, 40],
            [120, 100],
            [60, 160],
            [200, 60]
        ]),
        makeMovables([
            [200, 60],
            [300, 180],
            [50, 220],
            [100, 50],
            [180, 120],
            [250, 90],
            [320, 40],
            [60, 160],
            [350, 250],
            [120, 200],
            [200, 260],
            [undefined, undefined],
            [undefined, undefined],
            [undefined, undefined]
        ])
    ];
    // Default: connect about half the elements sequentially (1->2, 2->3, ... up to n/2)
    const defaultConnections = [];
    const half = Math.floor(containers[1].length / 2);
    for (let i = 1; i < 1 + half; i++) {
        defaultConnections.push([i, i + 1]);
    }
    return {
        containers,
        cameras: [
            { x: 0, y: 0, scale: 1 },
            { x: 0, y: 0, scale: 1 }
        ],
        connections: [[], defaultConnections] // one per container
    };
}

function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Load from localStorage if available, otherwise use default
function loadState() {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return getDefaultState();
    try {
        return JSON.parse(json);
    } catch {
        return getDefaultState();
    }
}

let state = loadState();

window.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    state.containers.forEach(movables => body.appendChild(createCameraViewContainer(movables)));
    if (window.setupArrowUpdates) window.setupArrowUpdates();
    if (window.updateArrows) window.updateArrows();
    if (window.enableCameraView) window.enableCameraView('cameraViewContainer', 'cameraViewContent', 'movable');
    if (window.enableElementDragging) window.enableElementDragging('movable');

    // Restore camera state after enableCameraView
    document.querySelectorAll('.cameraViewContainer').forEach((container, i) => {
        // Listen for cameraViewChanged to save camera state
        container.addEventListener('cameraViewChanged', e => {
            state.cameras[i] = {
                x: e.detail.x,
                y: e.detail.y,
                scale: e.detail.scale
            };
            saveState(state);
        });
        // Listen for updateMovablePositions to save positions
            container.addEventListener('updateMovablePositions', () => {
                state.containers[i] = Array.from(container.querySelectorAll('.movable')).map(el => ({
                    // Always save the integer ID
                    id: el.id ? (isNaN(Number(el.id)) ? el.id : Number(el.id)) : undefined,
                    x: parseInt(el.getAttribute('X'), 10) || 0,
                    y: parseInt(el.getAttribute('Y'), 10) || 0
                }));
                saveState(state);
            });
        // Restore camera state if available
        const cam = state.cameras[i];
        if (cam && window.enableCameraView && container.querySelector('.cameraViewContent')) {
            // Use a custom event to set camera state if your canvas.js supports it, or set directly if possible
            if (typeof container.setCameraView === 'function') {
                container.setCameraView(cam.x, cam.y, cam.scale);
            } else {
                // Optionally, you can expose a method in canvas.js to set cameraX, cameraY, scale
                // For now, just fire the event for future compatibility
                container.dispatchEvent(new CustomEvent('setCameraView', { detail: cam }));
            }
        }
        // Draw and update arrows for stored connections in the second container
        if (i === 1 && window.ArrowLib) {
            const drawArrows = () => {
                const movables = Array.from(container.querySelectorAll('.movable'));
                if (movables.length < 2) return;
                // Reset backgrounds
                movables.forEach(el => el.style.background = '');
                // Color all movables for visibility
                const colors = ['lightgreen', 'lightcoral', 'lightblue', 'khaki', 'plum', 'orange', 'lightpink', 'lightgray'];
                movables.forEach((el, idx) => el.style.background = colors[idx % colors.length]);
                const content = container.querySelector('.cameraViewContent');
                const svg = window.ArrowLib.createOrGetArrowOverlay(content);
                // Get connections from state (by ID)
                const connections = (state.connections && state.connections[1]) ? state.connections[1] : [];
                // Map IDs to elements
                const idToEl = {};
                movables.forEach(el => { idToEl[Number(el.id)] = el; });
                const edgePairs = connections
                    .map(([fromId, toId]) => [idToEl[fromId], idToEl[toId]])
                    .filter(([from, to]) => from && to);
                window.ArrowLib.drawArrowsForConnections(svg, edgePairs);
            };
            drawArrows();
            container.addEventListener('updateMovablePositions', drawArrows);
        }
    });
});
