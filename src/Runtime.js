import RuntimeProxy from './lib/RuntimeProxy';
//
export default class Runtime {
  /* config structure
    {
      host: 'localhost', -- defaults to localhost
      port: 9998,
      timeout: 30000, -- defaults to 30 seconds
      cors: { origin: '*', headers: [...], allowCredentials: true },
      function: { path, handler, preload? - defaults to true },
      healthCheckRoute: '/health', -- defaults to '/health',
      baseDir: '/path/to/' -- defaults to __dirname
    }
  */
  constructor(config) {
    this.config = config;
    this.proxy = new RuntimeProxy(config);
    this._listenProcessEvents();
  }
  async start() {
    await this.proxy.load();
  }
  async stop(err) {
    await this.proxy.unload(err);
  }
  /* private */
  _listenProcessEvents() {
    //start proc listeners
    process.on('unhandledRejection', this.stop.bind(this)); //Listen to exceptions
    process.on('SIGINT', this.stop.bind(this)); // listen on SIGINT signal and gracefully stop the server
  }
}
