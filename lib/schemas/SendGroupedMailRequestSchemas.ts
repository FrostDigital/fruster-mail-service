import Mail, { GroupedMail } from "../models/Mail";

/**
 * Request for sending grouped mails.
 * Can be used in two ways: mail contents defined in request or with template.
 * If contents is in request; `to`, `subject`, `message` and `key` are required.
 * If template is used; `to`, `templateId` and `key` are required.
 */
export default interface SendGroupedMailRequest extends Mail, Pick<GroupedMail, "key"> { };
