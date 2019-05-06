class ArrayUtils {

	/**
	 * Remove duplicate entries from array.
	 *
	 * @param {Array<String>} arr
	 * @returns {Array<String>}
	 */
	static removeDuplicates(arr) {
		return [...new Set(arr)];
	}

}

module.exports = ArrayUtils;
