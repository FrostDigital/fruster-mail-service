import { Collection, Db } from "mongodb";

import constants from "../constants";
import { GroupedMail } from "../models/Mail";

class GroupedMailRepo {
	private collection: Collection;

	constructor(db: Db) {
		this.collection = db.collection(constants.collections.GROUPED_MAILS);
	}

	async add(mail: GroupedMail): Promise<void> {
		await this.collection.insertOne(mail);
	}

	async getByQuery(query: object): Promise<GroupedMail[]> {
		return await this.collection.find(query).toArray();
	}

	async deleteByQuery(query: object): Promise<void> {
		await this.collection.deleteMany(query);
	}

}

export default GroupedMailRepo;
