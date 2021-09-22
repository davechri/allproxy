import { makeAutoObservable, action } from "mobx"
import io from "socket.io-client";
import Message, { MessageType } from '../common/Message';
import proxyConfigStore from './ProxyConfigStore';
import { messageQueueStore } from './MessageQueueStore';
import ProxyConfig from '../common/ProxyConfig';
import { metricsStore } from './MetricsStore';
import { mapProtocolToIndex } from './MetricsStore';
import { noCaptureStore } from "./NoCaptureStore";
import { filterStore } from "./FilterStore";
import MessageStore from "./MessageStore";

export default class SocketStore {
	private socket?: SocketIOClient.Socket = undefined;
	private socketConnected: boolean = false;
	private queuedCount: number = 0;
	private requestCount: number = 0;
	private responseCount: number = 0;

	public constructor() {
		makeAutoObservable(this);
		this.connect();
	}

	@action private connect() {
		this.socket = io();

		this.socket.on('connect', () => {
			console.log('socket connected');
			this.setSocketConnected(true);
		});

		this.socket.on('proxy config', (proxyConfigs: ProxyConfig[]) => {
			//console.log('proxy configs', proxyConfigs);
			proxyConfigStore.setProxyConfigs(proxyConfigs);
			proxyConfigStore.load(); // send to server
		});

		this.socket.on('disconnect', () => {
			console.log('socket disconnected');
			this.setSocketConnected(false);
		});

		this.socket.on('error', (e: any) => {
			console.log('socket error', e);
		});

		this.socket.on('reqResJson', (messages: Message[], queuedCount: number, callback: any) => {
			this.queuedCount = queuedCount;
			for (const message of messages) {
				this.countMetrics(message);
			}

			// Filter messages:
			// 1) From clients that are in the No Capture List
			// 2) If delete filtered (X) is selected, and message doesn't match filter criteria
			const filteredMessages = messages.filter(
				message => {
					if (noCaptureStore.contains(message)) return false;
					if (
						filterStore.getFilter().length > 0
						&& filterStore.deleteFiltered()
						&& filterStore.isFiltered(new MessageStore(message))) {
							return false;
					}
					return true;
				}
			);
			messageQueueStore.insertBatch(filteredMessages);

			if (callback) {
				const first = messages[0];
				callback(`${messageTypeTOString(first)} seq=${first.sequenceNumber}`);
			}

			function messageTypeTOString(message: Message): string {
				switch (message.type) {
					case MessageType.REQUEST:
						return 'req';
					case MessageType.RESPONSE:
						return 'res';
					case MessageType.REQUEST_AND_RESPONSE:
						return 'req/res';
				}
				return 'unknown';
			}
		});
	}

	@action private countMetrics(message: Message) {
		const protocol = message.proxyConfig ? message.proxyConfig.protocol : message.protocol;
		const i = mapProtocolToIndex.get(protocol);
		if (i === undefined) {
			console.error(`Unknown protocol ${protocol} for message ${message}`);
			return;
		}

		const row = metricsStore.getMetrics()[i];

		if (message.type === MessageType.REQUEST_AND_RESPONSE
			|| message.type === MessageType.REQUEST) {
			++row.requestCount;
			++this.requestCount;
		}
		if (message.type === MessageType.REQUEST_AND_RESPONSE
			|| message.type === MessageType.RESPONSE) {
			++row.responseCount;
			++this.responseCount;
			row.totalTime += message.elapsedTime;

			if (message.elapsedTime > row.maximumTime) {
				row.maximumTime = message.elapsedTime;
			}

			if (message.elapsedTime < row.minimumTime || row.minimumTime === 0) {
				row.minimumTime = message.elapsedTime;
			}
		}
	}

	@action clearMetrics() {
		this.requestCount = 0;
		this.responseCount = 0;
		metricsStore.clear();
	}

	public getRequestCount() {
		return this.requestCount;
	}

	public getResponseCount() {
		return this.responseCount;
	}

	public getQueuedCount() {
		return this.queuedCount;
	}

	@action setSocketConnected(value: boolean) {
		this.socketConnected = value;
	}

	public isConnected(): boolean {
		return this.socketConnected;
	}

	public emitConfig(event: string, proxyConfig: ProxyConfig[]) {
		this.socket?.emit(event, proxyConfig);
	}
}

export const socketStore = new SocketStore();
