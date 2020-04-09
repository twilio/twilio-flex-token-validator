import * as nock from 'nock';

import { functionValidator, validator, Context, Event } from '.';

describe('index.ts', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockHttps = () => {
    return nock('https://iam.twilio.com').post(() => true);
  };

  describe('validator', () => {
    afterEach(() => {
      nock.cleanAll();
    });

    it('should fail if no token is provided', async (done) => {
      try {
        await validator('', '', '');
      } catch (err) {
        expect(err).toEqual('Unauthorized: Token was not provided');
        done();
      }
    });

    it('should fail if no accountSid is provided', async (done) => {
      try {
        await validator('token-123', '', '');
      } catch (err) {
        expect(err).toContain('Unauthorized: AccountSid or AuthToken was not provided');
        done();
      }
    });

    it('should fail if no authToken is provided', async (done) => {
      try {
        await validator('token-123', 'AC123', '');
      } catch (err) {
        expect(err).toContain('Unauthorized: AccountSid or AuthToken was not provided');
        done();
      }
    });

    it('should handle request failure', async (done) => {
      const scope = mockHttps().replyWithError('this failed');

      try {
        await validator('token-123', 'AC123', 'authToken');
      } catch (err) {
        expect(scope.isDone()).toBeTruthy();
        expect(err).toEqual('this failed');
        done();
      }
    });

    it('should fail to validate if response is not json', async (done) => {
      const scope = mockHttps().reply(200, 'not-json-string');

      try {
        await validator('token-123', 'AC123', 'authToken');
      } catch (err) {
        expect(scope.isDone()).toBeTruthy();
        expect(err).toContain('Unexpected token');
        expect(err).toContain('in JSON at position');
        done();
      }
    });

    it('should fail to validate if response valid is false', async (done) => {
      const scope = mockHttps().reply(200, '{"valid":false, "message":"not valid"}');

      try {
        await validator('token-123', 'AC123', 'authToken');
      } catch (err) {
        expect(scope.isDone()).toBeTruthy();
        expect(err).toEqual('not valid');
        done();
      }
    });

    it('should validate', async () => {
      const scope = nock('https://iam.twilio.com')
        .post('/v1/Accounts/AC123/Tokens/validate', { token: 'token-123' })
        .reply(200, '{"valid":true, "other": "parameter"}');

      const response = await validator('token-123', 'AC123', 'authToken');
      expect(response).toEqual({ valid: true, other: 'parameter' });

      expect(scope.isDone()).toBeTruthy();
    });
  });

  describe('functionValidator', () => {
    const context: Context = {
      ACCOUNT_SID: 'AC123',
      AUTH_TOKEN: 'AUTH123',
    };

    const event: Event = {
      Token: 'Token123',
    };

    afterEach(() => {
      nock.cleanAll();
    });

    it('should fail to validate', async () => {
      const fn = jest.fn();
      const cb = jest.fn();
      const setStatusCode = jest.fn();
      const setBody = jest.fn();
      const appendHeader = jest.fn();
      (global as any).Twilio.Response = jest.fn().mockImplementation(() => ({
        setStatusCode,
        setBody,
        appendHeader,
      }));

      await functionValidator(fn)(context, event, cb);

      expect(fn).not.toHaveBeenCalled();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(setStatusCode).toHaveBeenCalledTimes(1);
      expect(setBody).toHaveBeenCalledTimes(1);
      expect(appendHeader).toHaveBeenCalledTimes(4);

      expect(setStatusCode).toHaveBeenCalledWith(403);
    });

    it('should validate', async () => {
      const scope = nock('https://iam.twilio.com')
        .post('/v1/Accounts/AC123/Tokens/validate', { token: event.Token })
        .reply(200, '{"valid":true, "other": "parameter"}');

      const fn = jest.fn();
      const cb = jest.fn();

      await functionValidator(fn)(context, event, cb);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(cb).not.toHaveBeenCalled();

      expect(scope.isDone()).toBeTruthy();
    });
  });
});
