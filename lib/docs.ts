const constants = require("./constants");
const config = require("../config");
const ms = require("ms");

module.exports = {

	service: {

		SEND_MAIL: {
			description: "Sends a mail to one or more mails (emails) addresses via sendgrid",
			errors: {

			}
		},

		SEND_GROUPED_MAIL: {
			description: `Sends a mail that can be grouped. mails sent using this endpoint will be sent in groups, based off the \`GROUPED_MAIL_BATCHES\` config.
mails are grouped by \`email\` (taken from the \`to\` array) and \`key\`. When used with multiple \`email\`s in the \`to\` array, each \`email\` is grouped individually.

The grouping of mails happens in batches. Each batch “level” has a \`numberOfMessages\` (Number of messages before next batch level is reached) and \`timeout\` (timeout before level is decreased) defined. Every time a batch level's \`numberOfMessages\` is reached, the pending mails are sent out as one mail and the batch level is increased. Each new batch level will (most commonly) increase \`numberOfMessages\` and the \`timeout\`. If the number of messages is not fulfilled before the timeout is reached, the mail is sent with all pending grouped mails; then the batch level is decreased.

When a grouped mail is sent out; any \`{{n}}\` in mesasge and/or title will be replaced by the number of pending grouped mails at that point. When using templates,  \`n\` will be added to \`templateArgs\` and can then be used by the template. Example: When 56 grouped mails with the key \`message-service.NEW_MESSAGE\` have been sent w/ the message \`You have {{n}}}} new messages!\` it becomes:

\t You have 56 new messages!

Current configuration:


${config.groupedMailBatches.map((s, i) => `\t Batch level ${i + 1} => numberOfMessages: ${s.numberOfMessages}, timeout: ${ms(s.timeout)}`).join("\n\n")}

With this configuration after ${getNumberOfMessages()} mails being sent, the email would have received ${config.groupedMailBatches.length} mails; granted none of the timeouts have been reached.`,
			errors: {
				MISSING_FIELDS: "One or many required fields are missing. Detail contains `Missing field(s): {{missingField}}`",
				SENDGRID_ERRROR: "Sendgrid returned an error",
			}
		},

		PROCESS_GROUPED_MAIL_TIMEOUTS: {
			description: "To be used by schedule service. Checks for timed out grouped mails. If any is timedout; The pending mails are sent out as one mail and the batch is decreased (Until 0 and then removed)."
		}

	},

	deprecated: {

		SEND: `Use ${constants.endpoints.service.SEND_MAIL} instead`

	}

};

/**
 * Counts total messages needed to reach highest batch level for current config
 */
function getNumberOfMessages() {
	let totalNumberOfMessages = 0;

	config.groupedMailBatches.forEach(s => totalNumberOfMessages += s.numberOfMessages);

	return totalNumberOfMessages;
}
