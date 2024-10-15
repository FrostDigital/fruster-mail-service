import { Collection, Db } from "mongodb";
import { v4 } from "uuid";
import constants from "../constants";
import Template from "../models/Template";


class TemplateRepo {
	private collection: Collection<Template>;

	constructor(db: Db) {
		this.collection = db.collection(constants.collections.TEMPLATES);
	}

	async create(template: Omit<Template, "metadata" | "id">) {
		const id = v4();
		await this.collection.insertOne({
			...template,
			id,
			metadata: {
				created: new Date()
			}
		});

		return this.getById(id)
	}

	async getById(id: string) {
		return this.collection.findOne<Template>({ id }, { projection: { _id: 0 } });
	}

	async update(id: string, change: Partial<Template>) {
		delete change.id; // just in case
		delete change.metadata;

		await this.collection.updateOne({ id }, {
			$set: {
				...change,
				"metadata.updated": new Date()
			}
		});

		return this.getById(id);
	}

}

export default TemplateRepo;
