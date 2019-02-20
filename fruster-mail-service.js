const constants = require("./lib/constants");
const mongo = require("mongodb");
const config = require("./config");
const docs = require("./lib/docs");
const bus = require("fruster-bus");
const log = require("fruster-log");
const uuid = require("uuid");
const Db = mongo.Db;

const GroupedEmailBatchRepo = require("./lib/repos/GroupedEmailBatchRepo");
const GroupedEmailRepo = require("./lib/repos/GroupedEmailRepo");

const MailManager = require("./lib/managers/MailManager");

const SendMailHandler = require("./lib/handlers/SendMailHandler");
const SendGroupedEmailHandler = require("./lib/handlers/SendGroupedEmailHandler");

const SendMailRequest = require("./lib/schemas/SendMailRequest");
const SendGroupedMailRequest = require("./lib/schemas/SendGroupedMailRequest");

module.exports = {
	/**
	 * @param {String} busAddress
	 * @param {String} mongoUrl
	 * @param {Object} sendGridApiClient
	 */
	start: async (busAddress, mongoUrl, sendGridApiClient) => {
		const db = await mongo.connect(mongoUrl);

		await bus.connect(busAddress);

		registerHandlers(db, sendGridApiClient);

		if (config.groupedEmailsEnabled)
			registerIndexes(db);

		registerScheduledJobs();
	}
};

/**
 * @param {Db} db
 */
function registerHandlers(db, sendGridApiClient) {
	const groupedEmailBatchRepo = new GroupedEmailBatchRepo(db);
	const groupedEmailRepo = new GroupedEmailRepo(db);

	const mailManager = new MailManager(sendGridApiClient);

	const sendMailHandler = new SendMailHandler(mailManager);
	const sendGroupedEmailHandler = new SendGroupedEmailHandler(groupedEmailBatchRepo, groupedEmailRepo, mailManager);

	bus.subscribe({ /** DEPRECATED */
		subject: constants.endpoints.service.SEND,
		deprecated: docs.deprecated.SEND,
		handle: req => sendMailHandler.handle(req)
	});

	bus.subscribe({
		subject: constants.endpoints.service.SEND_MAIL,
		requestSchema: SendMailRequest,
		docs: docs.service.SEND_MAIL,
		handle: req => sendMailHandler.handle(req)
	});

	if (config.groupedEmailsEnabled) {
		bus.subscribe({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			requestSchema: SendGroupedMailRequest,
			docs: docs.service.SEND_GROUPED_MAIL, // TODO:
			handle: req => sendGroupedEmailHandler.handle(req)
		});
	}
}

async function registerIndexes(db) {
	try {
		const groupedEmailsCollection = await db.collection(constants.collections.GROUPED_EMAILS);

		const groupedEmailBatchesCollection = await db.collection(constants.collections.GROUPED_EMAIL_BATCHES);

		await groupedEmailsCollection.createIndex({ email: 1, key: 1 });

		await groupedEmailBatchesCollection.createIndex({ email: 1, key: 1 }, { unique: true });
	} catch (err) {
		log.info("Mongodb:", err.message);
	}
}

function registerScheduledJobs() {
	if (config.groupedEmailsEnabled)
		bus.request({
			subject: "schedule-service.create-job",
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				data: {
					id: constants.endpoints.service.PROCESS_GROUPED_NOTIFICATION_TIMEOUTS, // TODO:
					subject: constants.endpoints.service.PROCESS_GROUPED_NOTIFICATION_TIMEOUTS, // TODO:
					cron: config.groupedNotificationsTimeoutProcessingCron, // TODO:
					description: "Processes time outs for grouped emails"
				}
			}
		});
}
