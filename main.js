
function createMovable({ id, x, y }) {
    const div = document.createElement('div');
    div.classList.add('movable');
    if (id) div.id = id;
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

function getDefaultState() {
    return {
        containers: [
            [
                { id: 'el1', x: 30, y: 40 },
                { id: 'el2', x: 120, y: 100 },
                { x: 60, y: 160 },
                { x: 200, y: 60 }
            ],
            [
                { x: 200, y: 60 },
                { x: 300, y: 180 },
                { x: 50, y: 220 },
                { x: 100, y: 50 },
                { x: 180, y: 120 },
                { x: 250, y: 90 },
                { x: 320, y: 40 },
                { x: 60, y: 160 },
                { x: 350, y: 250 },
                { x: 120, y: 200 },
                { x: 200, y: 260 },
                {}, {}, {}
            ]
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
                id: el.id || undefined,
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
    });
});
