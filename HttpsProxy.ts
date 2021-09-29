import url from 'url'
import Global from './server/src/Global'
import ProxyConfig from './common/ProxyConfig'
import Proxy from './node-http-mitm-proxy'
import HttpMessage from './server/src/HttpMessage'

/**
 * Important: This module must remain at the project root to properly set the document root for the index.html.
 */
export default class HttpsProxy {
  onRequest (proxy: Proxy.IProxy) {
    proxy.onRequest(async function (ctx, callback) {
      ctx.use(Proxy.gunzip)

      const clientReq = ctx.clientToProxyRequest
      const clientRes = ctx.proxyToClientResponse
      // Global.log(ctx);

      const sequenceNumber = ++Global.nextSequenceNumber
      const remoteAddress = clientReq.socket.remoteAddress

      const reqHeaders = ctx.proxyToServerRequestOptions.headers
      const connectRequest = Object.keys((ctx as any).connectRequest).length > 0
      if (connectRequest) {
        const host = reqHeaders.host
        clientReq.url = 'https://' + host + clientReq.url
      }

      // eslint-disable-next-line node/no-deprecated-api
      const reqUrl = url.parse(clientReq.url ? clientReq.url : '')

      Global.log(sequenceNumber, remoteAddress + ': ', clientReq.method, clientReq.url)

      Global.log(reqUrl.protocol, reqUrl.pathname, reqUrl.search)

      // Find matching proxy configuration
      let proxyConfig

      const clientHostName = await Global.resolveIp(clientReq.socket.remoteAddress)
      if (!connectRequest) {
        proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl)
        if (proxyConfig !== undefined) {
          ctx.proxyToServerRequestOptions.headers.host = proxyConfig.hostname
          clientReq.url = 'https://' + proxyConfig.hostname + clientReq.url
        }
      } else {
        proxyConfig = Global.socketIoManager.findProxyConfigMatchingURL('https:', clientHostName, reqUrl)
        // Always proxy forward proxy requests
        if (proxyConfig === undefined) {
          proxyConfig = new ProxyConfig()
          proxyConfig.path = reqUrl.pathname!
          proxyConfig.protocol = reqUrl.protocol!
          proxyConfig.hostname = reqUrl.hostname!
          proxyConfig.port = reqUrl.port === null
            ? reqUrl.protocol === 'http:' ? 80 : 443
            : +reqUrl.port
        }
      }

      const httpMessage = new HttpMessage(
        proxyConfig,
        sequenceNumber,
        remoteAddress!,
        clientReq.method!,
        clientReq.url!,
        reqHeaders
      )

      if (proxyConfig === undefined) {
        const msg = 'No matching proxy configuration found for ' + reqUrl.pathname
        Global.log(sequenceNumber, msg)
        ctx.proxyToClientResponse.end('404 ' + msg)
        httpMessage.emitMessageToBrowser(msg)
      } else {
        proxyRequest()
      }

      callback()

      function proxyRequest () {
        // Global.log(sequenceNumber, 'proxyRequest');

        clientReq.on('close', function () {
          Global.log(sequenceNumber, 'Client closed connection')
        })

        clientReq.on('error', function (error) {
          Global.error(sequenceNumber, 'Client connection error', JSON.stringify(error, null, 2))
        })

        clientRes.on('error', function (error) {
          Global.error(sequenceNumber, 'Server connection error', JSON.stringify(error, null, 2))
          httpMessage.emitMessageToBrowser(JSON.stringify(error, null, 2))
        })

        let reqChunks: string = ''
        ctx.onRequestData(function (_ctx, chunk, callback) {
          // Global.log('request data length: ' + chunk.length);
          reqChunks += chunk.toString()
          return callback(undefined, chunk)
        })

        ctx.onRequestEnd(function (_ctx, callback) {
          httpMessage.emitMessageToBrowser(reqChunks)
          return callback()
        })

        ctx.onResponse(function (ctx, callback) {
          // Global.log('RESPONSE: http://' + ctx.clientToProxyRequest.headers.host + ctx.clientToProxyRequest.url);

          let resChunks: string = ''
          ctx.onResponseData(function (_ctx, chunk, callback) {
            // Global.log('response data length: ' + chunk.length);
            resChunks += chunk.toString()
            return callback(undefined, chunk)
          })

          ctx.onResponseEnd(function (ctx, callback) {
            httpMessage.emitMessageToBrowser(
              reqChunks,
              ctx.serverToProxyResponse.statusCode,
              ctx.serverToProxyResponse.headers,
              resChunks
            )
            return callback()
          })

          return callback()
        })
      }
    })
  }
}
