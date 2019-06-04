import '@babel/polyfill';

global.Twilio = {
  Response: () => ({
    setStatusCode: () => {
      // no-ops
    },
    setBody: () => {
      // no-ops
    }
  })
};
