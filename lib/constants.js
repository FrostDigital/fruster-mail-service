module.exports = {

	// Name of this service, used in various places
	SERVICE_NAME: "fruster-mail-service",

	endpoints: {

		service: {

			// Add internal service endpoints here
			SEND: "mail-service.send", /** DEPRECATED */
			SEND_MAIL: "mail-service.send-mail",
			SEND_GROUPED_MAIL: "mail-service.send-grouped-mail"

		}

	},

	collections: {

		// Name(s) of mongo collections
		GROUPED_MAILS: "grouped-mails",
		GROUPED_MAIL_BATCHES: "grouped-mail-batches"

	}

};
