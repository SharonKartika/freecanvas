function enableCameraView(containerClass, contentClass, elementClass) {
    document.querySelectorAll('.' + containerClass).forEach(function(container) {
        Object.assign(container.style, {
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none'
        });
    let cameraX = 0;    
    let cameraY = 0;
    let scale = 1;
    // Store scale on container for access by dragging logic
    container._cameraScale = scale;
        let isPanning = false;
        let startMouse = {x: 0, y: 0};
        let startCamera = {x: 0, y: 0};

    function updateMovablePositions() {
    // Listen for custom event to update positions during drag
    container.addEventListener('updateMovablePositions', updateMovablePositions);
            const content = container.querySelector('.' + contentClass);
            // Enforce mandatory content styles
            Object.assign(content.style, {
                position: 'absolute',
                left: '0',
                top: '0',
                width: '100%',
                height: '100%'
            });
            // Add will-change: transform for performance
            content.style.willChange = 'transform';
            content.style.transform = `translate(${-cameraX * scale}px, ${-cameraY * scale}px) scale(${scale})`;
            content.style.transformOrigin = 'top left';
            // Update scale property for dragging logic
            container._cameraScale = scale;

            let maxBottom = 0;
            let maxRight = 0;
            const boxWidth = 50, boxHeight = 50;
            const movables = Array.from(content.querySelectorAll('.' + elementClass));
            movables.forEach(function(el) {
                el.style.position = 'absolute';
                const x = parseInt(el.getAttribute('X'), 10);
                const y = parseInt(el.getAttribute('Y'), 10);
                if (!isNaN(x) && !isNaN(y)) {
                    if (y + boxHeight > maxBottom) maxBottom = y + boxHeight;
                    if (x + boxWidth > maxRight) maxRight = x + boxWidth;
                }
            });

            let autoPos = {x: maxRight, y: maxBottom};
            movables.forEach(function(el) {
                let x = parseInt(el.getAttribute('X'), 10);
                let y = parseInt(el.getAttribute('Y'), 10);
                if (isNaN(x) || isNaN(y)) {
                    x = autoPos.x;
                    y = autoPos.y;
                    // Assign X and Y attributes so this only happens once
                    el.setAttribute('X', x);
                    el.setAttribute('Y', y);
                    autoPos.y += boxHeight + 10; // 10px gap below
                }
                el.style.left = x + 'px';
                el.style.top = y + 'px';
            });
        }
        container.addEventListener('mousedown', function(e) {
            if (e.target.classList.contains(elementClass)) return; // Prevent camera pan if dragging element
            isPanning = true;
            startMouse.x = e.clientX;
            startMouse.y = e.clientY;
            startCamera.x = cameraX;
            startCamera.y = cameraY;
            container.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isPanning) return;
            const dx = (e.clientX - startMouse.x) / scale;
            const dy = (e.clientY - startMouse.y) / scale;
            cameraX = startCamera.x - dx;
            cameraY = startCamera.y - dy;
            updateMovablePositions();
        });

        document.addEventListener('mouseup', function() {
            isPanning = false;
            container.style.cursor = 'grab';
        });

        let pinchStartDist = null;
        let pinchStartScale = null;
        let pinchStartMid = null;
        container.addEventListener('touchstart', function(e) {
            if (e.touches.length === 1 && e.target.classList.contains(elementClass)) return; // Prevent camera pan if dragging element
            if (e.touches.length === 2) {
                // Pinch start
                const rect = container.getBoundingClientRect();
                const x0 = e.touches[0].clientX;
                const y0 = e.touches[0].clientY;
                const x1 = e.touches[1].clientX;
                const y1 = e.touches[1].clientY;
                const dx = x0 - x1;
                const dy = y0 - y1;
                pinchStartDist = Math.sqrt(dx * dx + dy * dy);
                pinchStartScale = scale;
                const midX = (x0 + x1) / 2;
                const midY = (y0 + y1) / 2;
                pinchStartMid = {
                    x: (midX - rect.left) / scale + cameraX,
                    y: (midY - rect.top) / scale + cameraY
                };
                isPanning = false;
            } else if (e.touches.length === 1) {
                isPanning = true;
                startMouse.x = e.touches[0].clientX;
                startMouse.y = e.touches[0].clientY;
                startCamera.x = cameraX;
                startCamera.y = cameraY;
                container.style.cursor = 'grabbing';
            }
            e.preventDefault(); // Prevent page scroll on touch start
        }, { passive: false });

        container.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2 && pinchStartDist !== null) {
                // Pinch to zoom
                const rect = container.getBoundingClientRect();
                const x0 = e.touches[0].clientX;
                const y0 = e.touches[0].clientY;
                const x1 = e.touches[1].clientX;
                const y1 = e.touches[1].clientY;
                const dx = x0 - x1;
                const dy = y0 - y1;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const midX = (x0 + x1) / 2;
                const midY = (y0 + y1) / 2;
                let newScale = pinchStartScale * (dist / pinchStartDist);
                newScale = Math.max(0.1, Math.min(newScale, 10));
                cameraX = pinchStartMid.x - (midX - rect.left) / newScale;
                cameraY = pinchStartMid.y - (midY - rect.top) / newScale;
                scale = newScale;
                updateMovablePositions();
                e.preventDefault();
            } else if (e.touches.length === 1 && isPanning) {
                // One finger pan
                const dx = (e.touches[0].clientX - startMouse.x) / scale;
                const dy = (e.touches[0].clientY - startMouse.y) / scale;
                cameraX = startCamera.x - dx;
                cameraY = startCamera.y - dy;
                updateMovablePositions();
                e.preventDefault();
            }
        }, { passive: false });

        container.addEventListener('touchend', function(e) {
            if (e.touches.length < 2) {
                pinchStartDist = null;
                pinchStartScale = null;
                pinchStartMid = null;
            }
            if (e.touches.length === 0) {
                isPanning = false;
                container.style.cursor = 'grab';
            }
            e.preventDefault();
        });

        container.addEventListener('wheel', function(e) {
            if (e.ctrlKey) {
                // Zoom in/out
                const zoomIntensity = 0.6;
                let newScale = scale * (1 - e.deltaY * zoomIntensity / 100);
                newScale = Math.max(0.1, Math.min(newScale, 10));
                // Zoom to mouse position
                const rect = container.getBoundingClientRect();
                const mouseX = (e.clientX - rect.left) / scale + cameraX;
                const mouseY = (e.clientY - rect.top) / scale + cameraY;
                cameraX = mouseX - (mouseX - cameraX) * (scale / newScale);
                cameraY = mouseY - (mouseY - cameraY) * (scale / newScale);
                scale = newScale;
            } else if (e.shiftKey) {
                cameraX += (e.deltaY !== 0 ? e.deltaY : e.deltaX) / scale;
            } else {
                cameraY += e.deltaY / scale;
                cameraX += e.deltaX / scale;
            }
            updateMovablePositions();
            e.preventDefault();
        }, { passive: false });

        updateMovablePositions();
    });
}

