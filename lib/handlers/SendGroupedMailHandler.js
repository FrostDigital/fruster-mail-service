const GroupedMailBatchRepo = require("../repos/GroupedMailBatchRepo");
const GroupedMailRepo = require("../repos/GroupedMailRepo");
const BatchLevelUtils = require("../utils/BatchLevelUtils");
const FrusterRequest = require("fruster-bus").FrusterRequest;
const MailManager = require("../managers/MailManager");
const LogUtils = require("../utils/LogUtils");
const config = require("../../config");
const log = require("fruster-log");

const logPrefix = "[SendGroupedMailHandler]";

class SendGroupedMailHandler {

	/**
	 * @param {GroupedMailBatchRepo} groupedMailBatchRepo
	 * @param {GroupedMailRepo} groupedMailRepo
	 * @param {MailManager} mailManager
	 */
	constructor(groupedMailBatchRepo, groupedMailRepo, mailManager) {
		this._groupedMailBatchRepo = groupedMailBatchRepo;
		this._groupedMailRepo = groupedMailRepo;
		this._mailManager = mailManager;
	}

	/**
	 * @param {FrusterRequest} param0
	 */
	async handle({ data: { from, message, subject, templateArgs, templateId, to, key } }) {
		if (!Array.isArray(to))
			to = [to];

		const batches = await this._groupedMailBatchRepo.getByQuery({ email: { $in: to }, key });

		for (const email of to)
			await this._processGroupedMailForUser(email, { from, message, subject, templateArgs, templateId, key }, batches.find(b => b.email === email));

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
	async _processGroupedMailForUser(email, mail, currentBatch) {
		try {
			if (currentBatch) {
				log.debug(logPrefix,
					"Preparing grouped mail for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key));

				const { batchLevel } = currentBatch;

				const currentPendingMails = await this._groupedMailRepo.getByQuery({ email, key: mail.key });

				log.debug(logPrefix,
					"Found",
					currentPendingMails.length,
					"pending mails for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key));

				const currentBatchSettings = BatchLevelUtils.getBatchLevelSettingsForLevel(batchLevel);

				const enoughNotificationsToTriggerPushForCurrentBatchLevel = currentPendingMails.length + 1 >= currentBatchSettings.numberOfMessages;

				if (enoughNotificationsToTriggerPushForCurrentBatchLevel) {
					log.debug(logPrefix,
						LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key),
						"( with batch level",
						batchLevel,
						") has enough pending mail to trigger sending a mail.",
						currentPendingMails.length + 1,
						"/",
						currentBatchSettings.numberOfMessages);

					await this._deleteBatchMails(email, mail.key);

					await this._updateBatchEntry(email, mail.key, batchLevel + 1);

					return await this._mailManager.sendGroupedMail(email, { ...mail, to: email }, currentPendingMails.length + 1);
				} else {
					log.debug(logPrefix,
						LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key),
						"( with batch level",
						batchLevel,
						") did not have enough pending mail to trigger sendin a mail. Found (including the one currently sent)",
						currentPendingMails.length + 1,
						"and it needs",
						currentBatchSettings.numberOfMessages,
						"to send mail");

					await this._groupedMailRepo.add({ ...mail, email });
				}
			} else {
				log.debug(logPrefix,
					"Adding new grouped mail batch entry for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, mail.key));

				await this._groupedMailBatchRepo.put(email, mail.key, 1, BatchLevelUtils.getTimeoutDateForBatchLevel(1));

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
		const originalBatchLevel = batchLevel;

		/** Safety net  */
		if (batchLevel < 0)
			batchLevel = 0;

		/** Safety net  */
		if (batchLevel >= config.groupedMailBatches.length)
			batchLevel = config.groupedMailBatches.length - 1;

		log.debug(logPrefix, "Updates", LogUtils.getGroupedMailUniqueIdentifierLog(email, key), "with new batch level", batchLevel, "was", originalBatchLevel);

		await this._groupedMailBatchRepo.put(email, key, batchLevel, BatchLevelUtils.getTimeoutDateForBatchLevel(batchLevel));
	}

	/**
	 * Removes mails in batch being mailed to user
	 *
	 * @param {String} email
	 * @param {String} key
	 */
	async _deleteBatchMails(email, key) {
		log.debug(logPrefix, "Deletes mails in batch", LogUtils.getGroupedMailUniqueIdentifierLog(email, key));

		await this._groupedMailRepo.deleteByQuery({ email, key });
	}

}

module.exports = SendGroupedMailHandler;
