const SendgridMail = require("../models/SendgridMail");
const errors = require("../errors");
const log = require("fruster-log");
const config = require("../../config");

class MailManager {

	/**
	 * @param {Object} sendGridApiClient which api client to use, mostly for being able to test without using a live verison of sendgrid
	 */
	constructor(sendGridApiClient) {
		this._sendGridApiClient = sendGridApiClient;
	}

	/**
	 * @typedef {Object} Mail
	 * @property {String} to
	 * @property {String} from
	 * @property {String} message
	 * @property {String} subject
	 * @property {Object} templateArgs
	 * @property {String} templateId
	 * @property {String} key
	 */

	/**
	 * @param {Array<String>|String} toEmails
	 * @param {Mail} mail
	 */
	async sendMail(toEmails, mail) {
		let mails = [];

		if (Array.isArray(toEmails)) {
			if (!toEmails.length)
				throw errors.badRequest("`to` array cannot empty");

			mails = toEmails.map(email => new SendgridMail({ ...mail, to: [email] }));
		} else {
			mails = [new SendgridMail(mail)];
		}

		if (config.catchAllEmail) {
			mails = mails.map(mail => {
				mail.to = [config.catchAllEmail]
				return mail;
			});
		}

		if (!mails[0].isValid()) {
			const validationErrors = mails[0].validate();

			log.debug("Mail is invalid:", validationErrors);

			throw errors.get("MISSING_FIELDS", validationErrors);
		}

		try {
			for (const email of mails) {
				await this._sendGridApiClient.send(email.toJSON());

				log.debug("Successfully sent 1 mail \"", email.subject, "\"");
			}
		} catch (err) {
			log.warn("Got failure from sendgrid", err);
		}
	}

	/**
	 * @param {Array<String>|String} toEmails
	 * @param {Mail} mail
	 * @param {Number} numberOfMails
	 */
	async sendGroupedMail(toEmails, mail, numberOfMails) {
		if (mail.subject)
			mail.subject = mail.subject.split("{{n}}").join(numberOfMails.toString());

		if (mail.message)
			mail.message = mail.message.split("{{n}}").join(numberOfMails.toString());

		if (mail.templateId) {
			if (!mail.templateArgs)
				mail.templateArgs = {};

			mail.templateArgs.n = numberOfMails;
		}

		return await this.sendMail(toEmails, mail);
	}

}

module.exports = MailManager;
