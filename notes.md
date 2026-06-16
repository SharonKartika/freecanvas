Drag disable toggle:
- Add class `drag-disabled` to a draggable element to prevent new drags.
- Remove the class to re-enable dragging.

Demo:
- demo-canvas-arrow.html includes Enable/Disable buttons that toggle `drag-disabled` on the first element.
- Console test:
	- document.getElementById('1').classList.add('drag-disabled');
	- document.getElementById('1').classList.remove('drag-disabled');
