const constants = require("./constants");

module.exports = {

	service: {

		SEND_MAIL: {
			description: "Sends a mail to one or more mails (emails) addresses via sendgrid",
			errors: {

			}
		},

		SEND_GROUPED_MAIL: {
			description: "TODO:"
		},

		PROCESS_GROUPED_MAIL_TIMEOUTS: {
			description: "TODO:"
		}

	},

	deprecated: {

		SEND: `Use ${constants.endpoints.service.SEND_MAIL} instead`

	}

};
