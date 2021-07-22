const constants = require("../constants");
const Db = require("mongodb").Db;

class GroupedMailRepo {

	/**
	 * @typedef {Object} GroupedMail
	 * @property {String} email
	 * @property {String} from
	 * @property {String} message
	 * @property {String} subject
	 * @property {Object} templateArgs
	 * @property {String} templateId
	 * @property {String} key
	 */

	/**
	 * @param {Db} db
	 */
	constructor(db) {
		this._collection = db.collection(constants.collections.GROUPED_MAILS);
	}

	/**
	 * @param {GroupedMail} mail
	 */
	async add(mail) {
		await this.addMany([mail]);
	}

	/**
	 * @param {Array<GroupedMail>} mails
	 */
	async addMany(mails) {
		await this._collection.insertMany(mails);
	}

	/**
	 * @param {Object} query
	 *
	 * @return {Promise<Array<GroupedMail>>}
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

module.exports = GroupedMailRepo;
