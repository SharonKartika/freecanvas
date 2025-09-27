function createMovable({ id, x, y }) {
    const div = document.createElement('div');
    div.classList.add('movable');
        if (id !== undefined) div.id = id;
    if (typeof x === 'number') div.setAttribute('X', x);
    if (typeof y === 'number') div.setAttribute('Y', y);

    const words = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.".split(' ');
    const count = Math.floor(Math.random() * words.length) + 1;
    div.textContent = words.slice(0, count).join(' ');
    div.textContent = "";
    div.style.height = `${Math.floor(Math.random() * (200 - 60 + 1)) + 60}px`;
    // >>> START: ADDED (plus-button) - consider refactoring this block later <<<
    // If you ever set `.movable { overflow: hidden }`, the button may get clipped;
    // if that happens add:
    //   .movable { overflow: visible; }
    const controls = document.createElement('div');
    controls.className = 'movable-controls';
    const btn = document.createElement('button');
    const btn2 = document.createElement('button');
    btn.className = 'controls-button';
    btn2.className = 'controls-button';
    btn.textContent = '+';
    btn2.textContent = '↩';
    
    
    // Start the plus-drag on pointer down, then stop propagation so the movable itself won't start dragging
    btn.addEventListener('mousedown', e => {
        _plusDrag = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, container: e.target.closest('.cameraViewContainer'), source: e.target.closest('.movable'), button: e.target };
        e.stopPropagation();
    });
    btn.addEventListener('touchstart', e => {
        const t = e.touches[0];
        _plusDrag = { startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY, container: e.target.closest('.cameraViewContainer'), source: e.target.closest('.movable'), button: e.target };
        e.stopPropagation();
    }, { passive: false });
    // Make the reply button (btn2) also able to start plus-drag or click-to-create
    btn2.addEventListener('mousedown', e => {
        _plusDrag = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, container: e.target.closest('.cameraViewContainer'), source: e.target.closest('.movable'), button: e.target };
        e.stopPropagation();
    });
    btn2.addEventListener('touchstart', e => {
        const t = e.touches[0];
        _plusDrag = { startX: t.clientX, startY: t.clientY, lastX: t.clientX, lastY: t.clientY, container: e.target.closest('.cameraViewContainer'), source: e.target.closest('.movable'), button: e.target };
        e.stopPropagation();
    }, { passive: false });
    controls.appendChild(btn);
    controls.appendChild(btn2);

    div.appendChild(controls);
    // >>> END: ADDED (plus-button) <<<
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


const STORAGE_KEY = 'chat_canvas_state';
// Clear localStorage for this key so new default IDs are loaded
// localStorage.removeItem(STORAGE_KEY);

