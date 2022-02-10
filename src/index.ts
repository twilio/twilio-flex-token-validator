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
  AUTH_TOKEN?: string;
  API_KEY?: string;
  API_SECRET?: string;
}

export interface Event {
  Token: string;
  TokenResult?: ValidationResponse;
}

export type ValidationResponse = {
  valid: boolean;
  message: string;
};
export type Callback = (error: Error | string | null, response: Twilio.Response) => void;
export type HandlerFn = (context: Context, event: Event, callback: Callback) => void;
export type AuthToken = string;
export type ApiKey = string;
export type ApiSecret = string;
export type Credential = AuthToken | (ApiKey & ApiSecret);
/**
 * Validates that the Token is valid
 *
 * @param token        the token to validate
 * @param accountSid   the accountSid
 * @param credentials  the AuthToken or APIKey and APISecret
 * @returns
 */
export const validator = async (
  token: string,
  accountSid: string,
  ...credentials: (Credential | null)[]
): Promise<ValidationResponse> => {
  return new Promise((resolve, reject) => {
    if (!token) {
      reject('Unauthorized: Token was not provided');
      return;
    }

    if (!accountSid || !credentials) {
      reject('Unauthorized: AccountSid or AuthToken was not provided');
      return;
    }

    const authorization = authiorizationHandler(accountSid, ...credentials) as string;
    if (!authorization) {
      reject('Unauthorized: AccountSid or AuthToken was not provided');
      return;
    }

    const requestData = JSON.stringify({ token });
    const requestOption: https.RequestOptions = {
      hostname: 'iam.twilio.com',
      port: 443,
      path: `/v1/Accounts/${accountSid}/Tokens/validate`,
      method: 'POST',
      headers: {
        Authorization: authorization,
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
          const result: ValidationResponse = JSON.parse(data);
          if (result.valid) {
            resolve(result);
          } else {
            reject(result.message);
          }
        } catch (err: Error | unknown | any) {
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
  // eslint-disable-next-line @typescript-eslint/promise-function-async
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

    const { ACCOUNT_SID: accountSid } = context;

    const { Token: token } = event;

    const credentials: (Credential | null)[] = ['AUTH_TOKEN', 'API_KEY', 'API_SECRET'].filter(
      (key: string): Credential | null => {
        return context[key] ? context[key] : null;
      },
    );

    return validator(token, accountSid, ...credentials)
      .then((result) => {
        event.TokenResult = result;
        return handlerFn(context, event, callback);
      })
      .catch(failedResponse);
  };
};

/**
 * checks credentials and generates the authorization value for the header
 * @param accountSid the Account Sid
 * @param credentials AuthToken or ApiKey, ApiSecret
 * @returns string
 */
function authiorizationHandler(accountSid: string, ...credentials: (Credential | null)[]): string | null {
  function generateAuthorizationString(key: string, secret: string): string {
    const authz = Buffer.from(`${key}:${secret}`);
    return `Basic ${authz.toString('base64')}`;
  }

  if (!credentials) return null;

  if (credentials.length === 1 && credentials[0]) {
    return generateAuthorizationString(accountSid, credentials[0]);
  }

  if (credentials.length === 2 && credentials[0] && credentials[1]) {
    return generateAuthorizationString(credentials[0], credentials[1]);
  }
  return null;
}
