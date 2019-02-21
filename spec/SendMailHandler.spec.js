const MockSendGrid = require("./support/MockSendGrid");
const specConstants = require("./support/spec-constants");
const constants = require("../lib/constants");
const testUtils = require("fruster-test-utils");
const service = require("../fruster-mail-service");
const uuid = require("uuid");
const bus = require("fruster-bus");

describe("SendMailHandler", () => {

	/** @type {MockSendGrid} */
	let mockSendGrid;

	const email = "joel@frost.se";

	const templateId = "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5";

	const jsonToSendGridNormalMail = {
		substitutionWrappers: ["-", "-"],
		personalizations: [{ to: [{ email: "joel@frost.se" }], subject: "Hello world from automated test 2.0", substitutions: {} }],
		from: { email: "fruster@frost.se" },
		content: [{ type: "text/plain", value: "This is a message from me in the future: This is not a good idea. IT IS FIXED!" }],
		template_id: undefined
	};

	const jsonToSendGridTemplateMail = {
		substitutionWrappers: ["-", "-"],
		personalizations: [{ to: [{ email: "joel@frost.se" }], subject: "Hello world from template test", substitutions: { "-name-": "Joel" } }],
		from: { email: "fruster@frost.se" },
		content: [{ type: "text/html", value: " " }],
		template_id: templateId
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

	it("should send mail and use a template", async () => {
		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId,
			templateArgs: { name: "Joel" }
		};

		mockSendGrid.mockInterceptorAll(email, (data) => expect(data).toEqual(jsonToSendGridTemplateMail, "should be equal to sendgrid json structure"));

		const { status } = await bus.request({
			subject: "mail-service.send",
			message: { data: mail, reqId: uuid.v4() }
		});

		expect(mockSendGrid.invocations[email]).toBe(1, "should have sent one mail");

		expect(status).toBe(200);
	});

});
