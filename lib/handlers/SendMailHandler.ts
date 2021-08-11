import { FrusterRequest, FrusterResponse } from "fruster-bus";
import { subscribe, injectable } from "fruster-decorators";
import MailManager from "../managers/MailManager";

import SendMailRequest from "../schemas/SendMailRequestSchemas";

export const SERVICE_SUBJECT = "mail-service.send-mail";
export const DEPRECATED_SUBJECT = "mail-service.send";

/**
 * Handler to send mail.
 */
@injectable()
class SendMailHandler {

	private mailManager!: MailManager;

	//MailClient cannot inject because mock mail client properties are not reset after each unit test
	constructor(mailManager: MailManager) {
		this.mailManager = mailManager;
	}

	/**
	 * Handle deprecated service request.
	 */
	@subscribe({
		subject: DEPRECATED_SUBJECT,
		deprecated: `Use ${SERVICE_SUBJECT} instead`
	})
	async depHandle(req: FrusterRequest<SendMailRequest>): Promise<FrusterResponse<void>> {
		return this.handle(req);
	}

	/**
	 * Handle service request.
	 */
	@subscribe({
		subject: SERVICE_SUBJECT,
		requestSchema: "SendMailRequest",
		docs: {
			description: "Sends a mail to one or more mails (emails) addresses",
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
				BAD_REQUEST: "`to` array cannot empty",
				MISSING_FIELDS: "One or many required fields are missing"
			}
		}
	})
	async handle({ data }: FrusterRequest<SendMailRequest>): Promise<FrusterResponse<void>> {
		await this.mailManager.sendMail(data);

		return { status: 200 };
	}
}

export default SendMailHandler;
