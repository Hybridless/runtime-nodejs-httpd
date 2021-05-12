import Globals from '../Globals';
import LambdaEvent from './LambdaEvent';
import Hapi from '@hapi/hapi';
//
const assert = require('assert');
const pkg = require('../../package.json');
//
export default class RuntimeProxy {
  /* config structure
    {
      host?: 'localhost', -- defaults to localhost
      port?: 9998, -- defaults to 80
      timeout: 30000, -- defaults to 30 seconds
      cors: { origin: '*', headers: [...], allowCredentials: true },
      function: { path, handler, preload? - defaults to true },
      healthCheckRoute: '/health', -- defaults to '/health',
      baseDir: '/path/to/' -- defaults to __dirname
    }
  */
  constructor(config) {
    this.config = config;
    this._validateConfig(); //validate configuration
    //Define the listener (futurely it could go to different protocols)
    this.listenerConfig = {
        port: this.config.port || Globals.Listener_HTTP_DefaultPort,
        host: this.config.host || Globals.Listener_HTTP_DefaultHost,
        router: { stripTrailingSlash: true }
    };
    this.listener = Hapi.server(this.listenerConfig);
  
    //This supposedly fix some 502 codes where nodejs socket would hang during
    //a request and if behind ALB, it would cause 502 codes. Had experiencied this
    //and 502 codes reduced dramastically, but still some appearances. Maybe this 
    //is just a palliative work-around for the real issue; TODO: need to investigate 
    //in the future.
    this.listener.listener.keepAliveTimeout = 120e3;
    this.listener.listener.headersTimeout = 120e3;
  }
  //Life cycle
  async load() {
    await this.startListeners();
    this.installRoutes();
    this._warmFunction();
  }
  async unload(err) { await this.stopListeners(err); }
  /* private */
  async startListeners() {
    //Start listener -- print some info
    console.log(`[Runtime Proxy] - [STARTING] - v.${pkg.version} - ${this.listenerConfig.host}:${this.listenerConfig.port}`);
    await this.listener.start();
    console.log(`[Runtime Proxy] - [STARTED] - ${this.listener.info.uri}`);
  }
  installRoutes() {
    //Health check route -- This is a bypass route to only check if 
    //runtime proxy is working and responding to calls.
    console.log(`[Runtime Proxy] - [HEALTH-ROUTE] - ${this.config.healthCheckRoute || Globals.Listener_HTTP_DefaultHealthCheckRoute}`);
    this.listener.route({
      method: 'GET', path: this.config.healthCheckRoute || Globals.Listener_HTTP_DefaultHealthCheckRoute,
      handler: this._healthCheckHandler.bind(this),
      options: {
        ...(this.config.cors ? {
          cors: {
            origin: (Array.isArray(this.config.cors.origin) ? this.config.cors.origin : [this.config.cors.origin || '*']),
            additionalHeaders: this.config.cors.headers || [],
            credentials: this.config.cors.allowCredentials || false
          }
        } : {})
      }
    });
    //Main route -- We use a wildcard route because is not the job of the runtime and neither
    //the task to deny/constrain routes that invoked this task; all the job is done by the 
    //load balancer and we just foward everything we have to the function.
    this.listener.route({
      method: '*', path: Globals.Listener_HTTP_ProxyRoute,
      options: {
        timeout: { server: this.config.timeout || Globals.Listener_HTTP_DefaultTimeout },
        ...(this.config.cors ? {
          cors: {
            origin: (Array.isArray(this.config.cors.origin) ? this.config.cors.origin : [this.config.cors.origin || '*']),
            additionalHeaders:  this.config.cors.headers || [],
            credentials:  this.config.cors.allowCredentials || false
          }
        } : {})
      },
      handler: this._requestHandler.bind(this)
    });
  }
  async stopListeners(err) {
    console.debug('[Runtime Proxy] - [STOPPING]');
    const _err = await this.listener.stop({ timeout: 10000 });
    if (err || _err) console.log('[Runtime Proxy] - exit output:', (err || _err));
    console.log('[Runtime Proxy] - [STOPPED]');
    process.exit((err || _err) ? 1 : 0);
  }
  /* handlers */
  async _healthCheckHandler(request, h) {
    //Set new relic path name
    if (process.env.NEW_RELIC_ENABLED == 'true' || process.env.NEW_RELIC_ENABLED == true) {
      //New relic pre-append '/' at the begin, so we remove here :) 
      const tr = require('newrelic').getTransaction();
      if (tr) tr.ignore();
    } return h.response('Healthy!');
  }
  async _requestHandler(request, h) {
    const startTime = Date.now();
    let resp = null;
    try {
      //Set new relic path name
      if (process.env.NEW_RELIC_ENABLED == 'true' || process.env.NEW_RELIC_ENABLED == true) {
        //New relic pre-append '/' at the begin, so we remove here :) 
        require('newrelic').setTransactionName(request.path.substr(1, request.path.length - 1));
      }
      //Generate event with request stuff
      const path = this._getFunctionFullpath();
      const event = new LambdaEvent(request, path, this.config.function.handler);
      //Invoke_getFunctionFullpath
      const invokation = await event.invoke();
      //Respond
      resp = this._processLambdaResponse(invokation, h);
    } catch (e) {
      console.error('[Runtime Proxy] - Exception during execution!', e);
      res = h.response({...e, err: Globals.Resp_MSG_EXCEPTION, errCode: Globals.Resp_CODE_EXCEPTION})
             .code(Globals.Resp_STATUSCODE_EXCEPTION); //bad gateway
    }
    console.debug(`[Runtime Proxy] - Request took ${Date.now()-startTime}ms`);
    return resp;
  }
  _processLambdaResponse(invokation, h) {
    //Interpret answer to http layer
    if (invokation && invokation.err) { //err came
      return h.response({err: invokation.err})
              .code(400);
    } else if (!invokation || !invokation.data) { //invalid response came
      return h.response({err: Globals.Resp_MSG_INVALIDRESP, errCode: Globals.Resp_CODE_INVALIDRESP})
              .code(Globals.Resp_STATUSCODE_INVALIDRESP);
    } else { //valid
      const response = h.response(invokation.data.body || {})
                        .code(invokation.data.statusCode);
      //Check for headers
      if (invokation.data.headers) {
        for (let hKey of Object.keys(invokation.data.headers)) {
          response.header(hKey, invokation.data.headers[hKey]);
        }
      }
      //
      return response;
    }
  }
  /* helpers */
  _getFunctionFullpath() {
    return `${this.config.baseDir || __dirname}${this.config.function.path}`;
  }
  _validateConfig() {
    assert(this.config.port, '[Runtime Proxy] - Listener port for the process is not specified! - missing `port` key on config.');
    assert(this.config.function, '[Runtime Proxy] - Invocation function is not specified! - missing `function` key on config.');
    assert(this.config.function.path, '[Runtime Proxy] - Invocation function path is not specified! - missing `function.path` key on config.');
    assert(this.config.function.handler, '[Runtime Proxy] - Invocation function handler is not specified! - missing `function.handler` key on config.');
  }
  _warmFunction() {
    if (this.config.function.preload == undefined || this.config.function.preload) {
      try {
        const t = Date.now();
        require(this._getFunctionFullpath());
        console.debug(`[Runtime Proxy] - Took ${(Date.now() - t)}ms to preload application!`);
      } catch (e) {
        console.error('[Runtime Proxy] - Exception while preloading exec. file!', e);
      }
    }
  }
}
