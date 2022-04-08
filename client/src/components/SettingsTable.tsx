import SettingsStore from '../store/SettingsStore';
import { observer } from 'mobx-react-lite';
import { ConfigProtocol } from '../common/ProxyConfig';
import {Checkbox} from '@material-ui/core'

type Props = {
	store: SettingsStore,
	protocol: ConfigProtocol,
};
const SettingsTable = observer(({ store, protocol }: Props) => {
	const pathLabel = () => {
		switch (protocol) {
			case 'browser:':
				return 'Paths';
			case 'grpc:':
			case 'mongo:':
			case 'redis:':
			case 'mysql:':
				return 'Source Port';
			case 'http:':
			case 'https:':
				return 'Path';
			case 'log:':
				return 'Command';
			default:
				return 'Port';
		}
	};
	const targetHostLabel = () => {
		switch (protocol) {			
			case 'log:':
				return 'Primary JSON Fields (comma separated)';
			default:
				return 'Target Host';
		}
	};
	const targetPortLabel = () => {
		switch (protocol) {
			case 'browser:':		
			case 'log:':
				return '';
			default:
				return 'Target Port';
		}
	};
	const commentLabel = () => {
		switch (protocol) {			
			case 'log:':
				return 'Case-sensitive Boolean Filter (eg, (a || b) && !c )';
			default:
				return 'Comment';
		}
	};

	return (
		<div style={{height: '100%'}}>
			<table className="table table-compact settings-modal__table">
				{store.getEntries().length > 0 ?
				<thead>
					<tr>
						<td></td>
						<td></td>
						{(protocol === 'grpc:' || protocol === 'tcp:') &&
							<td className="text-primary">Secure?</td>
						}
						<td className="text-primary" style={{width: pathLabel().includes('Port') ? '12ch' : undefined}}><label>{pathLabel()}</label></td>
						{protocol !== 'browser:' && 
						<td className="text-primary"><label>{targetHostLabel()}</label></td>}
						{targetPortLabel() &&
						<td className="text-primary" style={{width: '12ch'}}><label>{targetPortLabel()}</label></td>}
						<td className="text-primary"><label>{commentLabel()}</label></td>
						{protocol !== 'log:' &&
						<td className="text-primary"><label>Status</label></td>}
					</tr>
				</thead>
				: null }
				<tbody>
					{store.getEntries().map((entry, index) => entry.protocol === protocol && (
						<tr className={"settings-modal__proxy-row" + (entry.recording ? '' : ' nocapture')} key = { index }
						>
							<td>
								<button className="settings-modal__proxy-delete-button btn btn-xs btn-danger"
									onClick={ () => store.deleteEntry(index) }
								>
									X
								</button>
							</td>
							<td className="settings-modal__recording-container">
								<div className={'settings__recording fas '
									+ (entry.recording ? 'fa-pause' : 'fa-play')}
									onClick={() => store.toggleEntryCapture(index)}
								/>
							</td>
							{(protocol === 'grpc:' || protocol === 'tcp:') &&
								<td className="settings-modal__secure-container">
									<Checkbox checked={store.isEntrySecure(index)} onChange={() => store.toggleEntryIsSecure(index)}/>
								</td>
							}
							<td className="settings-modal__proxy-path-container"
								style={{width: protocol === 'log:' ? '40vw' : undefined}}
							>
								<input className="form-control settings-modal__proxy-path"
									style={{width: pathLabel().includes('Port') ? '8ch' : undefined}}						
									onChange={ (e) => store.updateEntryPath(index, e.target.value) }
									value={entry.path} />
							</td>
							{protocol === 'browser:' ||
							<td className="settings-modal__proxy-host-container">								
								<input className="form-control settings-modal__proxy-host"									
									onChange={ (e) => store.updateEntryHost(index, e.target.value) }
									value={entry.hostname} />								
							</td>}
							{targetPortLabel().length === 0 ||
							<td className="settings-modal__proxy-host-container">								
								<input className="form-control settings-modal__proxy-port"
									onChange={ (e) => store.updateEntryPort(index, e.target.value) }
									value={entry.port} />
							</td>}
							<td className="settings-modal__proxy-host-container">
								<input className="form-control settings-modal__proxy-comment"
									onChange={ (e) => store.updateComment(index, e.target.value) }
									value={entry.comment} />
							</td>
							<td>								
								<div className="settings-modal__status-container">
									{protocol === 'log:' ||
									<div className={`settings-modal__status fa
										${store.isStatusUpdating()
										? 'updating fa-circle'
										:
											entry.hostReachable
											? 'success fa-circle'
											: 'error fa-exclamation-triangle'}`}>
									</div>}
								</div>
							</td>
					</tr>
					))}
				</tbody>
			</table>
			{store.getEntries().filter(e => e.protocol === protocol).length === 0 && <div className="center">Add new entries below</div>}
		</div>
	);
});

export default SettingsTable;