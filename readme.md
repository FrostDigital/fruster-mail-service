# Fruster Mail Service

Send mail via Sendgrid.

## Exposed actions

### Send mail

Send mail to given address(es).

#### Subject

    mail-service.send

#### Request

    {
        // ...
        "data": {
            "to": [ "bob@example.com", "alice@nasa.com" ],  // can be a single string if only one recipient
            "from": "no-reply@fruster.se",
            "subject": "Hello world!",
            "message": "This is the message that allos <b>simple</b> html",
            "templateId": "2c79e8ea-3a8a-4721-99f1-4c94b89bdbcd", // optional id of sendgrid template
            "templateArgs": { // optional map of template args
                "name": "Joel"
            }
        }
    }

#### Success response

    {
        // ...
        "status": 200,
    }

#### Failure response

* 400 / 4001 Invalid mail
* 500 / 5001 Sendgrid failure


## Run

Install dependencies:

    npm install

Start server:

    npm start

During development `nodemon` is handy, it will watch and restart server when files changes:

    # If you haven't already installed, do it:
    npm install nodemon -g

    # Start watch - any change to the project will now restart the server, or typ `rs` to trigger restart manually.
    nodemon ./app.js

## Configuration

Configuration is set with environment variables. All config defaults to values that makes sense for development.

    # Applications log level (error|warn|info|debug|silly)
    LOG_LEVEL = "debug"

    # NATS servers, set multiple if using cluster
    # Example: `"nats://10.23.45.1:4222,nats://10.23.41.8:4222"`
    BUS = "nats://localhost:4222"

    # Your secret sendgrid API key from here:
    # https://app.sendgrid.com/settings/api_keys
    SENDGRID_API_KEY = "abc123"

    # Default from address used if none is specified in mail model
    DEFAULT_FROM = "fruster@frost.se"
