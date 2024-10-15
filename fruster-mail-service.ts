import { Db, MongoClient } from "mongodb";
import { v4 } from "uuid";
import bus from "@fruster/bus";
import log from "@fruster/log";
import { injections } from "@fruster/decorators";

import config from "./config";
import constants from "./lib/constants";
import AbstractMailClient from "./lib/clients/AbstractMailClient";
import FlowMailerMailClient from "./lib/clients/FlowMailerMailClient";
import MailManager from "./lib/managers/MailManager";
import GroupedMailBatchRepo from "./lib/repos/GroupedMailBatchRepo";
import GroupedMailRepo from "./lib/repos/GroupedMailRepo";
import TemplateRepo from "./lib/repos/TemplateRepo";
import AccessTokenRepo from "./lib/repos/AccessTokenRepo";
import SendMailHandler from "./lib/handlers/SendMailHandler";
import SendGroupedMailHandler from "./lib/handlers/SendGroupedMailHandler";
import ProcessGroupedMailTimeoutsHandler, {
	SERVICE_SUBJECT as PROCESS_GROUPED_MAIL_TIMEOUTS_SUBJECT
} from "./lib/handlers/ProcessGroupedMailTimeoutsHandler";
import GetTemplateByIdHandler from "./lib/handlers/GetTemplateByIdHandler";
import UpdateTemplateHandler from "./lib/handlers/UpdateTemplateHandler";
import CreateTemplateHandler from "./lib/handlers/CreateTemplateHandler";


export const start = async (busAddress: string, mongoUrl: string, mailClient: AbstractMailClient) => {
	await bus.connect({
		address: busAddress,
	});

	if (config.catchAllEmail)
		log.warn(`Catch all is enabled - all emails will be sent to ${config.catchAllEmail} - this should NOT be used in production`);

	let db: Db | undefined = undefined;

	if (config.groupedMailsEnabled || config.templatesEnabled || config.mailClient === constants.mailClients.FLOW_MAILER) {
		const client = new MongoClient(mongoUrl);
		db = (await client.connect()).db();

		if (!process.env.CI) await createIndexes(db);

		if (config.mailClient === constants.mailClients.FLOW_MAILER)
			(mailClient as FlowMailerMailClient).setAccessTokenRepo(new AccessTokenRepo(db));
	}

	const mailManager = new MailManager(mailClient);

	if (config.groupedMailsEnabled) {
		if (!db) {
			throw new Error("Cannot configure mail batches/grouped email as no db is configured");
		}

		if (!process.env.CI) registerScheduledJobs();
		registerGroupMailHandlers(mailManager, db);
	}

	if (config.templatesEnabled) {
		if (!db) {
			throw new Error("Cannot configure templates as no db is configured");
		}

		registerTemplateHandlers(mailManager, db);
	}

	registerHandlers(mailManager);
};

const registerHandlers = (mailManager: MailManager) => {
	/**
	 * Http handlers
	 * Add http handlers here
	 */

	/**
	 * Service handlers
	 * Add service handlers here
	 */
	new SendMailHandler(mailManager);
}

const registerGroupMailHandlers = (mailManager: MailManager, db: Db) => {
	const groupedMailBatchRepo = new GroupedMailBatchRepo(db);
	const groupedMailRepo = new GroupedMailRepo(db);

	injections({ groupedMailBatchRepo, groupedMailRepo });

	/**
	 * Http handlers
	 * Add http handlers here
	 */

	/**
	 * Service handlers
	 * Add service handlers here
	 */
	new SendGroupedMailHandler(mailManager);
	new ProcessGroupedMailTimeoutsHandler(mailManager);
}

const registerTemplateHandlers = (mailManager: MailManager, db: Db) => {
	const templateRepo = new TemplateRepo(db);

	mailManager.templateRepo = templateRepo;

	injections({ templateRepo });

	new GetTemplateByIdHandler();
	new UpdateTemplateHandler(mailManager);
	new CreateTemplateHandler();
}

const createIndexes = async (db: Db) => {
	try {
		if (config.groupedMailsEnabled) {
			await db.collection(constants.collections.GROUPED_MAILS).createIndex({ email: 1, key: 1 })
			await db.collection(constants.collections.GROUPED_MAIL_BATCHES).createIndex({ email: 1, key: 1 }, { unique: true });
		}

		if (config.templatesEnabled) {
			await db.collection(constants.collections.TEMPLATES).createIndex({ id: 1 }, { unique: true })
		}

		if (config.mailClient === constants.mailClients.FLOW_MAILER)
			//https://flowmailer.com/apidoc/flowmailer-api#authentication
			await db.collection(constants.collections.ACCESS_TOKENS).createIndex({ created: 1 }, { expireAfterSeconds: 59 });
	} catch (err: any) {
		log.info("Mongodb:", err.message);
	}
}

const registerScheduledJobs = () => {
	bus.request({
		subject: constants.createJobService,
		message: {
			reqId: v4(),
			data: {
				id: PROCESS_GROUPED_MAIL_TIMEOUTS_SUBJECT,
				subject: PROCESS_GROUPED_MAIL_TIMEOUTS_SUBJECT,
				cron: config.groupedMailsTimeoutProcessingCron,
				description: "Processes time outs for grouped mails"
			},
		},
	});
}
