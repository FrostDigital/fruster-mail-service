class SpecUtils {

	/**
	 * Waits @param milliSeconds milliseconds before continuing
	 */
	static delay(milliSeconds: number) {
		return new Promise((resolve) => setTimeout(() => resolve(""), milliSeconds));
	}

}

export default SpecUtils;
