const constants = require("../constants");
const Db = require("mongodb").Db;

class GroupedEmailRepo {

	/**
	 * @typedef {Object} GroupedEmail
	 * @property {String} body
	 * @property {String} key
	 * @property {String} clickAction
	 * @property {String} userId
	 */

	/**
	 * @param {Db} db
	 */
	constructor(db) {
		this._collection = db.collection(constants.collections.GROUPED_EMAILS);
	}

	/**
	 * @param {GroupedEmail} email
	 */
	async add(email) {
		await this.addMany([email]);
	}

	/**
	 * @param {Array<GroupedEmail>} emails
	 */
	async addMany(emails) {
		await this._collection.insertMany(emails);
	}

	/**
	 * @param {Object} query
	 *
	 * @return {Promise<Array<GroupedEmail>>}
	 */
	async getByQuery(query) {
		return await this._collection.find(query).toArray();
	}

	/**
	 * @param {Object} query
	 *
	 * @return {Promise<Void>}
	 */
	async deleteByQuery(query) {
		await this._collection.deleteMany(query);
	}

}

module.exports = GroupedEmailRepo;
