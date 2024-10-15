import got from "got";
import log from "@fruster/log";

import config from "../../config";
import errors from "../errors";
import Mail, { SendMailParams } from "../models/Mail";
import AbstractMailClient from "./AbstractMailClient";
import AccessTokenRepo from "../repos/AccessTokenRepo";

enum MessageType {
	EMAIL = "EMAIL",
	SMS = "SMS",
	LETTER = "LETTER"
}

/**
 * https://flowmailer.com/apidoc/flowmailer-api#submitmessage
 */
type SubmitMessage = {
	messageType: MessageType,
	senderAddress: string;
	recipientAddress: string | string[];
	subject?: string;
	text?: string;
	html?: string;
}

class FlowMailerMailClient extends AbstractMailClient {

	accessTokenRepo!: AccessTokenRepo;
	loginUrl!: string;
	sendMailApiUrl!: string;

	constructor() {
		super();
		this.loginUrl = `https://login.flowmailer.net/oauth/token`;
		this.sendMailApiUrl = `https://api.flowmailer.net/${config.flowMailer.accountId}/messages/submit`;
	}

	/**
	 * Send mail using template or plain
	 */
	async sendMail({ to, from, subject, message, plainText }: SendMailParams): Promise<void> {
		const accessToken = await this.getAccessToken();

		try {
			await this.sendMailRequest(accessToken, this.getMailData({ to, from, subject, message, plainText }));
			log.debug(`Successfully sent mails ${subject} to ${Array.isArray(to) ? to.join(",") : to}`);
		} catch (e) {
			log.warn("Got failure from flow mailer", e);
		}
	}

	getMailData({ to, from, subject, message, plainText }: Omit<SendMailParams, "templateId" | "templateArgs">) {
		const data: SubmitMessage = {
			messageType: MessageType.EMAIL,
			senderAddress: from,
			recipientAddress: to
		}

		if (subject)
			data.subject = subject;

		if (plainText)
			data.text = message;
		else
			data.html = message;

		return data;
	}

	validate({ templateId }: Partial<Mail>) {

	}

	setAccessTokenRepo(accessTokenRepo: AccessTokenRepo) {
		this.accessTokenRepo = accessTokenRepo;
	}

	private async getAccessToken() {

		let accessToken = await this.accessTokenRepo.getAccessToken();

		if (accessToken)
			return accessToken;

		accessToken = await this.getAccessTokenByApi();

		await this.accessTokenRepo.addAccessToken(accessToken);

		return accessToken;
	}

	private async getAccessTokenByApi(): Promise<string> {
		try {
			const { body: { access_token } } = await got.post<{ access_token: string }>(this.loginUrl, {
				form: {
					client_id: config.flowMailer.clientId,
					client_secret: config.flowMailer.clientSecret,
					grant_type: "client_credentials"
				},
				responseType: 'json'
			});

			return access_token;
		} catch (e: any) {
			log.error(e.response.body);
			throw errors.internalServerError();
		}
	}

	private async sendMailRequest(accessToken: string, json: SubmitMessage) {
		try {
			await got.post(this.sendMailApiUrl, {
				json,
				headers: {
					"Accept": "application/vnd.flowmailer.v1.12+json",
					"Content-Type": "application/vnd.flowmailer.v1.12+json;charset=UTF-8",
					"Authorization": `Bearer ${accessToken}`,
				},
				retry: 0
			});
		} catch (e: any) {
			log.error(e.response.body);
			throw errors.internalServerError();
		}
	}
}

export default FlowMailerMailClient;
