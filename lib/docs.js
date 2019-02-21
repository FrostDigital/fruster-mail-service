const constants = require("./constants");

module.exports = {

	service: {

		SEND_MAIL: {
			description: "Sends a mail to one or more mails (emails) addresses via sendgrid",
			errors: {

			}
		}

	},

	deprecated: {

		SEND: `Use ${constants.endpoints.service.SEND_MAIL} instead`

	}

};
