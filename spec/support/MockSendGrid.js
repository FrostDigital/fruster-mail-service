class MockSendGrid {

	constructor() {
		this.mockResponses = {};
		this.interceptors = {};
		this.invocations = {};
	}

	async API({ body }) {
		const { personalizations: { [0]: { to: { [0]: { email: to } } } } } = body;
		const resp = this.mockResponses[to];
		const currentInvocation = this.invocations[to] || 0;

		if (this.interceptors[currentInvocation] && this.interceptors[currentInvocation][to])
			this.interceptors[currentInvocation][to](body);

		if (this.interceptors[to])
			this.interceptors[to](body);

		if (!this.invocations[to])
			this.invocations[to] = 1;
		else
			this.invocations[to]++;

		if (!resp)
			throw "Missing mock response for device token " + JSON.stringify(to);
		else if (resp.type === "success")
			return Promise.resolve();
		else
			return Promise.reject(resp.error);
	}

	/**
	 * @param {String} email
	 */
	mockSuccess(email) {
		this.mockResponses[email] = {
			type: "success"
		};
	}

	/**
	 * @param {String} email
	 */
	mockNotRegisteredFailure(email) {
		this.mockResponses[email] = {
			type: "failure",
			error: "NotRegistered"
		};
	}

	/**
	 * Adds a callback function for a registration token for a specific invocation
	 *
	 * @param {String} toEmail
	 * @param {Number} invocation
	 * @param {Function} func
	 */
	mockInterceptor(toEmail, invocation, func) {
		if (!this.interceptors[invocation])
			this.interceptors[invocation] = {};

		this.interceptors[invocation][toEmail] = func;
	}

	/**
	 * Adds a callback function for a registration token for a specific invocation
	 *
	 * @param {String} toEmail
	 * @param {Function} func
	 */
	mockInterceptorAll(toEmail, func) {
		this.interceptors[toEmail] = func;
	}


}

module.exports = MockSendGrid;
