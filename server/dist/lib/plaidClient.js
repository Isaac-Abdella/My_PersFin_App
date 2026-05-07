"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plaidClient = void 0;
const plaid_1 = require("plaid");
const config_1 = require("../config");
const envMap = {
    sandbox: plaid_1.PlaidEnvironments.sandbox,
    development: plaid_1.PlaidEnvironments.development,
    production: plaid_1.PlaidEnvironments.production,
};
const config = new plaid_1.Configuration({
    basePath: envMap[config_1.PLAID_ENV] ?? plaid_1.PlaidEnvironments.sandbox,
    baseOptions: {
        headers: {
            "PLAID-CLIENT-ID": config_1.PLAID_CLIENT_ID,
            "PLAID-SECRET": config_1.PLAID_SECRET,
        },
    },
});
exports.plaidClient = new plaid_1.PlaidApi(config);
