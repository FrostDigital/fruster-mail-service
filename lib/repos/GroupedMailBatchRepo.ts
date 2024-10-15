import { Collection, Db } from "mongodb";

import constants from "../constants";
import GroupedMailBatch from "../models/GroupedMailBatch";

class GroupedMailBatchRepo {
	private collection: Collection<GroupedMailBatch>;

	constructor(db: Db) {
		this.collection = db.collection(constants.collections.GROUPED_MAIL_BATCHES);
	}

	/**
	* Upserts a GroupedMailBatch entry
	 */
	async put(email: string, key: string, batchLevel: number, timeoutDate: Date): Promise<void> {
		await this.collection.updateMany(
			{ email, key },
			{ $set: { batchLevel, created: new Date(), timeoutDate } },
			{ upsert: true }
		);
	}

	/**
	* Gets GroupedMailBatch entries by query
	 */
	async getByQuery(query: object): Promise<GroupedMailBatch[]> {
		return await this.collection.find(query, { projection: { _id: 0 } }).toArray();
	}

	/**
	 * Get a GroupedMailBatch entry by query
	 */
	async getOneByQuery(query: object): Promise<GroupedMailBatch | null> {
		return await this.collection.findOne(query, { projection: { _id: 0 } });
	}

	/**
	 * Removes GroupedMailBatch entry by email and key
	 */
	async remove(email: string, key: string): Promise<void> {
		await this.collection.deleteMany({ email, key });
	}
}

export default GroupedMailBatchRepo;
