const constants = require("./lib/constants");
const mongo = require("mongodb");
const config = require("./config");
const docs = require("./lib/docs");
const bus = require("fruster-bus");
const log = require("fruster-log");
const uuid = require("uuid");
const Db = mongo.Db;

const GroupedMailBatchRepo = require("./lib/repos/GroupedMailBatchRepo");
const GroupedMailRepo = require("./lib/repos/GroupedMailRepo");

const MailManager = require("./lib/managers/MailManager");

const SendMailHandler = require("./lib/handlers/SendMailHandler");
const SendGroupedMailHandler = require("./lib/handlers/SendGroupedMailHandler");

const SendMailRequest = require("./lib/schemas/SendMailRequest");
const SendGroupedMailRequest = require("./lib/schemas/SendGroupedMailRequest");

/**
 * Usage of mail & email within this service:
 * 	email => email address
 *  mail => an actual email being sent to a user
 */
module.exports = {
	/**
	 * @param {String} busAddress
	 * @param {String} mongoUrl
	 * @param {Object} sendGridApiClient
	 */
	start: async (busAddress, mongoUrl, sendGridApiClient = require("sendgrid")(config.sendgridApiKey)) => {
		const db = await mongo.connect(mongoUrl);

		await bus.connect(busAddress);

		registerHandlers(db, sendGridApiClient);

		if (config.groupedMailsEnabled)
			registerIndexes(db);

		registerScheduledJobs();
	}
};

/**
 * @param {Db} db
 */
function registerHandlers(db, sendGridApiClient) {
	const groupedMailBatchRepo = new GroupedMailBatchRepo(db);
	const groupedMailRepo = new GroupedMailRepo(db);

	const mailManager = new MailManager(sendGridApiClient);

	const sendMailHandler = new SendMailHandler(mailManager);
	const sendGroupedMailHandler = new SendGroupedMailHandler(groupedMailBatchRepo, groupedMailRepo, mailManager);

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

	if (config.groupedMailsEnabled) {
		bus.subscribe({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			requestSchema: SendGroupedMailRequest,
			docs: docs.service.SEND_GROUPED_MAIL, // TODO:
			handle: req => sendGroupedMailHandler.handle(req)
		});
	}
}

async function registerIndexes(db) {
	try {
		const groupedMailsCollection = await db.collection(constants.collections.GROUPED_MAILS);

		const groupedMailBatchesCollection = await db.collection(constants.collections.GROUPED_MAIL_BATCHES);

		await groupedMailsCollection.createIndex({ email: 1, key: 1 });

		await groupedMailBatchesCollection.createIndex({ email: 1, key: 1 }, { unique: true });
	} catch (err) {
		log.info("Mongodb:", err.message);
	}
}

function registerScheduledJobs() {
	if (config.groupedMailsEnabled)
		bus.request({
			subject: "schedule-service.create-job",
			skipOptionsRequest: true,
			message: {
				reqId: uuid.v4(),
				data: {
					id: constants.endpoints.service.PROCESS_GROUPED_NOTIFICATION_TIMEOUTS, // TODO:
					subject: constants.endpoints.service.PROCESS_GROUPED_NOTIFICATION_TIMEOUTS, // TODO:
					cron: config.groupedNotificationsTimeoutProcessingCron, // TODO:
					description: "Processes time outs for grouped mails"
				}
			}
		});
}
