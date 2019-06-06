const FrusterRequest = require("fruster-bus").FrusterRequest;
const MailManager = require("../managers/MailManager");

class SendMailHandler {

	/**
	 * @param {MailManager} mailManager
	 */
	constructor(mailManager) {
		this._mailManager = mailManager;
	}

	/**
	 * @param {FrusterRequest} req
	 */
	async handle({ data }) {
		await this._mailManager.sendMail(data.to, data);

		return { status: 200 };
	}

}

module.exports = SendMailHandler;
