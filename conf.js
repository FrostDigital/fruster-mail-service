module.exports = {

    // NATS servers, set multiple if using cluster
    // Example: `"nats://10.23.45.1:4222", "nats://10.23.41.8:4222"`
    bus: process.env.BUS || "nats://localhost:4222",

    // Domains we are allowed to send from
    defaultFrom: process.env.DEFAULT_FROM || "no-reply@frost.se",

    // Your secret sendgrid API key from here:
    // https://app.sendgrid.com/settings/api_keys
    sendgridApiKey: process.env.SENDGRID_API_KEY || "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",

    substitutionCharacter: parseArray(process.env.SUBSTITUTION_CHARACTER) || ["-", "-"]

};

function parseArray(str) {
    if (str) {
        return str.split(",");
    }
    return null;
}
