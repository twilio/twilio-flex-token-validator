declare namespace Twilio {
  declare class Response {
    public appendHeader(key: string, value: string): void;

    public setStatusCode(code: number): void;

    public setBody(body: string): void;
  }

  declare const Response: Response;
}
