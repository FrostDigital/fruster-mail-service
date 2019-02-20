const specConstants = require("./support/spec-constants");
const mailService = require("../fruster-mail-service");
const constants = require("../lib/constants");
const testUtils = require("fruster-test-utils");
const uuid = require("uuid");
const bus = require("fruster-bus");

describe("Mail service", () => {

	testUtils.startBeforeEach(specConstants.testUtilsOptions());

	/** Note: Think about disabling this test */
	it("should send mail for real", async () => {
		const mail = {
			to: "joel@frost.se",
			from: "fruster@frost.se",
			subject: "Hello world from automated test 2.0",
			message: "This is a message from me in the future: This is not a good idea. 😂😂😂😂😂😂"
		};

		const { status } = await bus.request({
			subject: constants.endpoints.service.SEND_MAIL,
			message: {
				data: mail,
				reqId: uuid.v4()
			}
		});

		expect(status).toBe(200);
	});

	it("should send mail and use a template", async () => {
		const mail = {
			to: "joel@frost.se",
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5",
			templateArgs: { name: "Joel" }
		};

		const { status } = await bus.request("mail-service.send", {
			data: mail,
			reqId: uuid.v4()
		});

		expect(status).toBe(200);
	});

});
