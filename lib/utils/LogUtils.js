class LogUtils {

	/**
	 * @param {String} email
	 * @param {String} key
	 */
	static getGroupedEmailUniqueIdentifierLog(email, key) {
		return `{ email: ${email}, key: ${key} }`;
	}

}

module.exports = LogUtils;
