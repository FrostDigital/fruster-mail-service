const GroupedEmailBatchRepo = require("../repos/GroupedEmailBatchRepo");
const GroupedEmailRepo = require("../repos/GroupedEmailRepo");


class SendGroupedEmail {

	/**
	 * @param {GroupedEmailBatchRepo} groupedEmailBatchRepo
	 * @param {GroupedEmailRepo} groupedEmailRepo
	 */
	constructor(groupedEmailBatchRepo, groupedEmailRepo) {
		this._groupedEmailBatchRepo = groupedEmailBatchRepo;
		this._groupedEmailRepo = groupedEmailRepo;
	}

	async handle({ data: { to, key } }) {
		const batches = await this._groupedEmailBatchRepo.getByQuery({ userId: { $in: to }, key });

		// for (const userId of to)
		// await this._processGroupedEmailForUser(userId, { body, key, clickAction }, batches.find(b => b.userId === userId));

		return { status: 200 };
	}

}

module.exports = SendGroupedEmail;
