const sgMail = require('@sendgrid/mail');
const uuid = require("uuid");
const mongo = require("mongodb");
const Db = mongo.Db;
const bus = require("fruster-bus");
const log = require("fruster-log");
const config = require("./config");
const docs = require("./lib/docs");
const constants = require("./lib/constants");

const GroupedMailBatchRepo = require("./lib/repos/GroupedMailBatchRepo");
const GroupedMailRepo = require("./lib/repos/GroupedMailRepo");

const MailManager = require("./lib/managers/MailManager");

const SendMailHandler = require("./lib/handlers/SendMailHandler");
const SendGroupedMailHandler = require("./lib/handlers/SendGroupedMailHandler");
const ProcessGroupedMailTimeoutsHandler = require("./lib/handlers/ProcessGroupedMailTimeoutsHandler");

const SendMailRequest = require("./lib/schemas/SendMailRequest");
const SendGroupedMailRequest = require("./lib/schemas/SendGroupedMailRequest");

/**
 * Usage of mail & email within this service:
 * email => email address
 * mail => an actual email being sent to a user
 */
module.exports = {
	/**
	 * @param {String} busAddress
	 * @param {String} mongoUrl
	 * @param {Object} sendGridApiClient
	 */
	start: async (busAddress, mongoUrl, sendGridApiClient = sgMail) => {
		await bus.connect(busAddress);

		let db;

		if (config.groupedMailsEnabled) {
			db = await mongo.connect(mongoUrl);
			await registerIndexes(db);
			registerScheduledJobs();
		}

		sendGridApiClient.setApiKey(config.sendgridApiKey);
		sendGridApiClient.setSubstitutionWrappers(config.substitutionCharacter[0], config.substitutionCharacter[1]);

		registerHandlers(db, sendGridApiClient);
	}
};

/**
 * @param {Db} db
 */
function registerHandlers(db, sendGridApiClient) {
	const mailManager = new MailManager(sendGridApiClient);

	let sendGroupedMailHandler;
	let processGroupedMailTimeoutsHandler;

	if (config.groupedMailsEnabled) {
		const groupedMailBatchRepo = new GroupedMailBatchRepo(db);
		const groupedMailRepo = new GroupedMailRepo(db);

		sendGroupedMailHandler = new SendGroupedMailHandler(groupedMailBatchRepo, groupedMailRepo, mailManager);
		processGroupedMailTimeoutsHandler = new ProcessGroupedMailTimeoutsHandler(groupedMailRepo, groupedMailBatchRepo, mailManager);
	}

	const sendMailHandler = new SendMailHandler(mailManager);

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
			docs: docs.service.SEND_GROUPED_MAIL,
			handle: req => sendGroupedMailHandler.handle(req)
		});

		bus.subscribe({
			subject: constants.endpoints.service.PROCESS_GROUPED_MAIL_TIMEOUTS,
			docs: docs.service.PROCESS_GROUPED_MAIL_TIMEOUTS,
			handle: () => processGroupedMailTimeoutsHandler.handle()
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
	bus.request({
		subject: "schedule-service.create-job",
		skipOptionsRequest: true,
		message: {
			reqId: uuid.v4(),
			data: {
				id: constants.endpoints.service.PROCESS_GROUPED_MAIL_TIMEOUTS,
				subject: constants.endpoints.service.PROCESS_GROUPED_MAIL_TIMEOUTS,
				cron: config.groupedMailsTimeoutProcessingCron,
				description: "Processes time outs for grouped mails"
			}
		}
	});
}
