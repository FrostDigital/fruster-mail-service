import Template from "../models/Template";

export interface UpdateTemplateRequest extends Partial<Pick<Template, "subject" | "html">> {
}
