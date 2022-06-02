import { testBus } from '@fruster/bus';
import frusterTestUtils, { FrusterTestUtilsConnection } from "@fruster/test-utils";
import config from "../config";
import { start } from "../fruster-mail-service";
import { CREATE_TEMPLATE_PERMISSIONS, CREATE_TEMPLATE_SUBJECT } from "../lib/handlers/CreateTemplateHandler";
import { GET_TEMPLATE_BY_ID_PERMISSIONS, GET_TEMPLATE_BY_ID_SUBJECT } from '../lib/handlers/GetTemplateByIdHandler';
import { SERVICE_SUBJECT } from '../lib/handlers/SendMailHandler';
import { UPDATE_TEMPLATE_PERMISSIONS, UPDATE_TEMPLATE_SUBJECT } from '../lib/handlers/UpdateTemplateHandler';
import Template from "../lib/models/Template";
import { CreateTemplateRequest } from "../lib/schemas/CreateTemplateRequest";
import SendMailRequest from '../lib/schemas/SendMailRequestSchemas';
import { UpdateTemplateRequest } from '../lib/schemas/UpdateTemplateRequest';
import MockSendGridClient from "./support/MockSendGridClient";
import specConstants from "./support/spec-constants";

describe("Templates", () => {

	let mockSendGridClient: MockSendGridClient;

	beforeAll(() => {
		config.templatesEnabled = true;
	});

	afterAll(() => {
		config.templatesEnabled = false;
	});

	frusterTestUtils.startBeforeEach({
		...specConstants.testUtilsOptions(),
		service: async ({ natsUrl }: FrusterTestUtilsConnection) => {
			mockSendGridClient = new MockSendGridClient();
			return start(natsUrl!, specConstants.testUtilsOptions().mongoUrl, mockSendGridClient);
		}
	});

	it("should create, get and update template", async () => {
		const {data} = await testBus.request<CreateTemplateRequest, Template>({
			subject: CREATE_TEMPLATE_SUBJECT,
			message: {
				user: {
					scopes: CREATE_TEMPLATE_PERMISSIONS
				},
				data: {
					html: "This is body",
					subject: "This is subject"
				}
			}
		});

		expect(data.id).toBeDefined();
		expect(data.subject).toBe("This is subject");
		expect(data.html).toBe("This is body");

		const {data: templateById } = await testBus.request<void, Template>({
			subject: GET_TEMPLATE_BY_ID_SUBJECT,
			message: {
				params: {
					id: data.id
				},
				user: {
					scopes: GET_TEMPLATE_BY_ID_PERMISSIONS
				}
			}
		});

		expect(templateById.id).toBeDefined();
		expect(templateById.subject).toBe("This is subject");
		expect(templateById.html).toBe("This is body");

		const {data: updatedTemplate } = await testBus.request<UpdateTemplateRequest, Template>({
			subject: UPDATE_TEMPLATE_SUBJECT,
			message: {
				params: {
					id: data.id
				},
				user: {
					scopes: UPDATE_TEMPLATE_PERMISSIONS
				},
				data: {
					subject: "Updated subject"
				}
			}
		});

		expect(updatedTemplate.subject).toBe("Updated subject");
		expect(updatedTemplate.html).toBe(templateById.html);
		expect(updatedTemplate.id).toBe(templateById.id);
	});

	it("should send mail and use template", async () => {
		mockSendGridClient.mockSuccess("foo@bar.se");

		const {data: layoutTemplate} = await testBus.request<CreateTemplateRequest, Template>({
			subject: CREATE_TEMPLATE_SUBJECT,
			message: {
				user: {
					scopes: CREATE_TEMPLATE_PERMISSIONS
				},
				data: {
					html: "<html><body>{{content}}</body></html>",
					subject: "Layout"
				}
			}
		});

		const {data: template} = await testBus.request<CreateTemplateRequest, Template>({
			subject: CREATE_TEMPLATE_SUBJECT,
			message: {
				user: {
					scopes: CREATE_TEMPLATE_PERMISSIONS
				},
				data: {
					html: "My name is {{firstName}}",
					subject: "Hello",
					layout: layoutTemplate.id
				}
			}
		});

		const { status } = await testBus.request<SendMailRequest, void>({
			subject: SERVICE_SUBJECT,
			message: {
				data: {
					templateId: template.id,
					to: "foo@bar.se",
					templateArgs: {
						firstName: "Earl"
					}
				}
			}
		});

		expect(status).toBe(200);
		expect(mockSendGridClient.lastSentMail).toBe("<html><body>My name is Earl</body></html>");
	});

	it("should limit access based on owner and TEMPLATE_OWNER_PROP", async () => {
		config.templateOwnerProp = "profile.organisationId";

		mockSendGridClient.mockSuccess("foo@bar.se");

		const owner = "d64d222d-956a-41c6-aee4-53047b43fec1";

		const {data: createdTemplate} = await testBus.request<CreateTemplateRequest, Template>({
			subject: CREATE_TEMPLATE_SUBJECT,
			message: {
				user: {
					scopes: CREATE_TEMPLATE_PERMISSIONS
				},
				data: {
					html: "My name is {{firstName}}",
					subject: "Hello",
					owner,
				}
			}
		});

		const {status: statusWithoutOwner} = await testBus.request<any, Template>({
			subject: GET_TEMPLATE_BY_ID_SUBJECT,
			throwErrors: false,
			message: {
				user: {
					scopes: GET_TEMPLATE_BY_ID_PERMISSIONS
				},
				params: {
					id: createdTemplate.id
				},
			}
		});

		const {status: statusWithOwner} = await testBus.request<any, Template>({
			subject: GET_TEMPLATE_BY_ID_SUBJECT,
			throwErrors: false,
			message: {
				user: {
					scopes: GET_TEMPLATE_BY_ID_PERMISSIONS,
					data: {
						profile: {
							organisationId: owner
						}
					}
				},
				params: {
					id: createdTemplate.id
				},
			}
		});

		config.templateOwnerProp = undefined;

		expect(statusWithoutOwner).toBe(403);
		expect(statusWithOwner).toBe(200);
	});

});
