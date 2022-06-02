# Fruster Mail Service

Send mail via 3rd part provider with support for:

- [Sendgrid](https://sendgrid.com)
- [Flowmailer](https://flowmailer.com/) (TODO)
- [IdRelay](https://www.idrelay.com/)

## Run

Install dependencies:

    npm install

Start server:

    npm start

Run tests:

	npm t

## Configuration

Configuration is set with environment variables. All config defaults to values that makes sense for development.

Check `config.ts` for all available options.

## Templates

Templates are used to predefine messages where, at the time of sending, only variables (if any) are
passed in to personalize the message. For example pass in `firstName: Earl` as variable to the
template so the outgoing mail could render `Hello {{ firstName }}` => `Hello Earl`.

### Templates managed in 3rd party provider

Most services that provides transactional emails already has built in support for templates. This means
that the templates are managed within their system.

Via a reference to the template (`templateId`) which is set when mail is sent, fruster mail service passes
it on together with any template variables so that the 3rd party service takes care of the rest.

This is enabled by default.

### Templates managed in mail service

If config `TEMPLATES_ENABLED` is true then templates will be managed within fruster mail service. This means that
templates are saved in database and compiled/populated before the message is sent to the 3rd party service.

This is useful when having complex template scenarios or if there is a need to not tightly couple with
the 3rd part mail service.

When enabled the `templateId` will _not_ be passed to the 3rd party service and rather it will check in
database to see if such template exists.

Mail service will also expose CRUD endpoints so it is possible to manage templates e.g. via a custom admin UI.

#### Layout template

A template may have `layout` which is a reference to another template. That layout must have a variable named
`content` where the content will be injected.

Example of layout:

```html
<html>
	<body>
		{{content}}
		<p>Best regards,<br/>The fruster team</p>
	</body>
</html>
```

#### Access control CRUD templates

In some uses cases there is a need to narrow down who is allowed to CRUD templates.

In many cases the built in Fruster permissions/scope mapping will do.

By mapping `mail.template.update`, `mail.template.create` and `mail.template.get` to roles
you can decide which role(s) that are allowed to do that.

Further it is possible to match a logged in users property with a template. For example
if the logged in user belongs to a, lets say `organisation` (could be anything), which is
set on the user `profile.organisationId`.

The we can set the organisation id as `owner` and add configuration `TEMPLATE_OWNER_PROP` that will instruct
fruster mail service to check this when CRUDing templates.

Example:

```
# Will make sure that logged in users who it attempting to CRUD the template
# has value "profile.organisationId" which equals to the one set as "owner"
# on the template
TEMPLATE_OWNER_PROP=profile.organisationId
```



## Grouped/batched emails

Grouped emails will rate limit how often a particular type of email is sent.

Lets say the scenario is that you got emails as soon as someone "like" your image. In that
case not to receive an email at once when someone like, you can configure mail service to group
the emails so it is sent for example immediately after first like and then send after every 10 likes
and/or send mail within a time frame.

Set this in config `GROUPED_MAIL_BATCHES` which uses format:

```
{numberOfMessages},{timeout};{numberOfMessages},{timeout};
```

* `numberOfMessages` is the number of messages to be sent before next batch level is reached.
* `timeout` is the timeout for when mails are sent out even though the `numberOfMessages` has not been reached. Can be ms() or ms number

Enable this functionality by setting `ENABLE_GROUPED_MAILS` to `true`.
