const log = require("fruster-log");
const errors = require("../errors");
const SendgridMail = require("../models/SendgridMail");

class MailManager {

	/**
	 *
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
		const mails = Array.isArray(toEmails)
			? toEmails.map(email => new SendgridMail({ ...mail, to: [email] }))
			: [new SendgridMail(mail)];

		if (!mails[0].isValid()) {
			const validationErrors = mails[0].validate();

			log.debug("Mail is invalid:", validationErrors);

			throw errors.get("MISSING_FIELDS", validationErrors);
		}

		try {
			for (const email of mails) {
				await this._sendGridApiClient.API(this._createSendgridReq(email));

				log.debug("Succesfully sent 1 mail \"", email.model.subject, "\"");
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

		if (mail.templateId)
			mail.templateArgs.n = numberOfMails;

		return await this.sendMail(toEmails, mail);
	}

    /**
     * @param {Object} mail
     */
	_createSendgridReq(mail) {
		return {
			method: "POST",
			path: "/v3/mail/send",
			body: mail.toJSON()
		};
	}

}

module.exports = MailManager;
