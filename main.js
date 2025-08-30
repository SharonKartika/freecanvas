
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

const containersData = [
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
];

window.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    containersData.forEach(movables => body.appendChild(createCameraViewContainer(movables)));
    if (window.setupArrowUpdates) window.setupArrowUpdates();
    if (window.updateArrows) window.updateArrows();
    if (window.enableCameraView) window.enableCameraView('cameraViewContainer', 'cameraViewContent', 'movable');
    if (window.enableElementDragging) window.enableElementDragging('movable');
});
