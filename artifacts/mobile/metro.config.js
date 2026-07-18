const { getDefaultConfig } = require('expo/metro-config');

// Polyfill for Array.prototype.toReversed for Node versions where it's missing.
// metro-config calls `configs.toReversed()` internally; older runtimes may lack it.
if (typeof Array.prototype.toReversed !== 'function') {
	// eslint-disable-next-line no-extend-native
	Array.prototype.toReversed = function toReversed() {
		return Array.prototype.slice.call(this).reverse();
	};
}

module.exports = getDefaultConfig(__dirname);
