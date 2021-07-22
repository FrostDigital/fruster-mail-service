class SpecUtils {

    /**
     * Waits @param milliSeconds milliseconds before continuing
     *
     * @param {Number} milliSeconds
     */
	static delay(milliSeconds) {
		return new Promise((resolve) => setTimeout(() => resolve(), milliSeconds));
	}

}

module.exports = SpecUtils;
