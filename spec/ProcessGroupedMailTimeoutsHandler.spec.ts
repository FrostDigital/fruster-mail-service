import { MailDataRequired } from "@sendgrid/mail";
import { Db } from "mongodb";
import { testBus as bus } from "@fruster/bus";
import frusterTestUtils, { FrusterTestUtilsConnection } from "@fruster/test-utils";

import config from "../config";
import { start } from "../fruster-mail-service";
import constants from "../lib/constants";
import { SERVICE_SUBJECT } from "../lib/handlers/ProcessGroupedMailTimeoutsHandler";
import { SERVICE_SUBJECT as SEND_GROUPED_MAIL_SUBJECT } from "../lib/handlers/SendGroupedMailHandler";

import MockSendGridClient from "./support/MockSendGridClient";
import specConstants from "./support/spec-constants";
import SpecUtils from "./support/SpecUtils";

describe("ProcessGroupedMailTimeoutsHandler", () => {

	let mockSendGrid: MockSendGridClient;
	let db: Db;

	const email = "joel@frost.se";

	const mailData = {
		to: email,
		from: "fruster@frost.se",
		subject: "You have {{n}} new matches!",
		message: "You have {{n}} new matches! Visit http://ip-admin-web.c4.fruster.se/new-matches/{{n}}",
		key: "user-service.HELLO_THERE"
	}

	const configBkp = { ...config };

	afterEach(() => {
		Object.keys(config).forEach(key => {
			//@ts-ignore
			config[key] = configBkp[key];
		});
	});

	frusterTestUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async (connection: FrusterTestUtilsConnection) => {
			config.groupedMailsEnabled = true;
			config.groupedMailBatches = [
				{ numberOfMessages: 1, timeout: 0 },
				{ numberOfMessages: 5, timeout: 400 },
				{ numberOfMessages: 10, timeout: 100 }
			];

			mockSendGrid = new MockSendGridClient();
			mockSendGrid.mockSuccess(email);

			db = connection.db!;

			return start(connection.natsUrl!, specConstants.testUtilsOptions().mongoUrl, mockSendGrid);
		}
	});

	it("should send grouped mails", async () => {
		mockSendGrid.mockInterceptor(email, 0, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 1, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("5");
			expect(html).toContain("5");
		});

		mockSendGrid.mockInterceptor(email, 2, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("10");
			expect(html).toContain("10");
		});

		mockSendGrid.mockInterceptor(email, 3, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("5");
			expect(html).toContain("5");
		});

		mockSendGrid.mockInterceptor(email, 4, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("5");
			expect(html).toContain("5");
		});

		mockSendGrid.mockInterceptor(email, 5, () => fail("Should not send 6 mails"));

		let dbContents;

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: SEND_GROUPED_MAIL_SUBJECT,
				message: { data: mailData }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: SEND_GROUPED_MAIL_SUBJECT,
				message: { data: mailData }
			});

		await SpecUtils.delay(110);

		/** Should push 5 mails since the last batch's timeout has been reached */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: {}
		});

		/** Should push 5 mails since the batch level should have been decreased */
		for (let i = 0; i < 5; i++)
			await bus.request({
				subject: SEND_GROUPED_MAIL_SUBJECT,
				message: { data: mailData }
			});


		dbContents = await db.collection(constants.collections.GROUPED_MAIL_BATCHES).find().toArray();

		expect(dbContents[0].batchLevel).toBe(2);

		expect(mockSendGrid.invocations[email]).toBe(5);
	});

	it("should remove mail batch database entry if batch is timed out and batch level is 0", async () => {
		mockSendGrid.mockInterceptor(email, 0, (data: MailDataRequired) => {
			expect(data.subject).toContain("1");
			expect(data.html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 1, () => fail("Should not send 2 mails"));

		await bus.request({
			subject: SEND_GROUPED_MAIL_SUBJECT,
			message: { data: mailData }
		});

		await SpecUtils.delay(500);

		await bus.request({
			subject: SERVICE_SUBJECT,
			message: {}
		});

		const dbContents = await db.collection(constants.collections.GROUPED_MAIL_BATCHES).find().toArray();

		expect(dbContents.length).toBe(0);

		expect(mockSendGrid.invocations[email]).toBe(1);
	});

});
