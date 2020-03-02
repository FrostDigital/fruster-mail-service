const MockSendGrid = require("./support/MockSendGrid");
const specConstants = require("./support/spec-constants");
const constants = require("../lib/constants");
const SpecUtils = require("./support/SpecUtils");
const testUtils = require("fruster-test-utils");
const service = require("../fruster-mail-service");
const config = require("../config");
const bus = require("fruster-bus");
const Db = require("mongodb").Db;

describe("ProcessGroupedMailTimeoutsHandler", () => {

	/** @type {Db} */
	let db;

	/** @type {MockSendGrid} */
	let mockSendGrid;

	/**@type {Object} */
	let configBackup;

	const reqId = "reqId";
	const email = "someone@some-email.se";
	const mailData = {
		to: email,
		from: "fruster@frost.se",
		subject: "You have {{n}} new matches!",
		message: "You have {{n}} new matches! Visit http://ip-admin-web.c4.fruster.se/new-matches/{{n}}",
		key: "user-service.HELLO_THERE"
	}

	testUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async (connection) => {
			db = connection.db;

			config.groupedMailsEnabled = true;

			mockSendGrid = new MockSendGrid();

			mockSendGrid.mockSuccess(email);

			return service.start(connection.natsUrl, specConstants.testUtilsOptions().mongoUrl, mockSendGrid);
		}
	});

	afterEach(() => Object.keys(config).forEach(key => config[key] = configBackup[key]));

	beforeEach(() => {
		configBackup = { ...config };

		config.groupedMailBatches = [
			{ numberOfMessages: 1, timeout: 0 },
			{ numberOfMessages: 5, timeout: 400 },
			{ numberOfMessages: 10, timeout: 100 }
		];
	});

	it("should send grouped mails", async (done) => {
		mockSendGrid.mockInterceptor(email, 0, (data) => {
			expect(data.subject).toContain("1", "1st mail should have grouped 1 mail");
			expect(data.html).toContain("1", "1st mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 1, (data) => {
			expect(data.subject).toContain("5", "2nd mail should have grouped 5 mails");
			expect(data.html).toContain("5", "2nd mail should have grouped 5 mails");
		});

		mockSendGrid.mockInterceptor(email, 2, (data) => {
			expect(data.subject).toContain("10", "3rd mail should have grouped 10 mails");
			expect(data.html).toContain("10", "3rd mail should have grouped 10 mails");
		});

		mockSendGrid.mockInterceptor(email, 3, (data) => {
			expect(data.subject).toContain("5", "4th mail should have grouped 5 mails");
			expect(data.html).toContain("5", "4th mail should have grouped 5 mails");
		});

		mockSendGrid.mockInterceptor(email, 4, (data) => {
			expect(data.subject).toContain("5", "5th mail should have grouped 5 mails");
			expect(data.html).toContain("5", "5th mail should have grouped 5 mails");
		});

		mockSendGrid.mockInterceptor(email, 5, () => done.fail("Should not send 6 mails"));

		let dbContents;

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				skipOptionsRequest: true,
				message: { reqId, data: mailData }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				skipOptionsRequest: true,
				message: { reqId, data: mailData }
			});

		await SpecUtils.delay(110);

		/** Should push 5 mails since the last batch's timeout has been reached */
		await bus.request({
			subject: constants.endpoints.service.PROCESS_GROUPED_MAIL_TIMEOUTS,
			skipOptionsRequest: true,
			message: { reqId }
		});

		/** Should push 5 mails since the batch level should have been decreased */
		for (let i = 0; i < 5; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				skipOptionsRequest: true,
				message: { reqId, data: mailData }
			});


		dbContents = await db.collection(constants.collections.GROUPED_MAIL_BATCHES).find().toArray();

		expect(dbContents[0].batchLevel).toBe(2);

		expect(mockSendGrid.invocations[email]).toBe(5, "1st mail should have sent 5 grouped mails");

		done();
	});

	it("should remove mail batch database entry if batch is timed out and batch level is 0", async (done) => {
		mockSendGrid.mockInterceptor(email, 0, (data) => {
			expect(data.subject).toContain("1", "1st mail should have grouped 1 mail");
			expect(data.html).toContain("1", "1st mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 1, () => done.fail("Should not send 2 mails"));

		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			skipOptionsRequest: true,
			message: { reqId, data: mailData }
		});

		await SpecUtils.delay(500);

		await bus.request({
			subject: constants.endpoints.service.PROCESS_GROUPED_MAIL_TIMEOUTS,
			skipOptionsRequest: true,
			message: { reqId }
		});

		const dbContents = await db.collection(constants.collections.GROUPED_MAIL_BATCHES).find().toArray();

		expect(dbContents.length).toBe(0);

		expect(mockSendGrid.invocations[email]).toBe(1, "should have sent 1 grouped mails");

		done();
	});

});
