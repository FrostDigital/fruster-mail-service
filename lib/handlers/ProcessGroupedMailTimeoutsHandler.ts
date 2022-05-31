import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { subscribe, injectable, inject } from "@fruster/decorators";
import log from "@fruster/log";

import LogUtils from "../utils/LogUtils";
import BatchLevelUtils from "../utils/BatchLevelUtils";
import MailManager from "../managers/MailManager";
import GroupedMailRepo from "../repos/GroupedMailRepo";
import GroupedMailBatchRepo from "../repos/GroupedMailBatchRepo";

export const SERVICE_SUBJECT = "mail-service.process-grouped-mail-timeouts";

const logPrefix = "[ProcessGroupedMailTimeoutsHandler]";

/**
 * Scheduled job for processing timeouts of grouped mails.
 */
@injectable()
class ProcessGroupedMailTimeoutsHandler {

	private mailManager!: MailManager;

	@inject()
	private groupedMailRepo!: GroupedMailRepo;

	@inject()
	private groupedMailBatchRepo!: GroupedMailBatchRepo;

	//MailClient cannot inject because mock mail client properties are not reset after each unit test
	constructor(mailManager: MailManager) {
		this.mailManager = mailManager;
	}

	/**
	 * Handle service request.
	 */
	@subscribe({
		subject: SERVICE_SUBJECT,
		docs: {
			description: `To be used by schedule service. Checks for timed out grouped mails.
			If any is timeout;
			The pending mails are sent out as one mail and the batch is decreased (Until 0 and then removed).`,
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
			}
		}
	})
	async handle({ }: FrusterRequest<void>): Promise<FrusterResponse<void>> {
		const timedOutMails = await this.groupedMailBatchRepo.getByQuery({ timeoutDate: { $lte: new Date() } });

		log.debug(logPrefix, "Found", timedOutMails.length, "timed out grouped mails this run");

		for (const mail of timedOutMails) {
			let { email, key, batchLevel } = mail;

			log.silly(logPrefix, "Processing", mail);

			const currentPendingMails = await this.groupedMailRepo.getByQuery({ email, key });

			log.debug(
				logPrefix,
				"Found",
				currentPendingMails.length,
				"pending mails for grouped mail",
				LogUtils.getGroupedMailUniqueIdentifierLog(email, key),
				"with batch level",
				batchLevel
			);

			if (currentPendingMails.length) {
				const currentPendingMail = currentPendingMails[0];

				await this.mailManager.sendGroupedMail(
					{ to: currentPendingMail.email, ...currentPendingMail },
					currentPendingMails.length
				);
			}

			if (batchLevel > 1) {
				batchLevel -= 1;

				log.debug(
					logPrefix,
					"Updates",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, key),
					"with new batch level",
					batchLevel,
					"was",
					batchLevel + 1
				);

				await this.groupedMailBatchRepo.put(
					email,
					key,
					batchLevel,
					BatchLevelUtils.getTimeoutDateForBatchLevel(batchLevel)
				);

			} else {
				log.debug(
					logPrefix,
					"Batch level was 0 for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, key),
					"so the grouped mail batch entry will be removed"
				);

				/**
				 * If batchLevel is 0, we remove it so that it won't get processed when there is nothing to process.
				 * It will be created again next time a grouped mail is sent
				 */
				await this.groupedMailBatchRepo.remove(email, key);
			}

			await this.groupedMailRepo.deleteByQuery({ email, key });
		}

		return { status: 200, data: undefined };
	}
}

export default ProcessGroupedMailTimeoutsHandler;
