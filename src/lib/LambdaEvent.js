import cuid from 'cuid';
import {
  parseMultiValueHeaders,
  parseMultiValueQueryStringParameters,
  parseQueryStringParameters,
  formatToClfTime,
  nullIfEmpty,
} from "../Utils.js";
import Globals from "../Globals.js";
import unflatten from 'unflatten';
//
export default class LambdaEvent {
  constructor(request, functionPath, functionHandler) {
    this.request = request;
    this.functionPath = functionPath;
    this.functionHandler = functionHandler;
  }
  async invoke() {
    return new Promise( async (resolve, reject) => {
      try {
        //Build event and context
        const event = this._buildEvent();
        const context = this._buildContext(event, (err, data) => {
          resolve({err, data});
        });
        //Invoke
        const resp = await ((await import(`${this.functionPath}`))[this.functionHandler](event, context));
        if (resp) resolve({data: resp});
      } catch (e) { reject(e); } //forward
    });
  }
  /* private */
  _buildEvent() {
    return {
      body: this.request.payload || null, //enforce key
      headers: this.request.raw ? unflatten(this.request.raw.req.headers, 2) : [],
      httpMethod: this.request.method ? this.request.method.toUpperCase() : null,
      isBase64Encoded: false, // TODO
      multiValueHeaders: parseMultiValueHeaders(
        this.request.raw ? this.request.raw.req.headers || [] : [],
      ),
      multiValueQueryStringParameters: parseMultiValueQueryStringParameters(
        this.request.raw ? this.request.raw.req.url : [],
      ),
      path: this.request.path,
      pathParameters: this.request.params ? nullIfEmpty(this.request.params) : null,
      queryStringParameters: this.request.raw ? parseQueryStringParameters(this.request.raw.req.url) : null,
      requestContext: {
        accountId: (process.env.AWS_ACCOUNT_ID || null),
        apiId: 'TODO',
        authorizer: null,
        domainName: 'TODO',
        domainPrefix: 'TODO',
        extendedRequestId: cuid(),
        httpMethod: this.request.method ? this.request.method.toUpperCase() : null,
        identity: {
          accessKey: null,
          accountId: (process.env.AWS_ACCOUNT_ID || null),
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          sourceIp: this.request.headers ? this.request.headers['x-forwarded-for'] || this.request.info.remoteAddress : null,
          user: null,
          userAgent: this.request.headers ? this.request.headers['user-agent'] : null,
          userArn: null,
        },
        path: this.request.path,
        protocol: 'HTTP/1.1',
        requestId: `${cuid()}-${cuid()}`,
        requestTime: this.request.info ? formatToClfTime(this.request.info.received) : null,
        requestTimeEpoch: this.request.info ? this.request.info.received : null,
        resourceId: 'TODO?',
        resourcePath: Globals.Listener_HTTP_ProxyRoute,
        stage: process.env.STAGE,
      },
      resource: Globals.Listener_HTTP_ProxyRoute,
      stageVariables: null,
    };
  }
  _buildContext(event, callback) {
    return {
      awsRequestId: event.requestContext.requestId,
      callbackWaitsForEmptyEventLoop: true,
      getRemainingTimeInMillis: () => { return 0; }, //TODO
      done: (err, data) => callback(err, data),
      fail: (err) => callback(err),
      succeed: (res) => callback(null, res),
    };
  }
}
