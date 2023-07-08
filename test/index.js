// Set options as a parameter, environment variable, or rc file.
//
import Runtime from "./../src/Runtime.js";
const Gateway = new Runtime({
  port: 9999,
  function: {
    path: '/../../test/route',
    handler: 'handler'
  },
  cors: {
    origin: '*',
    headers: [ 'Content-Type','X-Amz-Date' ,'Authorization' ,'X-Api-Key' ,'X-Amz-Security-Token' ,'X-Amz-User-Agent' ,'ResourcesToken'],
    allowCredentials: true
  }
});
Gateway.start();
