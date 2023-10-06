export interface SendMailResponse {
	subject?: string;
	body?: string;
	templateId?: string;
	to: string | string[];
	from?: string;
};
