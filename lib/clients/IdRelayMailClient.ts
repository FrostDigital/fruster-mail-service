import got from "got";
import log from "@fruster/log";

import config from "../../config";
import errors from "../errors";
import Mail, { SendMailParams } from "../models/Mail";
import AbstractMailClient from "./AbstractMailClient";

type MailData = {
	rhandle: string;
	data: { f1: string, f3?: { [key: string]: any } };
}

class IdRelayMailClient extends AbstractMailClient {

	constructor() {
		super();
	}

	/**
	 * Send mail using template or plain
	 */
	async sendMail({ to, subject, templateId, templateArgs }: SendMailParams): Promise<void> {
		try {
			if (Array.isArray(to)) {
				for (let toEmail of to)
					await this.sendRequest(templateId!, this.getMailData({ to: toEmail, templateArgs }));
				log.debug(`Successfully sent 1 mails ${subject} to ${to.join(",")}`);
			} else {
				await this.sendRequest(templateId!, this.getMailData({ to, templateArgs }));
				log.debug(`Successfully sent 1 mails ${subject} to ${to}`);
			}
		} catch (e) {
			log.warn("Got failure from id-relay", e);
		}
	}

	getMailData({ to, templateArgs }: Pick<SendMailParams, "to" | "templateArgs">): MailData {
		let mailData: MailData = {
			rhandle: to as string,
			data: {
				f1: to as string
			}
		};

		if (templateArgs)
			mailData.data.f3 = templateArgs;

		return mailData;
	}

	validate({ templateId }: Partial<Mail>) {
		if (!templateId)
			throw errors.get("MISSING_FIELDS", ["templateId"]);
	}

	private async sendRequest(activityId: string, mailData: MailData) {
		if (!config.idRelayUserName || !config.idRelayPassword)
			throw errors.internalServerError("idRelayUserName or idRelayPassword is not provided");

		try {
			await got.post(`https://api.idrelay.com/v5/api/v6/activities/${activityId}/recipient`, {
				json: mailData,
				headers: { "Authorization": "Basic " + this.getAuthHash() },
				retry: 0
			});
		} catch (e: any) {
			throw errors.internalServerError(e.message);
		}
	}

	private getAuthHash() {
		return Buffer.from(`${config.idRelayUserName}:${config.idRelayPassword}`).toString("base64");
	}
}

export default IdRelayMailClient;
