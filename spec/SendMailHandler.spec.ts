import { MailDataRequired } from "@sendgrid/mail";
import { testBus as bus } from "fruster-bus";
import frusterTestUtils, { FrusterTestUtilsConnection } from "fruster-test-utils";

import config from "../config";
import { start } from "../fruster-mail-service";
import errors from "../lib/errors";
import { SERVICE_SUBJECT, DEPRECATED_SUBJECT } from "../lib/handlers/SendMailHandler";
import SendMailRequest from "../lib/schemas/ISendMailRequestSchemas";

import MockSendGridClient from "./support/MockSendGridClient";
import specConstants from "./support/spec-constants";

describe("SendMailHandler", () => {

	let mockSendGrid: MockSendGridClient;

	const email = "joel@frost.se";
	const catchAllEmail = "henrik.lundqvist@nhl.com";
	const toWhitelistedEmail = "michael.jordan@nba.com";

	const legacyTemplateId = "fc27a67e-b59b-4dc1-bfaa-ee3d9804e1a5";
	const transactionalTemplateId = "d-c3bed683b80541fc9397489fe7223c37";

	const jsonToSendGridNormalMail = {
		to: email,
		subject: "Hello world from automated test 2.0",
		from: "fruster@frost.se",
		text: "This is a message from me in the future: This is not a good idea. IT IS FIXED!",
		html: "This is a message from me in the future: This is not a good idea. IT IS FIXED!"
	};

	const jsonToSendGridLegacyTemplateMail = {
		to: email,
		subject: "Hello world from template test",
		substitutions: { name: "Joel" },
		from: "fruster@frost.se",
		templateId: legacyTemplateId,
		substitutionWrappers: config.substitutionCharacter
	};

	const jsonToSendGridTransactionalTemplateMail = {
		to: email,
		subject: "Hello world from template test",
		dynamicTemplateData: { name: "Joel" },
		from: "fruster@frost.se",
		templateId: transactionalTemplateId
	};

	const configBkp = { ...config };

	afterEach(() => {
		Object.keys(config).forEach(key => {
			//@ts-ignore
			config[key] = configBkp[key];
		});
	});

	frusterTestUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async ({ natsUrl }: FrusterTestUtilsConnection) => {
			mockSendGrid = new MockSendGridClient();

			return start(natsUrl!, specConstants.testUtilsOptions().mongoUrl, mockSendGrid);
		}
	});

	it("should send mail for real", async () => {
		const mail = {
			to: email,
			from: "fruster@frost.se",
			subject: "Hello world from automated test 2.0",
			message: "This is a message from me in the future: This is not a good idea. IT IS FIXED!"
		};

		mockSendGrid.mockSuccess(email);
		mockSendGrid.mockInterceptorAll(email, (data: MailDataRequired) => expect(data).toEqual(jsonToSendGridNormalMail));

		const { status } = await bus.request<SendMailRequest, void>({
			subject: SERVICE_SUBJECT,
			message: { data: mail }
		});

		expect(mockSendGrid.invocations[email]).toBe(1);

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

		mockSendGrid.mockSuccess(email);
		mockSendGrid.mockInterceptorAll(email, (data: MailDataRequired) => expect(data).toEqual(jsonToSendGridLegacyTemplateMail));

		const { status } = await bus.request<SendMailRequest, void>({
			subject: DEPRECATED_SUBJECT,
			message: { data: mail }
		});

		expect(mockSendGrid.invocations[email]).toBe(1);

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

		mockSendGrid.mockSuccess(email);
		mockSendGrid.mockInterceptorAll(email, (data: MailDataRequired) => expect(data).toEqual(jsonToSendGridTransactionalTemplateMail));

		const { status } = await bus.request<SendMailRequest, void>({
			subject: DEPRECATED_SUBJECT,
			message: { data: mail }
		});

		expect(mockSendGrid.invocations[email]).toBe(1);

		expect(status).toBe(200);
	});

	it("should throw error if to emails is empty", async () => {
		const mail = {
			to: [],
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId,
			templateArgs: { name: "Joel" }
		};

		try {
			await bus.request({
				subject: DEPRECATED_SUBJECT,
				message: { data: mail }
			});

			fail();
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe(errors.badRequest().error.code);
			expect(error.detail).toBe("`to` array cannot empty");
		}
	});

	it("should throw error if mails are invalid", async () => {
		const mail = {
			to: [email],
			from: "fruster@frost.se",
			templateArgs: { name: "Joel" }
		};

		try {
			await bus.request({
				subject: DEPRECATED_SUBJECT,
				message: { data: mail }
			});

			fail();
		} catch ({ status, error }) {
			expect(status).toBe(400);
			expect(error.code).toBe("MISSING_FIELDS");
		}
	});

	it("should send mail to catch all email", async () => {
		// Set catch all in config before test
		config.catchAllEmail = catchAllEmail;

		const mail = {
			to: [email, email],
			from: "fruster@frost.se",
			subject: "Hello world from template test",
			templateId: transactionalTemplateId
		};

		mockSendGrid.mockSuccess(catchAllEmail);

		const { status } = await bus.request<SendMailRequest, void>({
			subject: SERVICE_SUBJECT,
			message: { data: mail }
		});

		expect(mockSendGrid.invocations[config.catchAllEmail!]).toBe(1);
		expect(status).toBe(200);
	});

	it("should send mail to whitelisted domain even if catch all email is set", async () => {
		// Set catch all in config before test
		config.catchAllEmail = catchAllEmail;
		config.catchAllWhitelist = ["nfl.com", "nba.com"];

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

		mockSendGrid.mockSuccess(catchAllEmail);
		mockSendGrid.mockSuccess(toWhitelistedEmail);

		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: mail1 }
		});

		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: mail2 }
		});

		expect(mockSendGrid.invocations[toWhitelistedEmail]).toBe(1);
		expect(mockSendGrid.invocations[config.catchAllEmail]).toBe(1);
	});
});
