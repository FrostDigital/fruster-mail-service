const GroupedMailBatchRepo = require("../repos/GroupedMailBatchRepo");
const GroupedMailRepo = require("../repos/GroupedMailRepo");
const BatchLevelUtils = require("../utils/BatchLevelUtils");
const MailManager = require("../managers/MailManager");
const LogUtils = require("../utils/LogUtils");
const log = require("fruster-log");

const logPrefix = "[ProcessGroupedmailTimeoutsHandler]";

/**
 * Scheduled job for processing timeouts of grouped mails.
 */
class ProcessGroupedMailTimeoutsHandler {

	/**
	 * @param {GroupedMailRepo} groupedMailRepo
	 * @param {GroupedMailBatchRepo} groupedMailBatchRepo
	 * @param {MailManager} mailManager
	 */
	constructor(groupedMailRepo, groupedMailBatchRepo, mailManager) {
		this._groupedMailBatchRepo = groupedMailBatchRepo;
		this._groupedMailRepo = groupedMailRepo;
		this._mailManager = mailManager;
	}

	async handle() {
		const timedOutMails = await this._groupedMailBatchRepo.getByQuery({ timeoutDate: { $gte: new Date() } });

		log.debug(logPrefix, "Found", timedOutMails.length, "timed out grouped mails this run");

		for (const mail of timedOutMails) {
			let { email, key, batchLevel } = mail;

			log.silly(logPrefix, "Processing", mail);

			const currentPendingMails = await this._groupedMailRepo.getByQuery({ email, key });

			log.debug(logPrefix, "Found", currentPendingMails.length, "pending mails for grouped mail", LogUtils.getGroupedMailUniqueIdentifierLog(email, key), "with batch level", batchLevel);

			if (currentPendingMails.length > 0) {
				const currentPendingMail = currentPendingMails[0];

				await this._mailManager.sendGroupedMail(currentPendingMail.email, { to: currentPendingMail.email, ...currentPendingMail }, currentPendingMails.length);
			}

			if (batchLevel > 1) {
				batchLevel -= 1;

				log.debug(logPrefix, "Updates", LogUtils.getGroupedMailUniqueIdentifierLog(email, key), "with new batch level", batchLevel, "was", batchLevel + 1);

				await this._groupedMailBatchRepo.put(email, key, batchLevel, BatchLevelUtils.getTimeoutDateForBatchLevel(batchLevel));
				await this._groupedMailRepo.deleteByQuery({ email, key });
			} else {
				log.debug(logPrefix, "Batch level was 0 for", LogUtils.getGroupedMailUniqueIdentifierLog(email, key), "so the grouped mail batch entry will be removed");
				/** If batchLevel is 0, we remove it so that it won't get processed when there is nothing to process. It will be created again next time a grouped mail is sent */
				await this._groupedMailBatchRepo.remove(email, key);
			}
		}

		return { status: 200 };
	}

}

module.exports = ProcessGroupedMailTimeoutsHandler;
