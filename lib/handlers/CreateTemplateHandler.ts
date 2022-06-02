import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { inject, injectable, subscribe } from "@fruster/decorators";
import errors from "../errors";
import Template from "../models/Template";
import TemplateRepo from "../repos/TemplateRepo";
import { CreateTemplateRequest } from "../schemas/CreateTemplateRequest";

export const CREATE_TEMPLATE_SUBJECT = "http.post.mail.template";
export const CREATE_TEMPLATE_PERMISSIONS = ["mail.template.create"];

@injectable()
class CreateTemplateHandler {

	@inject()
	private templateRepo!: TemplateRepo;

	@subscribe({
		subject: CREATE_TEMPLATE_SUBJECT,
		permissions: CREATE_TEMPLATE_PERMISSIONS,
		docs: {
			description: "Creates a mail template",
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
			}
		}
	})
	async handle({ data }: FrusterRequest<CreateTemplateRequest, {id: string}>): Promise<FrusterResponse<Template>> {
		const createdTemplate = await this.templateRepo.create(data);

		if (!createdTemplate) {
			throw errors.internalServerError("Failed to create template");
		}

		return { status: 200, data: createdTemplate };
	}
}

export default CreateTemplateHandler;
