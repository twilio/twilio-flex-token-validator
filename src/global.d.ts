declare module Twilio {
    declare class Response {
        public setStatusCode(code: number): void;
        public setBody(body: string): void;
    }

    declare const Twilio: {
        Response: Response;
    };
}
