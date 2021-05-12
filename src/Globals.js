export default class Globals {}

Globals.Listener_HTTP_DefaultPort = 80;
Globals.Listener_HTTP_DefaultHost = 'localhost';
Globals.Listener_HTTP_ProxyRoute = '/{proxy*}';
Globals.Listener_HTTP_DefaultTimeout = 30000;
Globals.Listener_HTTP_DefaultHealthCheckRoute = '/health';
//Resps
Globals.Resp_MSG_EXCEPTION = '[Runtime Proxy]: Exception during request execution!'
Globals.Resp_CODE_EXCEPTION = 'EXEC_EXCEPTION';
Globals.Resp_STATUSCODE_EXCEPTION = 502;

Globals.Resp_MSG_INVALIDRESP = '[Runtime Proxy]: Invalid response from server!'
Globals.Resp_CODE_INVALIDRESP = 'EMPTY_RESPONSE';
Globals.Resp_STATUSCODE_INVALIDRESP = 400;