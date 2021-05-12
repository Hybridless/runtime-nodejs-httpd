// Set options as a parameter, environment variable, or rc file.
// eslint-disable-next-line no-global-assign
require = require("esm")(module/* , options */);
//
const Runtime = require("./../src/Runtime").default;
const Gateway = new Runtime({
  port: 9999,
  function: {
    path: '/../../test/route.js',
    handler: 'handler'
  },
  cors: {
    origin: '*',
    headers: [ 'Content-Type','X-Amz-Date' ,'Authorization' ,'X-Api-Key' ,'X-Amz-Security-Token' ,'X-Amz-User-Agent' ,'ResourcesToken'],
    allowCredentials: true
  }
});
Gateway.start();
