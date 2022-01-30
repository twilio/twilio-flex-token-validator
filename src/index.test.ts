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

  const iamUrl = 'https://iam.twilio.com';
  const validationPath = '/v1/Accounts/AC123/Tokens/validate';
  const testToken = 'testToken';
  const replySuccessMessage = '{"valid":true, "other": "parameter"}';
  const testAccpuntSid = 'AC123';
  const unauthorizedNoAccountSidOrAuthMessage = 'Unauthorized: AccountSid or API credential was not provided';

  const mockHttps = () => {
    return nock(iamUrl).post(() => true);
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
        await validator(testToken, '', '');
      } catch (err) {
        expect(err).toContain(unauthorizedNoAccountSidOrAuthMessage);
        done();
      }
    });

    it('should fail if no authToken is provided', async (done) => {
      try {
        await validator(testToken, testAccpuntSid, undefined);
      } catch (err) {
        expect(err).toContain(unauthorizedNoAccountSidOrAuthMessage);
        done();
      }
    });

    it('should fail if credential is object without properties: key and secret', async (done) => {
      try {
        await validator(testToken, testAccpuntSid, {});
      } catch (err) {
        expect(err).toContain('Unauthorized: API credential missing props - key and secret');
        done();
      }
    });

    it('should handle request failure', async (done) => {
      const scope = mockHttps().replyWithError('this failed');

      try {
        await validator(testToken, testAccpuntSid, 'authToken');
      } catch (err) {
        expect(scope.isDone()).toBeTruthy();
        expect(err).toEqual('this failed');
        done();
      }
    });

    it('should fail to validate if response is not json', async (done) => {
      const scope = mockHttps().reply(200, 'not-json-string');

      try {
        await validator(testToken, testAccpuntSid, 'authToken');
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
        await validator(testToken, testAccpuntSid, 'authToken');
      } catch (err) {
        expect(scope.isDone()).toBeTruthy();
        expect(err).toEqual('not valid');
        done();
      }
    });

    it('should validate', async () => {
      const scope = nock(iamUrl).post(validationPath, { token: testToken }).reply(200, replySuccessMessage);

      const response = await validator(testToken, testAccpuntSid, 'authToken');
      expect(response).toEqual({ valid: true, other: 'parameter' });

      expect(scope.isDone()).toBeTruthy();
    });

    it('should validate when replacing authToken with API Keys', async () => {
      const scope = nock(iamUrl).post(validationPath, { token: testToken }).reply(200, replySuccessMessage);

      const response = await validator(testToken, testAccpuntSid, { key: 'key-123', secret: 'secret-098' });
      expect(response).toEqual({ valid: true, other: 'parameter' });

      expect(scope.isDone()).toBeTruthy();
    });
  });

  describe('functionValidator', () => {
    const context: Context = {
      ACCOUNT_SID: testAccpuntSid,
      AUTH_TOKEN: 'AUTH123',
    };

    const event: Event = {
      Token: testToken,
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
      const scope = nock(iamUrl).post(validationPath, { token: event.Token }).reply(200, replySuccessMessage);

      const fn = jest.fn();
      const cb = jest.fn();

      await functionValidator(fn)(context, event, cb);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(cb).not.toHaveBeenCalled();

      expect(scope.isDone()).toBeTruthy();
    });
  });
});
