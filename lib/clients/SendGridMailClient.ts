import sgMail from "@sendgrid/mail";
import log from "fruster-log";

import config from "../../config";
import errors from "../errors";
import { SendMailParams } from "../models/Mail";
import AbstractMailClient from "./AbstractMailClient";

class SendGridMailClient extends AbstractMailClient {

	constructor() {
		super();
	}

	/**
	 * Send mail using template or plain
	 */
	async sendMail({ to, from, subject, templateId, templateArgs, message }: SendMailParams): Promise<void> {
		const mailData = this.getMailData({ to, from, subject, templateId, templateArgs, message });

		try {
			sgMail.setApiKey(config.sendGridApiKey);

			if (Array.isArray(to)) {
				await sgMail.send({ ...mailData, isMultiple: true });
				log.debug(`Successfully sent 1 mails ${subject} to ${to.join(",")}`);
			} else {
				await sgMail.send(mailData);
				log.debug(`Successfully sent 1 mails ${subject} to ${to}`);
			}
		} catch (e) {
			log.warn("Got failure from send grid", e);
		}
	}

	getMailData({ to, from, subject, templateId, templateArgs, message }: SendMailParams): sgMail.MailDataRequired {
		if (message) {
			const html = message.replace(new RegExp('\r?\n', 'g'), '<br />');

			return { to, from, subject, text: message, html };
		} else if (templateId) {
			if (templateArgs) {
				if (templateId.startsWith("d-")) {// For dynamic templates
					return { to, from, subject, templateId, dynamicTemplateData: templateArgs };
				} else { // For legacy templates
					return {
						to,
						from,
						subject,
						templateId,
						substitutions: templateArgs,
						substitutionWrappers: config.substitutionCharacter
					};
				}
			} else {
				return { to, from, subject, templateId };
			}
		} else {
			throw errors.badRequest("The request has not message or templateId");
		}
	}
}

export default SendGridMailClient;
