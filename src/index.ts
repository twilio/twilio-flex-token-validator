import * as https from 'https';

declare namespace Twilio {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  class Response {
    public appendHeader(key: string, value: string): void;

    public setStatusCode(code: number): void;

    public setBody(body: string): void;
  }
}

export interface Context {
  ACCOUNT_SID: string;
  AUTH_TOKEN: string;
  TWILIO_REGION?: string;
}

export interface Event {
  Token: string;
  TokenResult?: object;
}

export type Callback = (error: any, response: Twilio.Response) => void;
export type HandlerFn = (context: Context, event: Event, callback: Callback) => void;

/**
 * Validates that the Token is valid
 *
 * @param token        the token to validate
 * @param accountSid   the accountSid
 * @param authToken    the authToken
 */
export const validator = async (
  token: string,
  accountSid: string,
  authToken: string,
  realm?: string,
): Promise<object> => {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject('Unauthorized: Token was not provided');
      return;
    }

    if (!accountSid || !authToken) {
      reject('Unauthorized: AccountSid or AuthToken was not provided');
      return;
    }

    const authorization = Buffer.from(`${accountSid}:${authToken}`);
    const requestData = JSON.stringify({ token });
    const hostname = realm ? `iam.${realm}.twilio.com` : `iam.twilio.com`;
    const requestOption = {
      hostname,
      port: 443,
      path: `/v1/Accounts/${accountSid}/Tokens/validate`,
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization.toString('base64')}`,
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        'Content-Length': requestData.length,
      },
    };

    const req = https.request(requestOption, (resp) => {
      let data = '';
      resp.setEncoding('utf8');
      resp.on('data', (d) => (data += d));
      resp.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.valid) {
            resolve(result);
          } else {
            reject(result.message);
          }
        } catch (err) {
          reject(err.message);
        }
      });
    });
    req.on('error', (err) => reject(err.message));
    req.write(requestData);
    req.end();
  });
};

/**
 * A validator to be used with Twilio Function. It uses the {@link validator} to validate the token
 *
 * @param handlerFn    the Twilio Runtime Handler Function
 */
export const functionValidator = (handlerFn: HandlerFn): HandlerFn => {
  return (context, event, callback) => {
    const failedResponse = (message: string) => {
      const response = new Twilio.Response();
      response.appendHeader('Access-Control-Allow-Origin', '*');
      response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET');
      response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.appendHeader('Content-Type', 'plain/text');
      response.setStatusCode(403);
      response.setBody(message);

      callback(null, response);
    };

    const accountSid = context.ACCOUNT_SID;
    const authToken = context.AUTH_TOKEN;
    const token = event.Token;

    if (!accountSid || !authToken) {
      return failedResponse(
        'Unauthorized: AccountSid or AuthToken was not provided. For more information, please visit https://twilio.com/console/runtime/functions/configure',
      );
    }

    const region = context.TWILIO_REGION ? context.TWILIO_REGION.split('-')[0] : '';
    return validator(token, accountSid, authToken, region)
      .then((result) => {
        event.TokenResult = result;
        return handlerFn(context, event, callback);
      })
      .catch(failedResponse);
  };
};
