import * as https from 'https';

import Response from 'twilio/lib/http/response';

export interface Context {
  ACCOUNT_SID: string;
  AUTH_TOKEN?: string;
  API_KEY?: string;
  API_SECRET?: string;
}

export interface ValidationResponse {
  valid: boolean;
  message: string;
}

export interface ValidtionError {
  message: string;
}

export interface Event {
  Token: string;
  TokenResult?: ValidationResponse;
}

export interface CredentialTypes {
  token: string;
  accountSid: string;
  credentials: (Credential | null)[];
}

export type Callback = (error: Error | string | null, response: Response<ValidationResponse>) => void;
export type HandlerFn = (context: Context, event: Event, callback: Callback) => void;
export type AuthToken = string;
export type ApiKey = string;
export type ApiSecret = string;
export type Credential = AuthToken | (ApiKey & ApiSecret);

function generateAuthorizationString(key: string, secret: string): string {
  const authz = Buffer.from(`${key}:${secret}`);
  return `Basic ${authz.toString('base64')}`;
}

/**
 * checks credentials and generates the authorization value for the header
 * @param accountSid the Account Sid
 * @param credentials AuthToken or ApiKey, ApiSecret
 * @returns string
 */
function authiorizationHandler(accountSid: string, ...credentials: (Credential | null)[]): string | null {
  if (!credentials) return null;

  if (credentials.length === 1 && credentials[0]) {
    return generateAuthorizationString(accountSid, credentials[0]);
  }

  if (credentials.length === 2 && credentials[0] && credentials[1]) {
    return generateAuthorizationString(credentials[0], credentials[1]);
  }
  return null;
}

function checkCredentials(tests: CredentialTypes): { isValid: boolean; message?: string } {
  if (!tests.token) {
    return {
      isValid: false,
      message: 'Unauthorized: Token was not provided',
    };
  }

  if (!tests.accountSid) {
    return {
      isValid: false,
      message: 'Unauthorized: AccountSid or AuthToken was not provided',
    };
  }

  if (!tests.credentials) {
    return {
      isValid: false,
      message: 'Unauthorized: AuthToken or APIKeys not provided',
    };
  }

  return { isValid: true };
}

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
  const isValidationError = (x: any): x is ValidtionError => {
    return typeof x.message === 'string';
  };

  return new Promise((resolve, reject) => {
    const tests: CredentialTypes = { token, accountSid, credentials };
    if (checkCredentials(tests)) {
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
          const result: ValidationResponse = JSON.parse(data) || new Error('JSON.parse failed');
          if (result.valid) {
            resolve(result);
          } else {
            reject(<unknown>result.message);
          }
        } catch (err) {
          if (isValidationError(err)) {
            reject(err.message);
          }
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
  return async (context, event, callback) => {
    const failedResponse = (message: string) => {
      // @ts-expect-error Twilio is provided as an ambient class with the Twilio host
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
