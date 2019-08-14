class LogUtils {

	/**
	 * @param {String} email
	 * @param {String} key
	 */
	static getGroupedMailUniqueIdentifierLog(email, key) {
		return `{ email: ${email}, key: ${key} }`;
	}

}

module.exports = LogUtils;
