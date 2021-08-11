import config from "../../config";
import AbstractMailClient from "../clients/AbstractMailClient";
import errors from "../errors";
import Mail from "../models/Mail";

class MailManager {

	private mailClient!: AbstractMailClient;

	//It is not possible to inject mail client. It is making issues with unit tests.
	constructor(mailClient: AbstractMailClient) {
		this.mailClient = mailClient;
	}

	async sendMail({ to, from, subject, templateId, templateArgs, message }: Mail) {
		const isMultipleTo = Array.isArray(to);

		if (isMultipleTo && !to.length)
			throw errors.badRequest("`to` array cannot empty");

		this.mailClient.validate({ to, from, subject, templateId, message });

		if (config.catchAllEmail) {
			if (isMultipleTo)
				to = (to as string[]).map(this.setCatchMail);
			else
				to = this.setCatchMail(to as string);
		}

		await this.mailClient.sendMail({
			to,
			from: from || config.defaultFrom,
			subject,
			templateId,
			templateArgs,
			message
		});
	}

	async sendGroupedMail(mail: Mail, numberOfMails: number) {
		if (mail.subject)
			mail.subject = mail.subject.split("{{n}}").join(numberOfMails.toString());

		if (mail.message)
			mail.message = mail.message.split("{{n}}").join(numberOfMails.toString());

		if (mail.templateId) {
			if (!mail.templateArgs)
				mail.templateArgs = {};

			mail.templateArgs.n = numberOfMails;
		}

		return await this.sendMail(mail);
	}

	private setCatchMail(email: string): string {
		if (config.catchAllWhitelist) {
			const toDomain = email.split("@")[1];
			return config.catchAllWhitelist.includes(toDomain) ? email : config.catchAllEmail as string;
		} else {
			return config.catchAllEmail as string; //This will not undefined because it is already checked before
		}
	}

}

export default MailManager;
