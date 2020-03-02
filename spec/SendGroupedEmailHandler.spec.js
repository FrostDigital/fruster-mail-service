const MockSendGrid = require("./support/MockSendGrid");
const specConstants = require("./support/spec-constants");
const constants = require("../lib/constants");
const testUtils = require("fruster-test-utils");
const service = require("../fruster-mail-service");
const config = require("../config");
const bus = require("fruster-bus");

describe("SendGroupedMailHandler", () => {

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
			expect(data.subject).toContain("1", "should have grouped 1 mail");
			expect(data.html).toContain("1", "should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 1, (data) => {
			expect(data.subject).toContain("5", "should have grouped 5 mail");
			expect(data.html).toContain("5", "should have grouped 5 mail");
		});

		mockSendGrid.mockInterceptor(email, 2, (data) => {
			expect(data.subject).toContain("10", "should have grouped 10 mail");
			expect(data.html).toContain("10", "should have grouped 10 mail");
		});

		mockSendGrid.mockInterceptor(email, 3, () => done.fail("Should not send 5 mails"));

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: mailData }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: mailData }
			});

		expect(mockSendGrid.invocations[email]).toBe(3, "should have sent 3 grouped mails");

		done();
	});

	it("should be possible to send grouped mails w/ templates", async (done) => {
		const templateId = "e25df1b2-6a22-438c-b18f-83e3f065f21d";
		const templateMail = { ...mailData, templateId };

		mockSendGrid.mockInterceptor(email, 0, (data) => {
			expect(data.template_id).toBe(templateId, "1st mail have template id");
			expect(data.personalizations[0].subject).toContain("1", "1st mail should have grouped 1 mail");
			expect(data.personalizations[0].substitutions["n"]).toBe(1, "1st mail should have added n to templateArgs for `n`");
		});

		mockSendGrid.mockInterceptor(email, 1, (data) => {
			expect(data.template_id).toBe(templateId, "2nd mail have template id");
			expect(data.personalizations[0].subject).toContain("5", "2nd mail should have grouped 5 mail");
			expect(data.personalizations[0].substitutions["n"]).toBe(5, "2nd mail should have added n to templateArgs for `n`");
		});

		mockSendGrid.mockInterceptor(email, 2, (data) => {
			expect(data.template_id).toBe(templateId, "3rd mail have template id");
			expect(data.personalizations[0].subject).toContain("10", "3rd mail should have grouped 10 mail");
			expect(data.personalizations[0].substitutions["n"]).toBe(10, "3rd mail should have added n to templateArgs for `n`");
		});

		mockSendGrid.mockInterceptor(email, 3, () => done.fail("should not send 5 mails"));

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: templateMail }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: templateMail }
			});

		expect(mockSendGrid.invocations[email]).toBe(3, "should have sent 3 grouped mails");

		done();
	});

	it("should only group mails with the same key", async (done) => {
		mockSendGrid.mockInterceptor(email, 0, (data) => {
			expect(data.subject).toContain("1", "1st mail should have grouped 1 mail");
			expect(data.html).toContain("1", "1st mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 1, (data) => {
			expect(data.subject).toContain("1", "2nd mail should have grouped 1 mail");
			expect(data.html).toContain("1", "2nd mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 2, (data) => {
			expect(data.subject).toContain("1", "3rd mail should have grouped 1 mail");
			expect(data.html).toContain("1", "3rd mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 3, (data) => {
			expect(data.subject).toContain("5", "4th mail should have grouped 5 mail");
			expect(data.html).toContain("5", "4th mail should have grouped 5 mail");
		});

		mockSendGrid.mockInterceptor(email, 4, () => done.fail("should not send 5 mails"));

		/** Should push first notifcation with key `{mailData.key}` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: mailData }
		});

		/** Should push first notifcation with key `NEW_KEY` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: { ...mailData, key: "NEW_KEY" } }
		});

		/** Should push first notifcation with key `NEW_KEY_2` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: { ...mailData, key: "NEW_KEY_2" } }
		});

		/** Should grouped mail for second mail with key `NEW_KEY` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: { ...mailData, key: "NEW_KEY" } }
		});

		/** Should grouped mails for 2-6 mail with key `{mailData.key}` and push once 5 is reached */
		for (let i = 0; i < 4; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: { ...mailData, key: "NEW_KEY" } }
			});

		expect(mockSendGrid.invocations[email]).toBe(4, "should have sent 4 grouped mails");

		done();
	});

	it("should only group mails with the same key and userId", async (done) => {
		mockSendGrid.mockInterceptor(email, 0, (data) => {
			expect(data.subject).toContain("1", "1st mail should have grouped 1 mail");
			expect(data.html).toContain("1", "1st mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 1, (data) => {
			expect(data.subject).toContain("1", "2nd mail should have grouped 1 mail");
			expect(data.html).toContain("1", "2nd mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 2, (data) => {
			expect(data.subject).toContain("1", "3rd mail should have grouped 1 mail");
			expect(data.html).toContain("1", "3rd mail should have grouped 1 mail");
		});

		mockSendGrid.mockInterceptor(email, 3, (data) => {
			expect(data.subject).toContain("5", "4th mail should have grouped 5 mail");
			expect(data.html).toContain("5", "4th mail should have grouped 5 mail");
		});

		mockSendGrid.mockInterceptor(email, 4, () => done.fail("should not send 5 mails"));

		/** Should push first notifcation with key `{mailData.key}` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: mailData }
		});

		/** Should push first notifcation with key `NEW_KEY` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: { ...mailData, key: "NEW_KEY", to: ["3c284d85-9379-4888-9612-d9c9a3a68919"] } }
		});

		/** Should push first notifcation with key `NEW_KEY_2` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: { ...mailData, key: "NEW_KEY_2" } }
		});

		/** Should grouped mail for second mail with key `NEW_KEY` */
		await bus.request({
			subject: constants.endpoints.service.SEND_GROUPED_MAIL,
			message: { reqId, data: { ...mailData, key: "NEW_KEY" } }
		});

		for (let i = 0; i < 5; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: { ...mailData, key: "NEW_KEY" } }
			});

		expect(mockSendGrid.invocations[email]).toBe(4, "should have sent 4 grouped mails");

		done();
	});

	it("should reuse the last setting for grouped mails if batch has reached the end", async () => {
		for (let i = 0; i < 46; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: { reqId, data: mailData }
			});

		/**
		 * Should push first notifciation; 1
		 * Should push the next 5 mails; 1 + 1 = 2
		 * Should send the next 10 mails each time 10 mails add upp; 2 + (40 / 10) = 6
		 */
		expect(mockSendGrid.invocations[email]).toBe(6, "should have sent 6 grouped mails");
	});

});
