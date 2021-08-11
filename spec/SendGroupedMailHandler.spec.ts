import { MailDataRequired } from "@sendgrid/mail";
import { testBus as bus } from "fruster-bus";
import frusterTestUtils, { FrusterTestUtilsConnection } from "fruster-test-utils";

import config from "../config";
import { start } from "../fruster-mail-service";
import { SERVICE_SUBJECT } from "../lib/handlers/SendGroupedMailHandler";

import MockSendGridClient from "./support/MockSendGridClient";
import specConstants from "./support/spec-constants";

describe("SendGroupedMailHandler", () => {

	let mockSendGrid: MockSendGridClient;

	const email = "joel@frost.se";
	const email2 = "dinuka@frost.se";

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
		service: async ({ natsUrl }: FrusterTestUtilsConnection) => {
			config.groupedMailsEnabled = true;
			config.groupedMailBatches = [
				{ numberOfMessages: 1, timeout: 0 },
				{ numberOfMessages: 5, timeout: 400 },
				{ numberOfMessages: 10, timeout: 100 }
			];

			mockSendGrid = new MockSendGridClient();
			mockSendGrid.mockSuccess(email);

			return start(natsUrl!, specConstants.testUtilsOptions().mongoUrl, mockSendGrid);
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

		mockSendGrid.mockInterceptor(email, 3, () => fail("Should not send 5 mails"));

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: mailData }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: mailData }
			});

		expect(mockSendGrid.invocations[email]).toBe(3);
	});

	it("should send grouped mails to multiple emails", async () => {
		mockSendGrid.mockSuccess(email2);

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

		mockSendGrid.mockInterceptor(email, 3, () => fail("Should not send 5 mails"));

		const newMailData = { ...mailData, to: [email, email2], from: undefined };

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: newMailData }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: newMailData }
			});

		expect(mockSendGrid.invocations[email]).toBe(3);
		expect(mockSendGrid.invocations[email2]).toBe(3);
	});

	it("should be possible to send grouped mails w/ templates", async () => {
		const templateId = "e25df1b2-6a22-438c-b18f-83e3f065f21d";
		const { message, ...mailRest } = mailData;
		const templateMail = { ...mailRest, templateId };

		mockSendGrid.mockInterceptor(email, 0, ({ templateId, subject, substitutions }: MailDataRequired) => {
			expect(templateId).toBe(templateId);
			expect(subject).toContain("1");
			expect(substitutions?.["n"].toString()).toBe("1");
		});

		mockSendGrid.mockInterceptor(email, 1, ({ templateId, subject, substitutions }: MailDataRequired) => {
			expect(templateId).toBe(templateId);
			expect(subject).toContain("5");
			expect(substitutions?.["n"].toString()).toBe("5");
		});

		mockSendGrid.mockInterceptor(email, 2, ({ templateId, subject, substitutions }: MailDataRequired) => {
			expect(templateId).toBe(templateId);
			expect(subject).toContain("10");
			expect(substitutions?.["n"].toString()).toBe("10");
		});

		mockSendGrid.mockInterceptor(email, 3, () => fail("should not send 5 mails"));

		for (let i = 0; i < 6; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: templateMail }
			});

		for (let i = 0; i < 15; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: templateMail }
			});

		expect(mockSendGrid.invocations[email]).toBe(3);
	});

	it("should only group mails with the same key", async () => {
		mockSendGrid.mockInterceptor(email, 0, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 1, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 2, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 3, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("5");
			expect(html).toContain("5");
		});

		mockSendGrid.mockInterceptor(email, 4, () => fail("should not send 5 mails"));

		/** Should push first notification with key `{mailData.key}` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: mailData }
		});

		/** Should push first notification with key `NEW_KEY` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: { ...mailData, key: "NEW_KEY" } }
		});

		/** Should push first notification with key `NEW_KEY_2` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: { ...mailData, key: "NEW_KEY_2" } }
		});

		/** Should grouped mail for second mail with key `NEW_KEY` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: { ...mailData, key: "NEW_KEY" } }
		});

		/** Should grouped mails for 2-6 mail with key `{mailData.key}` and push once 5 is reached */
		for (let i = 0; i < 4; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: { ...mailData, key: "NEW_KEY" } }
			});

		expect(mockSendGrid.invocations[email]).toBe(4);
	});

	it("should only group mails with the same key and userId", async () => {
		mockSendGrid.mockInterceptor(email, 0, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 1, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 2, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("1");
			expect(html).toContain("1");
		});

		mockSendGrid.mockInterceptor(email, 3, ({ subject, html }: MailDataRequired) => {
			expect(subject).toContain("5");
			expect(html).toContain("5");
		});

		mockSendGrid.mockInterceptor(email, 4, () => fail("should not send 5 mails"));

		/** Should push first notification with key `{mailData.key}` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: mailData }
		});

		mockSendGrid.mockSuccess(email2);

		/** Should push first notification with key `NEW_KEY` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: { ...mailData, key: "NEW_KEY", to: [email2] } }
		});

		/** Should push first notification with key `NEW_KEY_2` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: { ...mailData, key: "NEW_KEY_2" } }
		});

		/** Should grouped mail for second mail with key `NEW_KEY` */
		await bus.request({
			subject: SERVICE_SUBJECT,
			message: { data: { ...mailData, key: "NEW_KEY" } }
		});

		for (let i = 0; i < 5; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: { ...mailData, key: "NEW_KEY" } }
			});

		expect(mockSendGrid.invocations[email]).toBe(4);
	});

	it("should reuse the last setting for grouped mails if batch has reached the end", async () => {
		for (let i = 0; i < 46; i++)
			await bus.request({
				subject: SERVICE_SUBJECT,
				message: { data: mailData }
			});

		/**
		 * Should push first notification; 1
		 * Should push the next 5 mails; 1 + 1 = 2
		 * Should send the next 10 mails each time 10 mails add upp; 2 + (40 / 10) = 6
		 */
		expect(mockSendGrid.invocations[email]).toBe(6);
	});

});
