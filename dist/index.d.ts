export interface Context {
    ACCOUNT_SID: string;
    AUTH_TOKEN: string;
}
export interface Event {
    Token: string;
    TokenResult: object;
}
export declare type Callback = (error: any, respoonse: any) => void;
export declare type HandlerFn = (context: Context, event: Event, callback: Callback) => void;
/**
 * Validator function decorator used in Twilio Functions. Calls {@link validator}
 * @param handlerFn	the Twilio Runtime Handler Function
 */
export declare const runtimeValidator: (handlerFn: HandlerFn) => HandlerFn;
/**
 * Validates that the Token is valid
 *
 * @param token			the token to validate
 * @param accountSid	the accountSid
 * @param authToken		the authToken
 */
export declare const validator: (token: string, accountSid: string, authToken: string) => Promise<object>;
