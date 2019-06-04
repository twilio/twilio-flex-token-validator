"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var https = require("https");
/**
 * Validator function decorator used in Twilio Functions. Calls {@link validator}
 * @param handlerFn	the Twilio Runtime Handler Function
 */
exports.runtimeValidator = function (handlerFn) {
    return function (context, event, callback) {
        var failedResponse = function (message) {
            var response = new Twilio.Response();
            response.setStatusCode(403);
            response.setBody(message);
            callback(null, response);
        };
        var accountSid = context.ACCOUNT_SID;
        var authToken = context.AUTH_TOKEN;
        var token = event.Token;
        if (!accountSid || !authToken) {
            return failedResponse('AccountSid or AuthToken was not provided. For more information, please visit https://twilio.com/console/runtime/functions/configure');
        }
        exports.validator(token, accountSid, authToken)
            .then(function (result) {
            event.TokenResult = result;
            handlerFn(context, event, callback);
        })
            .catch(function (err) {
            failedResponse(err.message);
        });
    };
};
/**
 * Validates that the Token is valid
 *
 * @param token			the token to validate
 * @param accountSid	the accountSid
 * @param authToken		the authToken
 */
exports.validator = function (token, accountSid, authToken) {
    return new Promise(function (resolve, reject) {
        if (!token) {
            reject('No token was found');
        }
        if (!accountSid || !authToken) {
            reject('AccountSid or AuthToken was not provided');
        }
        var authorization = Buffer.from(accountSid + ":" + authToken);
        var requestData = JSON.stringify({ token: token });
        var requestOption = {
            hostname: 'iam.twilio.com',
            port: 443,
            path: "/v1/Accounts/" + accountSid + "/Tokens/validate",
            method: 'POST',
            headers: {
                'Authorization': "Basic " + authorization.toString('base64'),
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json',
                'Content-Length': requestData.length
            }
        };
        var req = https.request(requestOption, function (resp) {
            var data = "";
            resp.setEncoding('utf8');
            resp.on('data', function (d) { return data += d; });
            resp.on('end', function () {
                try {
                    var result = JSON.parse(data);
                    if (result.valid) {
                        resolve(result);
                    }
                    else {
                        reject(result);
                    }
                }
                catch (err) {
                    reject(err);
                }
            });
        });
        req.on('error', reject);
        req.write(requestData);
        req.end();
    });
};
//# sourceMappingURL=index.js.map