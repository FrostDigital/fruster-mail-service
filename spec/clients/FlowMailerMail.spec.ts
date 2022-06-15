import nock from "nock";
import frusterTestUtils, { FrusterTestUtilsConnection } from "@fruster/test-utils";

import config from "../../config";
import FlowMailerMailClient from "../../lib/clients/FlowMailerMailClient";
import { SendMailParams } from "../../lib/models/Mail";
import AccessTokenRepo from "../../lib/repos/AccessTokenRepo";

import specConstants from "../support/spec-constants";

describe("FlowMailerMail", () => {
	const flowMailerMailClient = new FlowMailerMailClient();

	const clientId = "3717fbafda22471cfe7bcfb4bb51ba0f5b979dd2",
		clientSecret = "7be80ed02e61bc904fcf64799b324d18cdbcfe20",
		accountId = "4459";

	frusterTestUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async (connection: FrusterTestUtilsConnection) => {
			flowMailerMailClient.setAccessTokenRepo(new AccessTokenRepo(connection.db));
		}
	});

	beforeAll(() => {

		config.flowMailer = {
			clientId,
			clientSecret,
			accountId,
		}
	});

	afterAll(() => {
		config.flowMailer = {
			clientId: "",
			clientSecret: "",
			accountId: "",
		}
	});

	it("should possible to send message", async () => {
		nock(flowMailerMailClient.loginUrl)
			.post(``, `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`)
			.reply(200, { access_token: "access_token" });

		nock(flowMailerMailClient.sendMailApiUrl)
			.post(``, {
				"messageType": "EMAIL",
				"senderAddress": "god@frost.se",
				"recipientAddress": "joel@frost.se",
				"subject": "Test subject",
				"html": "<p>This is test html</p>"
			})
			.reply(200);

		const mail: SendMailParams = {
			to: "joel@frost.se",
			from: "god@frost.se",
			subject: "Test subject",
			message: "<p>This is test html</p>"
		};

		await flowMailerMailClient.sendMail(mail);
	});

	it("should possible to send message as plain text", async () => {
		nock(flowMailerMailClient.loginUrl)
			.post(``, `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`)
			.reply(200, { access_token: "access_token" });

		nock(flowMailerMailClient.sendMailApiUrl)
			.post(``, {
				"messageType": "EMAIL",
				"senderAddress": "god@frost.se",
				"recipientAddress": "joel@frost.se",
				"subject": "Test subject",
				"text": "<p>This is test html</p>",
			})
			.reply(200);

		const mail: SendMailParams = {
			to: "joel@frost.se",
			from: "god@frost.se",
			subject: "Test subject",
			message: "<p>This is test html</p>",
			plainText: true
		};

		await flowMailerMailClient.sendMail(mail);
	});
});
