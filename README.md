# Hybridless Nodejs Runtime (httpd) ![Node.js Package](https://github.com/hybridless/runtime-nodejs-httpd/workflows/Node.js%20Package/badge.svg)

Hybridless Runtime for NodeJS (any recent version). 
Simulates lambda nodejs runtime by having a HTTP listener and invoking nodejs handler with a lambda simulated context.

- ![npm](https://img.shields.io/npm/dy/@hybridless/runtime-nodejs-httpd) ![npm](https://img.shields.io/npm/v/@hybridless/runtime-nodejs-httpd) ![npm (tag)](https://img.shields.io/npm/v/@hybridless/runtime-nodejs-httpd/latest) ![Libraries.io dependency status for latest release, scoped npm package](https://img.shields.io/librariesio/release/npm/@hybridless/runtime-nodejs-httpd)
- ![GitHub commit activity](http://img.shields.io/github/commit-activity/m/hybridless/runtime-nodejs-httpd)
- ![GitHub last commit](http://img.shields.io/github/last-commit/hybridless/runtime-nodejs-httpd)

### Overall

This runtime has the goal to be the runtime used by the hybridless framework in other to provide base builds for nodejs environments on ECS tasks by letting the same type of code used on lambdas to execute on the tasks with the same behaviour. 

Essentially we have an http listener (HAPI) that will route everything but health check route to the specified function. The function is invoked with the same context and event issued by API Gateway and behaves like it.
At the time this is being written not everything has being perfectly replicated by the main functions and event informations are available. If you want to check all the latest context implementation, please check the source. 


### Usage

If using outside of hybridless framework you can initialize the runtime as below:
```
const Runtime = require("@hybridless/runtime-nodejs-httpd");
const Gateway = new Runtime({
  port: 9999,
  function: {
    path: './route.js',
    handler: 'handler'
  },
  cors: {
    origin: '*',
    headers: [ 'Content-Type','X-Amz-Date' ,'Authorization' ,'X-Api-Key' ,'X-Amz-Security-Token' ,'X-Amz-User-Agent'],
    allowCredentials: true
  }
});
Gateway.start();

``` 

### Options

```
	{
      host?: 'localhost', -- defaults to localhost
      port?: 9998, -- defaults to 80
      timeout: 30000, -- in millis, defaults to 30000, (30 seconds)
      cors: { origin: '*', headers: [...], allowCredentials: true },
      function: { 
      	path: '/my/path/index.js', 
      	handler: 'exportedFunctionName', 
      	preload? - defaults to true (will preload the function right after initializing the http layer, otherwise will initialize it when invoked, making first request to take more time, similar to lambda coldstart)
      },
      healthCheckRoute: '/health', -- defaults to '/health' -- This is a bypass route to just check the http layer by not incoking the function, useful for ALB health checks
      baseDir: '/path/to/task/' -- defaults to __dirname
    }
```

-------

### Functions

Functions invoked by this runtime behaves and function as lambda functions on API Gateway, so you should **always** return or context succeed in the HTTP layer.

**Context Succeed:**
```
export const handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      context.succeed({ body: {}, statusCode: 200 });
      resolve();
    }, 200);
  })
};
```
**Returns**
```
export const handler = async (event, context) => {
  return { body: {}, statusCode: 200 };
};
```

### HTTP Responses

Hopefully, 100% of time the client will receive responses issued by your function as specified below, but if things break, errors responses below would be visible.

-  **Response Type:** Function Invocation

   **Body:** `content.succeed.body` OR `function.body`
   
   **Status Code:** `content.succeed.statusCode` OR `function.statusCode`
-  **Response Type:** Function didn't returned any data or malformed response

   **Status Code:** `content.succeed.statusCode` OR `function.statusCode`

   **Body:**
   ```
   {
	   err: '[Runtime Proxy]: Invalid response from server!',
	   errCode: 'EMPTY_RESPONSE',
   }
   
-  **Response Type:** Exception during function execution

   **Status Code:** `502`

   **Body:** 
   ```
   {
	   err: '[Runtime Proxy]: Exception during request execution!',
	   errCode: 'EXEC_EXCEPTION',
	   ...exception (probably stack track will be available)
   }
   ```

-------
### Monitoring

This runtime has `newrelic` framework embedded on its dependencies but will only load it if the process has the environment `NEW_RELIC_ENABLED` set to `true`.
When this flag is enabled the runtime will load the newrelic framework at it's start (before loading the HTTP layer) and will set the transaction name for each request being the relative path to the server URL. 

If you want to enable the monitoring outside of hybridless framework, you should use the following ENV ivars if no config files are on your application root directory:
- `NEW_RELIC_ENABLED` - Defaults to false. (bool)
- `NEW_RELIC_APP_NAME`
- `NEW_RELIC_LICENSE_KEY`
- `NEW_RELIC_NO_CONFIG_FILE` - Defaults to false. You should set to true when using key and name on ENV ivars, otherwise asks for configuration file, but as the runtime initialized the newrelic framework before any function invocation you might not be able to use config files. (bool)
