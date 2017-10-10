// Only executed our code once the DOM is ready.
window.onload = function() {
	setup(paper);
}

const blindsHeight = 50;

// The number of blinds is calculated from the viewport height.
// Calling this will use the current viewport height.
const numberOfBlinds = () => paper.view.bounds.height / blindsHeight;

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
		new paper.SymbolDefinition(makeBlindsPrototype(paper.view.bounds.width, blindsHeight), true);

	// Place instances of the blinds' symbol definition.
	let blindsInstances = [];
	for (var blindIndex = 0; blindIndex < numberOfBlinds(); blindIndex++) {
		// Instantiate the blind.
		const instance = instantiateBlind(blindsSymbolDefn, blindIndex, numberOfBlinds());

		// Keep a reference to the instance.
		// (We'll need to update the instances' positions if the user resizes the window.)
		blindsInstances.push(instance);
	}

	// Create, activate, and register tool to manage blinds interaction.
	const blindsTool = makeBlindsTool(blindsSymbolDefn);
	blindsTool.activate();
	paper.tools.push(blindsTool);

	// Add handler to resize items whenever window is resized.
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
		const delta = 5 * -event.delta.y / paper.view.bounds.height;

		// Clamp the blinds progress to (almost) 0-1.
		// (Padding a bit on both sides: 0.001 because scaling to 0 is irreversible,
		// and 1.01 to fill in any subpixel gaps between the fully closed blinds.)
		blindsProgress = clamp(blindsProgress + delta, { min: 0.001, max: 1.01 });

		// Scale the definition item based on the new scale factor.
		const newScaleFactor = blindsProgress;
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

function positionOfBlindInstance(blindIndex, viewHeight, numberOfBlinds) {
	return new paper.Point(0, blindIndex * viewHeight / numberOfBlinds);
}
