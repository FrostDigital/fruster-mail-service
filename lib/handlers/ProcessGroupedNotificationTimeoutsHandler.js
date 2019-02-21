const GroupedNotificationBatchRepo = require("../repos/GroupedNotificationBatchRepo");
const GroupedNotificationRepo = require("../repos/GroupedNotificationRepo");
const BatchLevelUtils = require("../utils/BatchLevelUtils");
const PushManager = require("../managers/PushManager");
const LogUtils = require("../utils/LogUtils");
const log = require("fruster-log");

const logPrefix = "ProcessGroupedNotificationTimeoutsHandler:";

/**
 * Scheduled job for processing timeouts of grouped notifications.
 */
class ProcessGroupedMailTimeoutsHandler {

	/**
	 * @param {GroupedNotificationRepo} groupedNotificationRepo
	 * @param {GroupedNotificationBatchRepo} groupedNotificationBatchRepo
	 * @param {PushManager} pushManager
	 */
	constructor(groupedNotificationRepo, groupedNotificationBatchRepo, pushManager) {
		this._groupedNotificationBatchRepo = groupedNotificationBatchRepo;
		this._groupedNotificationRepo = groupedNotificationRepo;
		this._pushManager = pushManager;
	}

	async handle() {
		const timedOutNotifications = await this._groupedNotificationBatchRepo.getByQuery({ timeoutDate: { $gte: new Date() } });

		log.debug(logPrefix, "Found", timedOutNotifications.length, "timed out grouped notifications this run");

		for (const notification of timedOutNotifications) {
			let { userId, key, batchLevel } = notification;

			log.silly(logPrefix, "Processing", notification);

			const currentNotifications = await this._groupedNotificationRepo.getByQuery({ userId, key });

			log.debug(logPrefix, "Found", currentNotifications.length, "pending notifications for grouped notification", LogUtils.getGroupedNotificationUniqueIdentifierLog(userId, key));

			if (currentNotifications.length > 0) {
				const currentNotification = currentNotifications[0];

				await this._pushManager.sendGroupedNotification(currentNotification.userId, currentNotification.body, currentNotification.clickAction, currentNotifications.length);
			}

			if (batchLevel > 1) {
				batchLevel -= 1;

				log.debug(logPrefix, "Updates", LogUtils.getGroupedNotificationUniqueIdentifierLog(userId, key), "with new batch level", batchLevel);

				await this._groupedNotificationBatchRepo.put(userId, key, batchLevel, BatchLevelUtils.getTimeoutDateForBatchLevel(batchLevel));
				await this._groupedNotificationRepo.deleteByQuery({ userId, key });
			} else {
				log.debug(logPrefix, "Batch level was 0 for", LogUtils.getGroupedNotificationUniqueIdentifierLog(userId, key), "so the grouped notifciation batch entry will be removed");
				/** If batchLevel is 0, we remove it so that it won't get processed when there is nothing to process. It will be created again next time a grouped notification is sent */
				await this._groupedNotificationBatchRepo.remove(userId, key);
			}
		}

		return { status: 200 };
	}

}

module.exports = ProcessGroupedMailTimeoutsHandler;
