import { FrusterRequest, FrusterResponse } from "@fruster/bus";
import { inject, injectable, subscribe } from "@fruster/decorators";
import errors from "../errors";
import Template from "../models/Template";
import TemplateRepo from "../repos/TemplateRepo";

export const GET_TEMPLATE_BY_ID_SUBJECT = "http.get.mail.template.:id";
export const GET_TEMPLATE_BY_ID_PERMISSIONS = ["mail.template.get"];

@injectable()
class GetTemplateByIdHandler {

	@inject()
	private templateRepo!: TemplateRepo;

	/**
	 * Handle service request.
	 */
	@subscribe({
		subject: GET_TEMPLATE_BY_ID_SUBJECT,
		permissions: GET_TEMPLATE_BY_ID_PERMISSIONS,
		docs: {
			description: "Get mail template by its id",
			errors: {
				INTERNAL_SERVER_ERROR: "Something unexpected happened",
			}
		}
	})
	async handle({ params }: FrusterRequest<any, {id: string}>): Promise<FrusterResponse<Template>> {
		const template = await this.templateRepo.getById(params.id);

		if (!template) {
			return errors.notFound(`Template with id ${params.id} does not exist`);
		}

		return { status: 200, data: template };
	}
}

export default GetTemplateByIdHandler;
