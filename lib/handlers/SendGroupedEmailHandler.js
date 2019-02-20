const GroupedEmailBatchRepo = require("../repos/GroupedEmailBatchRepo");
const GroupedEmailRepo = require("../repos/GroupedEmailRepo");
const BatchLevelUtils = require("../utils/BatchLevelUtils");
const FrusterRequest = require("fruster-bus").FrusterRequest;
const MailManager = require("../managers/MailManager");
const LogUtils = require("../utils/LogUtils");
const config = require("../../config");
const log = require("fruster-log");

const logPrefix = "SendGroupedEmail";

class SendGroupedEmail {

	/**
	 * @param {GroupedEmailBatchRepo} groupedEmailBatchRepo
	 * @param {GroupedEmailRepo} groupedEmailRepo
	 * @param {MailManager} mailManager
	 */
	constructor(groupedEmailBatchRepo, groupedEmailRepo, mailManager) {
		this._groupedEmailBatchRepo = groupedEmailBatchRepo;
		this._groupedEmailRepo = groupedEmailRepo;
		this._mailManager = mailManager;
	}

	/**
	 * @param {FrusterRequest} param0
	 */
	async handle({ data: { from, message, subject, templateArgs, templateId, to, key } }) {
		if (!Array.isArray(to))
			to = [to];

		const batches = await this._groupedEmailBatchRepo.getByQuery({ email: { $in: to }, key });

		for (const email of to)
			await this._processGroupedEmailForUser(email, { from, message, subject, templateArgs, templateId, key }, batches.find(b => b.email === email));

		return { status: 200 };
	}

	/**
	 * @param {String} email
	 * @param {Object} mail
	 * @param {String} mail.from
	 * @param {String} mail.message
	 * @param {String} mail.subject
	 * @param {String} mail.templateArgs
	 * @param {String} mail.templateId
	 * @param {String} mail.key
	 * @param {Object} currentBatch
	 * @param {String} currentBatch.email
	 * @param {String} currentBatch.key
	 * @param {Number} currentBatch.batchLevel
	 * @param {Date} currentBatch.created
	 */
	async _processGroupedEmailForUser(email, mail, currentBatch) {
		try {
			if (currentBatch) {
				log.debug(logPrefix,
					"Preparing grouped email for",
					LogUtils.getGroupedEmailUniqueIdentifierLog(email, currentBatch.key));

				const { batchLevel } = currentBatch;

				const currentPendingEmails = await this._groupedEmailRepo.getByQuery({ email, key: mail.key });

				log.debug(logPrefix,
					"Found",
					currentPendingEmails.length,
					"pending emails for",
					LogUtils.getGroupedEmailUniqueIdentifierLog(email, currentBatch.key));

				const currentBatchSettings = BatchLevelUtils.getBatchLevelSettingsForLevel(batchLevel);

				const enoughNotificationsToTriggerPushForCurrentBatchLevel = currentPendingEmails.length + 1 >= currentBatchSettings.numberOfMessages;

				if (enoughNotificationsToTriggerPushForCurrentBatchLevel) {
					log.debug(logPrefix,
						LogUtils.getGroupedEmailUniqueIdentifierLog(email, currentBatch.key),
						"( with batch level",
						batchLevel,
						") has enough pending emails to trigger a mail.",
						currentPendingEmails.length + 1,
						"/",
						currentBatchSettings.numberOfMessages);

					await this._deleteBatchEmails(email, mail.key);

					await this._updateBatchEntry(email, mail.key, batchLevel + 1);

					return await this._mailManager.sendGroupedMail(email, { ...mail, to: email }, currentPendingEmails.length + 1);
				} else {
					log.debug(logPrefix,
						LogUtils.getGroupedEmailUniqueIdentifierLog(email, currentBatch.key),
						"( with batch level",
						batchLevel,
						") did not have enough pending emails to trigger a mail. Found (including the one currently sent)",
						currentPendingEmails.length + 1,
						"and it needs",
						currentBatchSettings.numberOfMessages,
						"to send mail");

					await this._groupedEmailRepo.add({ ...mail, email });
				}
			} else {
				log.debug(logPrefix,
					"Adding new grouped email batch entry for",
					LogUtils.getGroupedEmailUniqueIdentifierLog(email, mail.key));

				await this._groupedEmailBatchRepo.put(email, mail.key, 1, BatchLevelUtils.getTimeoutDateForBatchLevel(1));

				await this._mailManager.sendGroupedMail(email, { ...mail, to: email }, 1);
			}
		} catch (err) {
			log.error(err);
		}
	}

	/**
	 * Updates batch entry w/ new level, created date and timeout date
	 *
	 * @param {String} email
	 * @param {String} key
	 * @param {Number} batchLevel
	 */
	async _updateBatchEntry(email, key, batchLevel) {
		/** Safety net  */
		if (batchLevel < 0)
			batchLevel = 0;

		/** Safety net  */
		if (batchLevel >= config.groupedEmailBatches.length)
			batchLevel = config.groupedEmailBatches.length - 1;

		log.debug(logPrefix, "Updates", LogUtils.getGroupedEmailUniqueIdentifierLog(email, key), "with new batch level", batchLevel);

		await this._groupedEmailBatchRepo.put(email, key, batchLevel, BatchLevelUtils.getTimeoutDateForBatchLevel(batchLevel));
	}

	/**
	 * Removes emails in batch being mailed to user
	 *
	 * @param {String} email
	 * @param {String} key
	 */
	async _deleteBatchEmails(email, key) {
		log.debug(logPrefix, "Deletes emails in batch", LogUtils.getGroupedEmailUniqueIdentifierLog(email, key));

		await this._groupedEmailRepo.deleteByQuery({ email, key });
	}

}

module.exports = SendGroupedEmail;
