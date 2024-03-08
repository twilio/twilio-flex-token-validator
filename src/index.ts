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
  API_KEY?: string;
  API_SECRET?: string;
}

export interface Event {
  Token: string;
  TokenResult?: object;
}
export interface ApiCredentials {
  Sid: string;
  Secret: string;
}

export type Callback = (error: any, response: Twilio.Response) => void;
export type HandlerFn = (context: Context, event: Event, callback: Callback) => void;

/**
 * Validates that the Token is valid
 *
 * @param token          the token to validate
 * @param accountSid     the accountSid
 * @param authToken      the authToken
 * @param apiCredentials optional api credentials to use instead of root account credentials
 */
export const validator = async (
  token: string,
  accountSid: string,
  authToken?: string,
  realm?: string,
  apiCredentials?: ApiCredentials,
): Promise<object> => {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject('Unauthorized: Token was not provided');
      return;
    }

    if (!accountSid) {
      reject('Unauthorized: AccountSid was not provided');
      return;
    }

    if (!authToken && (!apiCredentials?.Sid || !apiCredentials?.Secret)) {
      reject('Unauthorized: AuthToken or Api Credentials were not provided');
      return;
    }

    const authorization = authToken
      ? Buffer.from(`${accountSid}:${authToken}`)
      : Buffer.from(`${apiCredentials?.Sid}:${apiCredentials?.Secret}`);
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
    const apiKey = context.API_KEY;
    const apiSecret = context.API_SECRET;
    const token = event.Token;

    if (!accountSid) {
      return failedResponse(
        'Unauthorized: AccountSid was not provided. For more information, please visit https://twilio.com/console/runtime/functions/configure',
      );
    }

    if (!authToken && (!apiKey || !apiSecret)) {
      return failedResponse(
        'Unauthorized: AuthToken or Api Credentials were not provided. For more information, please visit https://twilio.com/console/runtime/functions/configure',
      );
    }

    const region = context.TWILIO_REGION ? context.TWILIO_REGION.split('-')[0] : '';
    if (!authToken) {
      return validator(token, accountSid, undefined, region, {
        Sid: apiKey as string,
        Secret: apiSecret as string,
      })
        .then((result) => {
          event.TokenResult = result;
          return handlerFn(context, event, callback);
        })
        .catch(failedResponse);
    }

    return validator(token, accountSid, authToken, region)
      .then((result) => {
        event.TokenResult = result;
        return handlerFn(context, event, callback);
      })
      .catch(failedResponse);
  };
};
