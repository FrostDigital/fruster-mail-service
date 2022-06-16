import { Collection, Db } from "mongodb";
import constants from "../constants";

class AccessTokenRepo {
	private collection: Collection;

	constructor(db: Db) {
		this.collection = db.collection(constants.collections.ACCESS_TOKENS);
	}

	async addAccessToken(accessToken: string) {
		await this.collection.insertOne({ accessToken, created: new Date() });
	}

	async getAccessToken(): Promise<string | undefined> {
		const result = await this.collection.findOne({});

		if (result)
			return result.accessToken;
	}
}

export default AccessTokenRepo;
