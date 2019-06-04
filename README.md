# twilio-flex-token-validator
Flex JWE Token Validator provides an easy way to validate Flex JWE token. 

## Usage

Install with `npm install twilio-flex-token-validator`. 

You can use this validator either within your Twilio Function, or integrate it in your own Node server.

### Using in Twilio Runtime

First visit [Twilio Function Configuration](https://www.twilio.com/console/runtime/functions/configure) and add `twilio-flex-token-validator` as an NPM package. While you are on the configuration page, make sure `Enable ACCOUNT_SID and AUTH_TOKEN` is also checked.

Then in your Twilio Function, wrap your main `handler`:

```js
const JWEValidator = require('twilio-flex-token-validator').runtimeValidator;

exports.handler = JWEValidator(function(context, event, callback) {
    // your normal code goes here
    // This block will never be called with your token is not validated
});

``` 

This validator assumes that the token is provided as the `Token` key.

### Using in your own Node server

You can also use this validator inside any existing Node servers:

```js
const JWEValidator = require('twilio-flex-token-validator').validator;

JWEValidator(jweToken, accountSid, authToken)
    .then(resp => {
      // validated
    })
    .catch(err => {
      // validation failed
    });
```

