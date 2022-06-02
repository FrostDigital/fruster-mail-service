import Template from "../models/Template";

export interface CreateTemplateRequest extends Pick<Template, "subject" | "html" | "layout" | "owner"> {
}
