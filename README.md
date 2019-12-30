<h1 align="center">Twilio Flex Token Validator</h1>
<p align="center">Flex JWE Token Validator provides an easy way to validate a Flex JWE token.</p>

<p align="center">
    <a href="https://travis-ci.com/twilio/twilio-flex-token-validator">
        <img src="https://travis-ci.com/twilio/twilio-flex-token-validator.svg?branch=master" title="Build Status" />
    </a>
    <a href="https://www.npmjs.com/package/twilio-flex-token-validator">
        <img src="https://img.shields.io/npm/v/twilio-flex-token-validator.svg?style=flat-square" title="npm" />
    </a>
    <a href="https://www.npmjs.com/package/twilio-flex-token-validator">
        <img src="https://img.shields.io/npm/dt/twilio-flex-token-validator.svg?style=flat-square" title="npm" />
    </a>
    <a href="./LICENSE.md">
        <img src="https://img.shields.io/badge/license-MIT-green.svg" title="License" />
    </a>
</p>

## Usage

Install with `npm install twilio-flex-token-validator`. 

You can use this validator either within a [Twilio Function](https://www.twilio.com/functions), or into any NodeJS application.

### Using in Twilio Function

First visit [Twilio Function Configuration](https://www.twilio.com/console/runtime/functions/configure) and add `twilio-flex-token-validator` as an NPM package. On the same page, enable the checkbox `Enable ACCOUNT_SID and AUTH_TOKEN`. 

In your Twilio Function, wrap your main `handler` with this validator:

```js
const TokenValidator = require('twilio-flex-token-validator').functionValidator;

exports.handler = TokenValidator(function(context, event, callback) {
    // Your normal Twilio Function goes here.
    // This block will only be called if your token is validated, otherwise it returns a 403.
});
``` 

This validator assumes that the token is provided as the `Token` key. The successful result of the token validation is added to `event.TokenResult`.

Make sure the checkbox `Check for valid Twilio signature` is _disabled_. This token validator will handle the authentication of the request instead.

### Using in any NodeJS application

You can also use this validator inside any existing Node servers:

```js
const TokenValidator = require('twilio-flex-token-validator').validator;

TokenValidator(token, accountSid, authToken)
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

## Contributing

Check out [CONTRIBUTING](CONTRIBUTING.md) for more information on how to contribute to this project.

## License

Twilio Flex Token Validator is licensed under [MIT](LICENSE).