function getDefaultState() {
    // Assign IDs unique only within each container
    function makeMovables(arr) {
        return arr.map((xy, idx) => ({ id: idx + 1, x: xy[0], y: xy[1] }));
    }
    const containers = [
        makeMovables([
            [undefined, undefined]
        ])
    ];
    // Default: connect about half the elements sequentially (1->2, 2->3, ... up to n/2)
    const defaultConnections = [];
    // const half = Math.floor(containers[0].length / 2);
    // for (let i = 1; i < 1 + half; i++) {
    //     defaultConnections.push([i, i + 1]);
    // }
    return {
        containers,
        cameras: [
            { x: 0, y: 0, scale: 1 }
        ],
        connections: [defaultConnections] // one per container
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
    // Draw and update arrows for stored connections (if ArrowLib present)
    // Use the same container index when looking up stored connections so
    // arrows appear for the matching container. Previously this was
    // hard-coded to `i === 0` and `connections[1]`, which was inconsistent
    // with the comment and `state.connections` indexing.
    if (window.ArrowLib) {
            const drawArrows = () => {
                const movables = Array.from(container.querySelectorAll('.movable'));
                if (movables.length < 2) return;
                // Reset backgrounds
                movables.forEach(el => el.style.background = '');
                // Color all movables for visibility
                // const colors = ['lightgreen', 'lightcoral', 'lightblue', 'khaki', 'plum', 'orange', 'lightpink', 'lightgray'];
                // movables.forEach((el, idx) => el.style.background = colors[idx % colors.length]);
                const content = container.querySelector('.cameraViewContent');
                const svg = window.ArrowLib.createOrGetArrowOverlay(content);
                // Get connections from state for the current container (by ID)
                const connections = (state.connections && state.connections[i]) ? state.connections[i] : [];
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

// Minimal drag-to-create for the small "+" button inside movables
let _plusDrag = null;
// Reusable helper: create a new movable from a plus-drag-like object.
// drag: { lastX, lastY, container, source, button }
function createMovableFromDrag(drag) {
    if (!drag) return null;
    const c = drag.container || document.elementFromPoint(drag.lastX, drag.lastY)?.closest('.cameraViewContainer');
    if (!c) return null;
    const content = c.querySelector('.cameraViewContent');
    const r = c.getBoundingClientRect();
    const m = (getComputedStyle(content).transform || 'none').match(/matrix\(([^)]+)\)/);
    const vals = m ? m[1].split(',').map(Number) : [1,0,0,1,0,0];
    const a = vals[0], tx = vals[4], ty = vals[5];
    // Decide between click (no movement) and drag. For a click, place relative to source (+200 y).
    // For a drag, place at the pointer release location.
    let worldX, worldY;
    const yplusoffset = 300; // pixels to offset new element downward on click
    if (drag.source) {
        const src = drag.source;
        const isClick = (typeof drag.startX === 'number' && typeof drag.startY === 'number' && drag.startX === drag.lastX && drag.startY === drag.lastY);
        if (isClick) {
            // Click: read stored world X/Y from attributes (these are the saved top-left coordinates)
            let srcX = parseInt(src.getAttribute('X'), 10);
            let srcY = parseInt(src.getAttribute('Y'), 10);
            // If attributes are missing or invalid, compute from DOM bounding rect into world coordinates
            if (isNaN(srcX) || isNaN(srcY)) {
                const srcRect = src.getBoundingClientRect();
                const srcLeftWorld = Math.round((srcRect.left - r.left - tx) / a);
                const srcTopWorld = Math.round((srcRect.top - r.top - ty) / a);
                srcX = isNaN(srcX) ? srcLeftWorld : srcX;
                srcY = isNaN(srcY) ? srcTopWorld : srcY;
            }
            const srcW = (src.offsetWidth) || 50;
            const srcH = (src.offsetHeight) || 50;
            // center-to-center placement and add 200px to the Y coordinate
            worldX = Math.round(srcX + srcW / 2);
            worldY = Math.round(srcY + srcH / 2 + yplusoffset);
        } else {
            // Drag: place at pointer location
            worldX = Math.round((drag.lastX - r.left - tx) / a);
            worldY = Math.round((drag.lastY - r.top - ty) / a);
        }
    } else {
        // No source element (edge case) — place at pointer location
        worldX = Math.round((drag.lastX - r.left - tx) / a);
        worldY = Math.round((drag.lastY - r.top - ty) / a);
    }
    const newEl = createMovable({ id: undefined, x: worldX, y: worldY });
    content.appendChild(newEl);
    // Center the element at the world coordinates
    const w = newEl.offsetWidth || 50;
    const h = newEl.offsetHeight || 50;
    const centeredX = Math.round(worldX - w / 2);
    const centeredY = Math.round(worldY - h / 2);
    newEl.setAttribute('X', centeredX);
    newEl.setAttribute('Y', centeredY);
    // Update state and arrows similar to previous logic
    const containers = Array.from(document.querySelectorAll('.cameraViewContainer'));
    const idx = containers.indexOf(c);
    state.connections = state.connections || [];
    state.connections[idx] = state.connections[idx] || [];
    const src = drag.source;
    const ensureId = el => {
        if (!el) return undefined;
        if (!el.id) {
            const existing = Array.from(c.querySelectorAll('.movable')).map(m => Number(m.id)).filter(n => !isNaN(n));
            let nid = existing.length ? Math.max(...existing) + 1 : 1;
            el.id = String(nid);
        }
        return Number(el.id);
    };
    const fromId = ensureId(src);
    const existing = Array.from(content.querySelectorAll('.movable')).map(m => Number(m.id)).filter(n => !isNaN(n));
    const newId = existing.length ? Math.max(...existing) + 1 : 1;
    newEl.id = String(newId);
    state.connections[idx].push([fromId, newId]);
    c.dispatchEvent(new CustomEvent('updateMovablePositions'));
    if (window.ArrowLib) {
        const svg = window.ArrowLib.createOrGetArrowOverlay(content);
        const movables = Array.from(content.querySelectorAll('.movable'));
        const idToEl = {};
        movables.forEach(el => { if (el.id) idToEl[Number(el.id)] = el; });
        const edgePairs = state.connections[idx].map(([a,b]) => [idToEl[a], idToEl[b]]).filter(p => p[0] && p[1]);
        window.ArrowLib.drawArrowsForConnections(svg, edgePairs);
    }
    return newEl;
}
// >>> START: ADDED (plus-drag + arrows) - consider refactoring this block later <<<
document.addEventListener('mousemove', e => { if (_plusDrag) { _plusDrag.lastX = e.clientX; _plusDrag.lastY = e.clientY; } });
document.addEventListener('mouseup', () => {
    if (!_plusDrag) return;
    // If the user didn't move the mouse (click), still create at the button's projected location
    createMovableFromDrag(_plusDrag);
    // If the button that started the plus-drag still has focus, remove it so it hides
    try { if (_plusDrag && _plusDrag.button && typeof _plusDrag.button.blur === 'function') _plusDrag.button.blur(); } catch (e) {}
    _plusDrag = null;
});
// >>> END: ADDED (plus-drag + arrows) <<<
