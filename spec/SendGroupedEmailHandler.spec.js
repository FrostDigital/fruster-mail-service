const MockSendGrid = require("./support/MockSendGrid");
const specConstants = require("./support/spec-constants");
const constants = require("../lib/constants");
const SpecUtils = require("./support/SpecUtils");
const testUtils = require("fruster-test-utils");
const service = require("../fruster-mail-service");
const config = require("../config");
const uuid = require("uuid");
const bus = require("fruster-bus");
const Db = require("mongodb").Db;

fdescribe("SendGroupedEmailHandler", () => {

	/**@type {Db} */
	let db;

	/** @type {MockSendGrid} */
	let mockSendGrid;

	/**@type {Object} */
	let configBackup;

	testUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async (connection) => {
			config.groupedEmailsEnabled = true;
			db = connection.db;

			mockSendGrid = new MockSendGrid();

			await service.start(connection.natsUrl, specConstants.testUtilsOptions().mongoUrl, mockSendGrid);
		}
	});

	afterEach(() => Object.keys(config).forEach(key => config[key] = configBackup[key]));

	beforeEach(() => {
		configBackup = { ...config };

		config.groupedEmailBatches = [
			{ numberOfMessages: 1, timeout: 0 },
			{ numberOfMessages: 5, timeout: 400 },
			{ numberOfMessages: 10, timeout: 100 }
		];
	});

	it("should send mail for real", async (done) => {
		const email = "joel@frost.se2";
		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "You have {{n}} new matches!",
			message: "You have {{n}} new matches! Visit http://ip-admin-web.c4.fruster.se/new-matches/{{n}}",
			key: "user-service.HELLO_THERE"
		};

		mockSendGrid.mockSuccess(email);

		mockSendGrid.mockInterceptor(email, 0, (data) => {
			expect(data.personalizations[0].subject).toContain("1");
			expect(data.content[0].value).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 1, (data) => {
			expect(data.personalizations[0].subject).toContain("5");
			expect(data.content[0].value).toContain("5");
		});

		mockSendGrid.mockInterceptor(email, 2, (data) => {
			expect(data.personalizations[0].subject).toContain("10");
			expect(data.content[0].value).toContain("10");
		});

		mockSendGrid.mockInterceptor(email, 3, () => { done.fail() });

		for (let i = 0; i < 18; i++)
			await bus.request({
				subject: constants.endpoints.service.SEND_GROUPED_MAIL,
				message: {
					data: mail,
					reqId: uuid.v4()
				}
			});

		expect(mockSendGrid.invocations[email]).toBe(3);

		done();
	});

});
