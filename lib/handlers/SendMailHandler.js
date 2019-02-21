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
	async handle(req) {
		await this._mailManager.sendMail(req.data.to, req.data);

		return { status: 200 };
	}

}

module.exports = SendMailHandler;
