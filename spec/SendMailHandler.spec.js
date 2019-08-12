const uuid = require("uuid");
const bus = require("fruster-bus").testBus;
const testUtils = require("fruster-test-utils");
const constants = require("../lib/constants");
const errors = require("../lib/errors");
const service = require("../fruster-mail-service");
const MockSendGrid = require("./support/MockSendGrid");
const specConstants = require("./support/spec-constants");
const config = require("../config");

describe("SendMailHandler", () => {

	/** @type {MockSendGrid} */
	let mockSendGrid;

	const email = "joel@frost.se";

	const legacyTemplateId = "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5";
	const transactionalTemplateId = "d-c3bed683b80541fc9397489fe7223c37";

	const jsonToSendGridNormalMail = {
		personalizations: [{
			to: [{ email }],
			subject: "Hello world from automated test 2.0"
		}],
		from: { email: "fruster@frost.se" },
		content: [{ type: "text/plain", value: "This is a message from me in the future: This is not a good idea. IT IS FIXED!" }],
		template_id: undefined
	};

	const jsonToSendGridLegacyTemplateMail = {
		personalizations: [{
			to: [{ email }],
			subject: "Hello world from template test",
			substitutions: { name: "Joel" }
		}],
		from: { email: "fruster@frost.se" },
		content: [{ type: "text/html", value: " " }],
		template_id: legacyTemplateId
	};

	const jsonToSendGridTransactionalTemplateMail = {
		personalizations: [{
			to: [{ email }],
			subject: "Hello world from template test",
			dynamic_template_data: { name: "Joel" }
		}],
		from: { email: "fruster@frost.se" },
		content: [{ type: "text/html", value: " " }],
		template_id: transactionalTemplateId
	};

	testUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async (connection) => {

			mockSendGrid = new MockSendGrid();

			mockSendGrid.mockSuccess(email);

			return service.start(connection.natsUrl, specConstants.testUtilsOptions().mongoUrl, mockSendGrid);
		}
	});

	it("should send mail for real", async () => {
		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from automated test 2.0",
			message: "This is a message from me in the future: This is not a good idea. IT IS FIXED!"
		};

		mockSendGrid.mockInterceptorAll(email, (data) => expect(data).toEqual(jsonToSendGridNormalMail, "should be equal to sendgrid json structure"));

		const { status } = await bus.request({
			subject: constants.endpoints.service.SEND_MAIL,
			message: { data: mail, reqId: uuid.v4() }
		});

		expect(mockSendGrid.invocations[email]).toBe(1, "should have sent one mail");

		expect(status).toBe(200);
	});

	it("should send mail and use a legacy template", async () => {
		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: legacyTemplateId,
			templateArgs: { name: "Joel" }
		};

		mockSendGrid.mockInterceptorAll(email, (data) => expect(data).toEqual(jsonToSendGridLegacyTemplateMail, "should be equal to sendgrid json structure"));

		const { status } = await bus.request({
			subject: "mail-service.send",
			message: { data: mail, reqId: uuid.v4() }
		});

		expect(mockSendGrid.invocations[email]).toBe(1, "should have sent one mail");

		expect(status).toBe(200);
	});

	it("should send mail and use a transactional template", async () => {
		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId,
			templateArgs: { name: "Joel" }
		};

		mockSendGrid.mockInterceptorAll(email, (data) => expect(data).toEqual(jsonToSendGridTransactionalTemplateMail, "should be equal to sendgrid json structure"));

		const { status } = await bus.request({
			subject: "mail-service.send",
			message: { data: mail, reqId: uuid.v4() }
		});

		expect(mockSendGrid.invocations[email]).toBe(1, "should have sent one mail");

		expect(status).toBe(200);
	});

	it("should throw error if to emails is empty", async done => {
		const mail = {
			to: [],
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId,
			templateArgs: { name: "Joel" }
		};

		try {
			await bus.request({
				subject: "mail-service.send",
				message: { data: mail, reqId: uuid.v4() }
			});

			done.fail();
		} catch ({ status, error }) {
			expect(status).toBe(400, "err.status");
			expect(error.code).toBe(errors.badRequest().error.code, "err.code");
			expect(error.detail).toBe("`to` array cannot empty");
			done();
		}
	});

	it("should throw error if mails are invalid", async done => {
		const mail = {
			to: [email],
			from: "fruster@frost.se",
			templateArgs: { name: "Joel" }
		};

		try {
			await bus.request({
				subject: "mail-service.send",
				message: { data: mail, reqId: uuid.v4() }
			});

			done.fail();
		} catch ({ status, error }) {
			expect(status).toBe(400, "err.status");
			expect(error.code).toBe("MISSING_FIELDS", "err.code");
			done();
		}
	});

	it("should send mail to catch all email", async () => {
		// Set catch all in config before test
		config.catchAllEmail = "henrik.lundqvist@nhl.com";

		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId
		};

		const { status } = await bus.request({
			subject: "mail-service.send",
			message: { data: mail }
		});

		expect(mockSendGrid.invocations[config.catchAllEmail]).toBe(1, "should have sent one mail to catch all email");
		expect(status).toBe(200);

		// Clean up config after test
		delete config.catchAllEmail;
	});

	it("should send mail to whitelisted domain even if catch all email is set", async () => {
		// Set catch all in config before test
		config.catchAllEmail = "henrik.lundqvist@nhl.com";
		config.catchAllWhitelist = ["nfl.com", "nba.com"];

		const toWhitelistedEmail = "michael.jordan@nba.com";

		const mail1 = {
			to: toWhitelistedEmail,
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId
		};

		const mail2 = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId
		};

		await bus.request({
			subject: "mail-service.send",
			message: { data: mail1 }
		});

		await bus.request({
			subject: "mail-service.send",
			message: { data: mail2 }
		});

		expect(mockSendGrid.invocations[toWhitelistedEmail]).toBe(1, "should have sent one mail to whitelisted email");
		expect(mockSendGrid.invocations[config.catchAllEmail]).toBe(1, "should have sent one mail to catch all email");

		// Clean up config after test
		delete config.catchAllEmail;
		delete config.catchAllWhitelist;
	});

});
