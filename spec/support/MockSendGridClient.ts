import SendGridMailClient from "../../lib/clients/SendGridMailClient";
import { SendMailParams } from "../../lib/models/Mail";

type Status = "success" | "failure";

class MockSendGridClient extends SendGridMailClient {

	private mockResponses: { [email: string]: { type: Status, error?: string } } = {};
	public invocations: { [to: string]: number } = {};
	public interceptors: { [invocation: number]: { [to: string]: Function } } = {};

	constructor() {
		super();
	}

	/**
	 * Send mail using template or plain
	 */
	async sendMail({ to, from, subject, templateId, templateArgs, message }: SendMailParams): Promise<void> {
		const toEmail = Array.isArray(to) ? to[0] : to;

		const currentInvocation = this.invocations[toEmail] ?? 0;

		if (this.interceptors[currentInvocation]?.[toEmail])
			this.interceptors[currentInvocation]?.[toEmail](this.getMailData({ to, from, subject, templateId, templateArgs, message }));

		if (!this.invocations[toEmail])
			this.invocations[toEmail] = 1;
		else
			this.invocations[toEmail]++;

		const response = this.mockResponses[toEmail];

		if (!response)
			throw new Error(`Missing mock response for device token ${toEmail}`);

		response.type === "success" ? Promise.resolve() : Promise.reject(response.error);
	}

	mockSuccess(email: string) {
		this.mockResponses[email] = { type: "success" };
	}

	mockNotRegisteredFailure(email: string) {
		this.mockResponses[email] = { type: "failure", error: "NotRegistered" };
	}

	mockInterceptor(email: string, invocation: number, func: Function) {
		if (!this.interceptors[invocation])
			this.interceptors[invocation] = {};

		this.interceptors[invocation][email] = func;
	}

	mockInterceptorAll(email: string, func: Function) {
		if (!this.interceptors[0])
			this.interceptors[0] = {};

		this.interceptors[0][email] = func;
	}
}

export default MockSendGridClient;