let dragState = {
    el: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    scale: 1,
    container: null
};

function updateDraggedPosition() {
    if (dragState.el) {
        dragState.el.style.left = dragState.nextLeft + 'px';
        dragState.el.style.top = dragState.nextTop + 'px';
    }
    dragState.pending = false;
}

function enableElementDragging(draggableClass) {
    // Attach document-level listeners only once
    if (enableElementDragging._listenersAttached) return;
    enableElementDragging._listenersAttached = true;

    // Use event delegation for mousedown and touchstart
    document.addEventListener('mousedown', function(e) {
        if (!e.target.classList.contains(draggableClass)) return;
        dragState.el = e.target;
        dragState.isDragging = true;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        dragState.origX = parseInt(e.target.getAttribute('X'), 10) || 0;
        dragState.origY = parseInt(e.target.getAttribute('Y'), 10) || 0;
        let container = e.target.closest('.cameraViewContainer');
        dragState.container = container;
        dragState.scale = container && container._cameraScale ? container._cameraScale : 1;
        e.stopPropagation();
        e.preventDefault();
    });
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        const target = e.target;
        if (!target.classList.contains(draggableClass)) return;
        dragState.el = target;
        dragState.isDragging = true;
        dragState.startX = e.touches[0].clientX;
        dragState.startY = e.touches[0].clientY;
        dragState.origX = parseInt(target.getAttribute('X'), 10) || 0;
        dragState.origY = parseInt(target.getAttribute('Y'), 10) || 0;
        let container = target.closest('.cameraViewContainer');
        dragState.container = container;
        dragState.scale = container && container._cameraScale ? container._cameraScale : 1;
        e.stopPropagation();
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('mousemove', function(e) {
        if (!dragState.isDragging || !dragState.el) return;
        const scale = dragState.scale || 1;
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = (e.clientY - dragState.startY) / scale;
        let newX = dragState.origX + dx;
        let newY = dragState.origY + dy;
        dragState.el.setAttribute('X', Math.round(newX));
        dragState.el.setAttribute('Y', Math.round(newY));
        // Always update via custom event for the correct container
        if (dragState.container) {
            dragState.container.dispatchEvent(new CustomEvent('updateMovablePositions'));
        }
    });
    document.addEventListener('mouseup', function(e) {
        dragState.isDragging = false;
        dragState.el = null;
        dragState.container = null;
    });
    document.addEventListener('touchmove', function(e) {
        if (!dragState.isDragging || !dragState.el || e.touches.length !== 1) return;
        const scale = dragState.scale || 1;
        const dx = (e.touches[0].clientX - dragState.startX) / scale;
        const dy = (e.touches[0].clientY - dragState.startY) / scale;
        let newX = dragState.origX + dx;
        let newY = dragState.origY + dy;
        dragState.el.setAttribute('X', Math.round(newX));
        dragState.el.setAttribute('Y', Math.round(newY));
        if (dragState.container) {
            dragState.container.dispatchEvent(new CustomEvent('updateMovablePositions'));
        }
        e.preventDefault();
    }, { passive: false });
    document.addEventListener('touchend', function(e) {
        dragState.isDragging = false;
        dragState.el = null;
        dragState.container = null;
    });
}

window.enableCameraView = enableCameraView;
window.enableElementDragging = enableElementDragging;
