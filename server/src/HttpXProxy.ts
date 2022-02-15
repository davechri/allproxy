import net from 'net';
import listen from './Listen';
import HttpConnectHandler, { HttpVersion } from './HttpConnectHandler';
import HexFormatter from './formatters/HexFormatter';
import Https1Server from './Https1Server';
import Global from './Global';
import Https2Server from './Https2Server';
import Http1Server from './Http1Server';

// const GRPC_PORT = 11111;

export default class HttpXProxy {
  private server: net.Server;
  private httpsServer = Global.useHttp2
    ? new Https2Server('allproxy', 'reverse')
    : new Https1Server('allproxy', 'reverse');

  private http1Port = 0;
  
  public static start (port: number, hostname?: string): HttpXProxy {
    return new HttpXProxy(port, hostname);
  }

  constructor (port: number, hostname?: string) {
    this.startServers();
    this.httpsServer.start();
    Http1Server.start(0, hostname)
      .then((port) => {
        this.http1Port = port;
      });

    this.server = net.createServer(this.onConnect.bind(this));
    listen('HttpXProxy', this.server, port, hostname);
    // GrpcProxy.forwardProxy(GRPC_PORT, false);
  }

  private async startServers () {
    await HttpConnectHandler.start(Global.useHttp2 ? HttpVersion.HTTP2 : HttpVersion.HTTP1);
  }

  private onConnect (httpXSocket: net.Socket) {
    Global.log('HttpXProxy onConnect');
    let done = false;
    const onData = async (data: Buffer) => {
      if (!done) {
        const line1 = data.toString().split('\r\n')[0];        
        if (line1.startsWith('CONNECT')) {
          console.log(line1);
          HttpConnectHandler.doConnect(httpXSocket, data);
        } else if (this.isClientHello(data)) {
          Global.log('HttpXProxy client hello:\n', HexFormatter.format(data));
          const httpsServerSocket = net.connect(this.httpsServer.getPort(), undefined, () => {
            Global.log('HttpXProxy connected to httpsServer');
            httpsServerSocket.write(data);
            httpsServerSocket.pipe(httpXSocket);
            httpXSocket.pipe(httpsServerSocket);
          });        
        } else { // Assume this is just HTTP in the clear  
          console.log(line1);        
          // const port = line1.endsWith('HTTP/1.0') || line1.endsWith('HTTP/1.1')
          //   ? this.http1Port
          //   : GRPC_PORT;          
          Global.log('HttpXProxy http:\n', HexFormatter.format(data));
          const httpServerSocket = net.connect(this.http1Port, undefined, () => {
            Global.log('HttpXProxy connected to httpServer');
            httpServerSocket.write(data);
            httpServerSocket.pipe(httpXSocket);
            httpXSocket.pipe(httpServerSocket);
          });
        }
        httpXSocket.off('data', onData);
        done = true;
      }
    };

    httpXSocket.on('data', onData);
  }

  private isClientHello (data: Buffer) {
    return data[0] === 0x16 && data[1] === 0x03 && data[2] === 0x01;
  }
}
