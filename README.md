# twilio-flex-token-validator
Flex JWE Token Validator provides an easy way to validate a Flex JWE token. 

## Usage

Install with `npm install twilio-flex-token-validator`. 

You can use this validator either within a [Twilio Function](https://www.twilio.com/functions), or into any NodeJS application.

### Using in Twilio Function

First visit [Twilio Function Configuration](https://www.twilio.com/console/runtime/functions/configure) and add `twilio-flex-token-validator` as an NPM package. While you are on the configuration page, make sure `Enable ACCOUNT_SID and AUTH_TOKEN` is also checked.

Then in your Twilio Function, wrap your main `handler` with this validator:

```js
const JWEValidator = require('twilio-flex-token-validator').runtimeValidator;

exports.handler = JWEValidator(function(context, event, callback) {
    // Your normal Twilio Function goes here.
    // This block will only be called your token is validated, otherwise it returns a 403.
});
``` 

This validator assumes that the token is provided as the `Token` key. The successful result of the token validation is added to `event.TokenResult`.

### Using in your own Node server

You can also use this validator inside any existing Node servers:

```js
const JWEValidator = require('twilio-flex-token-validator').validator;

JWEValidator(jweToken, accountSid, authToken)
    .then(tokenResult => {
      // validated
    })
    .catch(err => {
      // validation failed
    });
```

## Token Result

The validated token result will contain the following data:

```json
{
  "valid": true,
  "code": 0,
  "message": null,
  "expiration": "2018-09-24T23:22:44.240Z",
  "realm_user_id": "user@example.com",
  "identity": "user_40example_2Dcom",
  "roles":[
    "agent"
  ],
  "worker_sid": "WKxxx"
}
```
