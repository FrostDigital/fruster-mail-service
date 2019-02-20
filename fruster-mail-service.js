const constants = require("./lib/constants");
const docs = require("./lib/docs");
const bus = require("fruster-bus");
const mongo = require("mongodb");
const Db = mongo.Db;

const GroupedEmailBatchRepo = require("./lib/repos/GroupedEmailBatchRepo");
const GroupedEmailRepo = require("./lib/repos/GroupedEmailRepo");

const SendMailHandler = require("./lib/handlers/SendMailHandler");
const SendGroupedEmailHandler = require("./lib/handlers/SendGroupedEmailHandler");

const SendMailRequest = require("./lib/schemas/SendMailRequest");

module.exports = {
	start: async (busAddress, mongoUrl) => {
		const db = await mongo.connect(mongoUrl);

		await bus.connect(busAddress);

		registerHandlers(db);
	}
};

/**
 * @param {Db} db
 */
function registerHandlers(db) {
	const groupedEmailBatchRepo = new GroupedEmailBatchRepo(db);
	const groupedEmailRepo = new GroupedEmailRepo(db);

	const sendMailHandler = new SendMailHandler();
	const sendGroupedEmailHandler = new SendGroupedEmailHandler(groupedEmailBatchRepo, groupedEmailRepo);

	bus.subscribe({
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

	bus.subscribe({
		subject: constants.endpoints.service.SEND_GROUPED_MAIL,
		requestSchema: SendMailRequest,
		docs: docs.service.SEND_GROUPED_MAIL,
		handle: req => sendGroupedEmailHandler.handle(req)
	});

}
