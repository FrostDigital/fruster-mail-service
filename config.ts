import ms from "ms";
import log from "@fruster/log";

import constants from "./lib/constants";

const parseArray = (string?: string) => {
	if (string) return string.split(",");
	return null;
}

const parseBatchString = (string: string) => {
	try {
		const output: { numberOfMessages: number, timeout: number }[] = [];
		const parts = string.split(";");

		parts.forEach(part => {
			const batchParts = part.split(",");

			output.push({
				numberOfMessages: Number.parseInt(batchParts[0]), // read number of
				timeout: ms(batchParts[1])
			});
		});

		return output;
	} catch (err: any) {
		log.error("Error parsing GROUPED_MAIL_BATCHES", err.stack);
	}
}

/*
	This is where all configuration for service is set.

	Everything here is exposed as environmental variables but with
	developer friendly defaults which basically means that, if running
	locally, the developer could just start with `npm start` and not care
	of any additional configuration.

	Make sure to add comments to explain what the configuration is about.
*/

export default {
	// NATS servers, set multiple if using cluster.
	// Example: `"nats://10.23.45.1:4222,nats://10.23.41.8:4222"`
	bus: process.env.BUS || "nats://localhost:4222",

	// Mongo database URL
	mongoUrl: process.env.MONGO_URL || `mongodb://localhost:27017/${constants.SERVICE_NAME}`,

	/** Domains we are allowed to send from */
	defaultFrom: process.env.DEFAULT_FROM || "no-reply@frost.se",

	/** Mail client. Default is sendGrid. Values - sendGrid, idRelay, flowMailer */
	mailClient: process.env.MAIL_CLIENT || constants.mailClients.SEND_GRID,

	/**
	 * Your secret sendgrid API key from here:
	 * https://app.sendgrid.com/settings/api_keys
	 */
	sendGridApiKey: process.env.SENDGRID_API_KEY || "",

	/**
	 * Characters around variables placed within templates. For instance -firstName-
	 */
	substitutionCharacter: parseArray(process.env.SUBSTITUTION_CHARACTER) || ["-", "-"],

	/** Whether or not to enable grouped mails */
	groupedMailsEnabled: process.env.ENABLE_GROUPED_MAILS === "true",

	/**
	 * Settings for batches for grouped mails
	 * uses the format: `{numberOfMessages},{timeout};{numberOfMessages},{timeout};`
	 * numberOfMessages is the number of messages to be sent before next batch level is reached.
	 * timeout is the timeout for when mails are sent out even though the numberOfMessages has not been reached. Can be ms() or ms number
	*/
	groupedMailBatches: parseBatchString(process.env.GROUPED_MAIL_BATCHES || "1,0m;5,2m;30,5m"),

	/** Cron for processing timed out grouped mails, defaults to once every minute */
	groupedMailsTimeoutProcessingCron: process.env.GROUPED_MAILS_TIMEOUT_PROCESSING_CRON || "* * * * *",

	/**
	 * Will direct all email to this "catch all" email if set.
	 * Note that `CATCH_ALL_WHITELIST` will override this.
	 * WARNING: SHOULD ONLY BE USED FOR TESTING PURPOSES!
	 */
	catchAllEmail: process.env.CATCH_ALL_EMAIL,

	/**
	 * Will pass thru emails to these domains even though `CATCH_ALL_EMAIL` is set.
	 * Only applicable if `CATCH_ALL_EMAIL` is set.
	 *
	 * Set multiple values as commas separated string, for example:
	 * `frostdigital.se,frost.se`
	 */
	catchAllWhitelist: parseArray(process.env.CATCH_ALL_WHITELIST),

	/**
	 * Need this if mail client is idRelay
	 */
	idRelayUserName: process.env.ID_RELAY_USER_NAME,

	/**
	 * Need this if mail client is idRelay
	 */
	idRelayPassword: process.env.ID_RELAY_PASSWORD,

	/**
	 * If enabled mail service will manage email templates and expose
	 * endpoints to get and edit those.
	 *
	 * Note that this requires a database to be configured.
	 */
	templatesEnabled: process.env.TEMPLATES_ENABLED === "true",

	/**
	 * If set the named property of the logged in user will be matched
	 * with templates `owner` when CRUDing templates.
	 *
	 * Only applicable when TEMPLATES_ENABLED is true.
	 */
	templateOwnerProp: process.env.TEMPLATE_OWNER_PROP,

	/**
	 * Flowmailer configurations - https://dashboard.flowmailer.net/setup/sources/credentialswizard.html
	 */
	flowMailer: {
		clientId: process.env.FLOW_MAILER_CLIENT_ID || "3717fbafda22471cfe7bcfb4bb51ba0f5b979dd2",
		clientSecret: process.env.FLOW_MAILER_CLIENT_SECRET || "7be80ed02e61bc904fcf64799b324d18cdbcfe20",
		accountId: process.env.FLOW_MAILER_ACCOUNT_ID || "4459"
	}

};
