import ms from "ms";
import { FrusterRequest, FrusterResponse } from "fruster-bus";
import { subscribe, injectable, inject } from "fruster-decorators";
import log from "fruster-log";

import config from "../../config";
import LogUtils from "../utils/LogUtils";
import BatchLevelUtils from "../utils/BatchLevelUtils";
import SendGroupedMailRequest from "../schemas/SendGroupedMailRequestSchemas";
import MailManager from "../managers/MailManager";
import GroupedMailRepo from "../repos/GroupedMailRepo";
import GroupedMailBatchRepo from "../repos/GroupedMailBatchRepo";
import GroupedMailBatch from "../models/GroupedMailBatch";
import { GroupedMail } from "../models/Mail";

export const SERVICE_SUBJECT = "mail-service.send-grouped-mail";

const logPrefix = "[SendGroupedMailHandler]";

/**
 * Handler to send grouped mail.
 */
@injectable()
class SendGroupedMailHandler {

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
		requestSchema: "SendGroupedMailRequest",
		docs: {
			description: `Sends a mail that can be grouped.
			mails sent using this endpoint will be sent in groups, based off the \`GROUPED_MAIL_BATCHES\` config.
			mails are grouped by \`email\` (taken from the \`to\` array) and \`key\`.

			When used with multiple \`email\`s in the \`to\` array, each \`email\` is grouped individually.

			The grouping of mails happens in batches.
			Each batch “level” has a \`numberOfMessages\` (Number of messages before next batch level is reached)
			and \`timeout\` (timeout before level is decreased) defined.
			Every time a batch level's \`numberOfMessages\` is reached, the pending mails are sent out as one mail
			and the batch level is increased. Each new batch level will (most commonly) increase \`numberOfMessages\`
			and the \`timeout\`. If the number of messages is not fulfilled before the timeout is reached,
			the mail is sent with all pending grouped mails; then the batch level is decreased.

			When a grouped mail is sent out; any \`{{n}}\` in message and/or title will be replaced
			by the number of pending grouped mails at that point. When using templates,
			\`n\` will be added to \`templateArgs\` and can then be used by the template.
			Example: When 56 grouped mails with the key \`message-service.NEW_MESSAGE\` have been sent w/
			the message \`You have {{n}}}} new messages!\` it becomes:

			\t You have 56 new messages!

			Current configuration:

			${config.groupedMailBatches?.map((s, i) => `\t Batch level ${i + 1} => numberOfMessages: ${s.numberOfMessages}, timeout: ${ms(s.timeout)}`).join("\n\n")}

			With this configuration after ${config.groupedMailBatches?.reduce((total: number, { numberOfMessages }) => total += numberOfMessages, 0)}
			mails being sent, the email would have received ${config.groupedMailBatches?.length} mails;
			granted none of the timeouts have been reached.`,
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
				BAD_REQUEST: "`to` array cannot empty",
				MISSING_FIELDS: "One or many required fields are missing"
			}
		}
	})
	async handle({
		data: { to, key, ...mail }
	}: FrusterRequest<SendGroupedMailRequest>): Promise<FrusterResponse<void>> {
		if (Array.isArray(to)) {
			const batches = await this.groupedMailBatchRepo.getByQuery({
				email: { $in: Array.from(new Set(to)) },
				key
			});

			const batchByEmail = new Map<string, GroupedMailBatch>();
			batches.forEach(batch => batchByEmail.set(batch.email, batch));

			for (const toEmail of to)
				await this.processGroupedMailForUser(toEmail, key, mail, batchByEmail.get(toEmail));
		} else {
			const batch = await this.groupedMailBatchRepo.getOneByQuery({ email: to, key });
			await this.processGroupedMailForUser(to, key, mail, batch!);
		}

		return { status: 200 };
	}

	private async processGroupedMailForUser(
		email: string,
		key: string,
		mail: Omit<GroupedMail, "email" | "key">,
		currentBatch?: GroupedMailBatch
	) {
		try {
			if (currentBatch) {
				log.debug(logPrefix,
					"Preparing grouped mail for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key));

				const { batchLevel } = currentBatch;

				const currentPendingMails = await this.groupedMailRepo.getByQuery({ email, key });

				log.debug(logPrefix,
					"Found",
					currentPendingMails.length,
					"pending mails for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key));

				const currentBatchSettings = BatchLevelUtils.getBatchLevelSettingsForLevel(batchLevel);

				if (currentBatchSettings) {
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

						await this.deleteBatchMails(email, key);

						await this.updateBatchEntry(email, key, batchLevel + 1);

						await this.mailManager.sendGroupedMail({ ...mail, to: email }, currentPendingMails.length + 1);
					} else {
						log.debug(logPrefix,
							LogUtils.getGroupedMailUniqueIdentifierLog(email, currentBatch.key),
							"( with batch level",
							batchLevel,
							") did not have enough pending mail to trigger sending a mail. Found (including the one currently sent)",
							currentPendingMails.length + 1,
							"and it needs",
							currentBatchSettings.numberOfMessages,
							"to send mail");

						await this.groupedMailRepo.add({ ...mail, email, key });
					}
				}
			} else {
				log.debug(logPrefix,
					"Adding new grouped mail batch entry for",
					LogUtils.getGroupedMailUniqueIdentifierLog(email, key));

				await this.groupedMailBatchRepo.put(email, key, 1, BatchLevelUtils.getTimeoutDateForBatchLevel(1));

				await this.mailManager.sendGroupedMail({ ...mail, to: email }, 1);
			}
		} catch (err) {
			log.error(err);
		}
	}

	/**
	 * Updates batch entry w/ new level, created date and timeout date
	 */
	async updateBatchEntry(email: string, key: string, batchLevel: number) {
		const originalBatchLevel = batchLevel;

		/** Safety net  */
		if (batchLevel < 0)
			batchLevel = 0;

		/** Safety net  */
		if (config.groupedMailBatches && batchLevel >= config.groupedMailBatches.length)
			batchLevel = config.groupedMailBatches.length - 1;

		log.debug(
			logPrefix,
			"Updates",
			LogUtils.getGroupedMailUniqueIdentifierLog(email, key),
			"with new batch level", batchLevel, "was", originalBatchLevel
		);

		await this.groupedMailBatchRepo.put(
			email,
			key,
			batchLevel,
			BatchLevelUtils.getTimeoutDateForBatchLevel(batchLevel)
		);
	}

	/**
	 * Removes mails in batch being mailed to user
	 */
	async deleteBatchMails(email: string, key: string) {
		log.debug(logPrefix, "Deletes mails in batch", LogUtils.getGroupedMailUniqueIdentifierLog(email, key));

		await this.groupedMailRepo.deleteByQuery({ email, key });
	}
}

export default SendGroupedMailHandler;
