const ms = require("ms");
const log = require("fruster-log");

module.exports = {

	// NATS servers, set multiple if using cluster
	// Example: `"nats://10.23.45.1:4222", "nats://10.23.41.8:4222"`
	bus: process.env.BUS || "nats://localhost:4222",

	// Domains we are allowed to send from
	defaultFrom: process.env.DEFAULT_FROM || "no-reply@frost.se",

	// Your secret sendgrid API key from here:
	// https://app.sendgrid.com/settings/api_keys
	sendgridApiKey: process.env.SENDGRID_API_KEY || "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",

	/** Characters around variables placed within templates. For instanace -firstName- */
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
	groupedMailsTimeoutProcessingCron: process.env.GROUPED_MAILS_TIMEOUT_PROCESSING_CRON || "* * * * *"

};

/**
 * @param {String} str
 *
 * @return {Array<String>}
 */
function parseArray(str) {
	if (str) return str.split(",");
	return null;
}

/**
 * @typedef {Object} GroupedMailsBatchSetting
 * @property {Number} numberOfMessages
 * @property {Number} timeout
 */

/**
 * @return {Array<GroupedMailsBatchSetting>}
 */
function parseBatchString(string) {
	try {
		const output = [];
		const parts = string.split(";");

		parts.forEach(part => {
			const batchParts = part.split(",");

			output.push({
				numberOfMessages: Number.parseInt(batchParts[0]), // read number of
				timeout: ms(batchParts[1])
			});
		});

		return output;
	} catch (err) {
		log.error("Error parsing GROUPED_MAIL_BATCHES", err.stack);
	}
}
