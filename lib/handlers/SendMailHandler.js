const SendgridMail = require("../models/SendgridMail");
const errors = require("../errors");
const conf = require("../../config");
const sendGrid = require("sendgrid")(conf.sendgridApiKey);
const log = require("fruster-log");

class SendMailHandler {

	async handle(req) {
		const mails = Array.isArray(req.data.to)
			? req.data.to.map(to => new SendgridMail({ ...req.data, to: [to] }))
			: [new SendgridMail(req.data)];

		if (!mails[0].isValid()) {
			const validationErrors = mails[0].validate();

			log.debug("Mail is invalid:", validationErrors);

			throw errors.get("MISSING_FIELDS", validationErrors);
		}

		try {
			for (const email of mails) {
				// @ts-ignore
				await sendGrid.API(this._createSendgridReq(email));

				log.debug("Succesfully sent 1 mail", email.model.subject);
			}
		} catch (err) {
			log.warn("Got failure from sendgrid", err);
		}

		return { status: 200 };
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

module.exports = SendMailHandler;
