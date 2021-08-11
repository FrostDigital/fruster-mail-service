class LogUtils {

	static getGroupedMailUniqueIdentifierLog(email: string, key: string) {
		return `{ email: ${email}, key: ${key} }`;
	}

}

export default LogUtils;
