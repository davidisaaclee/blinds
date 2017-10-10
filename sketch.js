const k = {
	// How long should the script wait until enabling blinds interaction? (in ms)
	interactionDelay: 1000,

	// How tall is a single "blind"? (in px)
	blindsHeight: 50,

	// How quickly do the blinds open/close in response to mouse movement?
	// (larger number = faster)
	blindsSensitivity: 10,

	// How many blinds cycles (open to close to open) can the user scroll through by moving mouse up?
	maximumBlindsCyclesUp: 2,

	// How many blinds cycles (open to close to open) can the user scroll through by moving mouse down?
	maximumBlindsCyclesDown: 2,
};

// Only executed our code once the DOM is ready.
window.onload = function() {
	setup(paper);
}


// The number of blinds is calculated from the viewport height.
// Calling this will use the current viewport height.
const numberOfBlinds = () => paper.view.bounds.height / k.blindsHeight;

function setup(paper) {
	// Get a reference to the canvas object
	const canvas = document.getElementById('myCanvas');

	// Create an empty project and a view for the canvas:
	paper.setup(canvas);

	function makeBlindsPrototype(width, height) {
		const blindsPrototype = new paper.Path.Rectangle(new paper.Rectangle(0, 0, width, height));
		blindsPrototype.fillColor = 'white';
		return blindsPrototype;
	}

	// Create Paper.js symbol definition to represent the blinds.
	// A symbol definition lets us manipulate one item, and have the changes to that one item
	// update many instances, similar to a Sketch symbol.
	const blindsSymbolDefn = 
		new paper.SymbolDefinition(makeBlindsPrototype(paper.view.bounds.width, k.blindsHeight), true);

	// Place instances of the blinds' symbol definition.
	let blindsInstances = [];
	for (var blindIndex = 0; blindIndex < numberOfBlinds(); blindIndex++) {
		// Instantiate the blind.
		const instance = instantiateBlind(blindsSymbolDefn, blindIndex, numberOfBlinds());

		// Keep a reference to the instance.
		// (We'll need to update the instances' positions if the user resizes the window.)
		blindsInstances.push(instance);
	}

	// Create tool to interact with blinds after waiting `k.interactionDelay` ms.
	window.setTimeout(() => makeBlindsTool(blindsSymbolDefn), k.interactionDelay);

	// Add handler to layout items whenever window is resized.
	paper.view.onResize = (event) => {
		blindsSymbolDefn.item.bounds.width = event.size.width;
		if (blindsInstances.length < numberOfBlinds()) {
			for (let blindIndex = blindsInstances.length; blindIndex < numberOfBlinds(); blindIndex++) {
				blindsInstances[blindIndex] = instantiateBlind(blindsSymbolDefn, blindIndex, numberOfBlinds());
			}
		}
	};
}

// Returns a paper.Tool that controls opening and closing the blinds.
function makeBlindsTool(blindsSymbolDefinition) {
	const tool = new paper.Tool();

	// How much are the blinds open / closed?
	// 0 = fully open; 1 = fully closed.
	let blindsProgress = 0.001;

	// Keep a copy of the last applied scale factor.
	// (This is needed to calculate the scaling we need to apply to the active
	// scaling to attain the desired scale factor.)
	//
	// scaleToApply = desiredScale / lastScaleFactor
	tool.lastScaleFactor = 1;

	tool.onMouseMove = (event) => {
		// Increment `blindsProgress` with the change in mouse position.
		const delta = k.blindsSensitivity * -event.delta.y / paper.view.bounds.height;

		// (multiplying those max cycles numbers by 2, since a cycle spans 2 units of `blindsProgress`)
		blindsProgress = 
			clamp(blindsProgress + delta, 
						{ min: -k.maximumBlindsCyclesDown * 2, 
							max: k.maximumBlindsCyclesUp * 2 });

		// Scale the definition item based on the new scale factor.
		const newScaleFactor = (() => {
			// safety first!
			// clamp to (0, 1), then offset by a lil bit to prevent against both 
			// scaling to nothing and subpixel lines between blinds
			const clampToValidRange = (x) => clamp(x, { min: 0, max: 1 }) + 0.001;

			// some math to figure out the stage / progress of the blinds at the
			// current `blindsProgress`.
			const a = wrap(blindsProgress, 2.0);
			if (a > 1) {
				// blinds closing as mouse goes up
				return clampToValidRange(2 - a);
			} else {
				// blinds opening as mouse goes up
				return clampToValidRange(a);
			}
		})();
		blindsSymbolDefinition.item.scale(1, newScaleFactor / tool.lastScaleFactor);

		// Simulate scaling to nothing by hiding the blind item at the minimum scale level.
		if (newScaleFactor === 0.001) {
			blindsSymbolDefinition.item.visible = false;
		}

		// Unhide if the blinds had been hidden due to minimum scale level.
		if (newScaleFactor > 0.001 && tool.lastScaleFactor === 0.001) {
			blindsSymbolDefinition.item.visible = true;
		}

		tool.lastScaleFactor = newScaleFactor;
	};

	return tool;
}

// Instantiates a new SymbolItem from `blindDefinition`, for a blind at the specified index.
function instantiateBlind(blindDefinition, blindIndex, numberOfBlinds) {
		const instancePosition = 
			positionOfBlindInstance(blindIndex, paper.view.bounds.height, numberOfBlinds)

		const instance = blindDefinition.place(instancePosition);
		instance.pivot = new paper.Point(0, 0);
}


// -- Utility functions

function insertItemIntoIndexedMap(indexedMap, item) {
	return Object.assign({}, indexedMap, { [item.id]: item });
}

function clamp(n, { min, max }) {
	return Math.max(min, Math.min(max, n));
}

// like modulo, but negatives work more like how you'd expect
// wrap(-2, 10) => 8
function wrap(n, width) {
	const t = n % width;
	return (t < 0) ? (width + t) : t;
}

function positionOfBlindInstance(blindIndex, viewHeight, numberOfBlinds) {
	return new paper.Point(0, blindIndex * viewHeight / numberOfBlinds);
}
