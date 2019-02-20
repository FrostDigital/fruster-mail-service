const constants = require("../constants");
const Db = require("mongodb").Db;

class GroupedEmailBatchRepo {

	/**
	 * @param {Db} db
	 */
	constructor(db) {
		this._collection = db.collection(constants.collections.GROUPED_EMAIL_BATCHES);
	}

	/**
	* Upserts a GroupedEmailBatch entry
	 *
	 * @param {String} email
	 * @param {String} key
	 * @param {Number} batchLevel
	 * @param {Date} timeoutDate
	 */
	put(email, key, batchLevel, timeoutDate) {
		return this._collection.update({ email, key }, { $set: { batchLevel, created: new Date(), timeoutDate } }, { upsert: true });
	}

	/**
	* Gets GroupedEmailBatch entries by query
	 *
	 * @typedef {Object} GroupedEmailBatch
	 * @property {String} email
	 * @property {String} key
	 * @property {Number} batchLevel
	 * @property {Date} created
	 *
	 * @param {Object} query
	 * @return {Promise<Array<GroupedEmailBatch>>}
	 */
	async getByQuery(query) {
		return await this._collection.find(query, { fields: { _id: 0 } }).toArray();
	}

	/**
	 * Removes GroupedEmailBatch entry by email and key
	 *
	 * @param {String} email
	 * @param {String} key
	 */
	remove(email, key) {
		return this._collection.remove({ email, key });
	}

}

module.exports = GroupedEmailBatchRepo;