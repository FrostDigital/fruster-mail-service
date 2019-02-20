const constants = require("./constants");

module.exports = {

	service: {

		SEND_MAIL: {
			description: "Sends a mail to one or more email addresses via sendgrid",
			errors: {

			}
		}

	},

	deprecated: {

		SEND: `Use ${constants.endpoints.service.SEND_MAIL} instead`

	}

};
