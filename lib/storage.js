/**
 * StorageJson namespace
 * - wrap modern browsers local storage feature
 * - make dummy if local storage feature are not supported
 * - support json data
 */
var StorageJson = (function() {
	function _storageSupported() {
		try {
			localStorage.setItem('__test__', true);
			localStorage.removeItem('__test__');
			return true;
		} catch (e) {
			return false;
		}
	}
	return _storageSupported() ? {
		getItem : function(item, def) {
			var value = localStorage.getItem(item);
			if (value === null && typeof def != "undefined") {
				return def;
			}
			return JSON.parse(value);
		},
		setItem : function(item, value) {
			localStorage.setItem(item, JSON.stringify(value));
		},
		removeItem : function(item) {
			localStorage.removeItem(item);
		}
	} : {
		getItem : function(item, def) { return def; },
		setItem : function(item, value) {},
		removeItem : function(item) {}
	};
})();
