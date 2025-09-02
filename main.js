
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
// localStorage.removeItem(STORAGE_KEY);

function getDefaultState() {
    // Assign IDs unique only within each container
    function makeMovables(arr) {
        return arr.map((xy, idx) => ({ id: idx + 1, x: xy[0], y: xy[1] }));
    }
    return {
        containers: [
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
        ],
        cameras: [
            { x: 0, y: 0, scale: 1 },
            { x: 0, y: 0, scale: 1 }
        ]
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
        // Draw and update arrow between two movables by ID in the second container
        if (i === 1 && window.ArrowLib) {
            // Specify the IDs to connect
            const ARROW_FROM_ID = 1;
            const ARROW_TO_ID = 2;
            const drawArrow = () => {
                const movables = container.querySelectorAll('.movable');
                const el1 = Array.from(movables).find(el => Number(el.id) === ARROW_FROM_ID);
                const el2 = Array.from(movables).find(el => Number(el.id) === ARROW_TO_ID);
                if (el1 && el2) {
                    el1.style.background = 'lightgreen';
                    el2.style.background = 'lightcoral';
                    const content = container.querySelector('.cameraViewContent');
                    const svg = window.ArrowLib.createOrGetArrowOverlay(content);
                    window.ArrowLib.drawArrowBetweenElements(svg, el1, el2);
                }
            };
            drawArrow();
            container.addEventListener('updateMovablePositions', drawArrow);
        }
    });
});
