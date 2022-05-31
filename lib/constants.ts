export default {

	// Name of this service, used in various places
	SERVICE_NAME: "fruster-mail-service",

	collections: {

		// Name(s) of mongo collections
		GROUPED_MAILS: "grouped-mails",
		GROUPED_MAIL_BATCHES: "grouped-mail-batches",
		TEMPLATES: "templates"

	},

	limit: {
		RESOURCES: 20
	},

	createJobService: "schedule-service.create-job",

	mailClients: {
		SEND_GRID: "sendGrid",
		ID_RELAY: "idRelay"
	}

};
