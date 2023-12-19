import { Checkbox } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import { messageQueueStore } from '../store/MessageQueueStore';
import { isJsonLogTab } from './SideBar';
import { filterStore } from '../store/FilterStore';
import { jsonLogStore } from '../store/JSONLogStore';
import { mainTabStore } from '../store/MainTabStore';

const SideBarSettings = observer((): JSX.Element => {
	return (
		<>
			<hr className="side-bar-divider"></hr>
			<div className="side-bar-item" hidden={isJsonLogTab()}>
				<div>
					<div style={{ display: 'flex' }}>
						<Checkbox className="side-bar-checkbox"
							size="small"
							checked={messageQueueStore.getShowAPI()}
							value={messageQueueStore.getShowAPI()}
							onChange={() => messageQueueStore.toggleShowAPI()} />
						Show API
					</div>
					<div hidden style={{ display: 'flex' }}>
						<Checkbox className="side-bar-checkbox"
							size="small"
							value={messageQueueStore.getShowTooltip()}
							onChange={() => messageQueueStore.toggleShowTooltip()} />
						Show Tooltip
					</div><div style={{ display: 'flex' }}>
						<Checkbox className="side-bar-checkbox"
							size="small"
							value={messageQueueStore.getShowUserAgent()}
							onChange={() => messageQueueStore.toggleShowRequestUA()} />
						Show User Agent
					</div>
				</div>
			</div>

			<div className="side-bar-item" hidden={!isJsonLogTab()}>
				<div>
					<div className="side-bar-checkbox-icon"
						hidden={jsonLogStore.getParsingMethod() === 'auto' || jsonLogStore.isRawJsonChecked()}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={jsonLogStore.isBriefChecked()}
								onChange={() => jsonLogStore.toggleBriefChecked()} />
							<div>Less Detail</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon">
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={jsonLogStore.isRawJsonChecked()}
								onChange={() => jsonLogStore.toggleRawJsonChecked()} />
							<div>Show Raw JSON</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon">
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={mainTabStore.getLayout(mainTabStore.getSelectedTabName())?.isNowrap()}
								onChange={() => mainTabStore.getLayout(mainTabStore.getSelectedTabName())?.toggleNowrap()} />
							<div>No line wrap</div>
						</div>
					</div>
					<div className="side-bar-checkbox-icon" hidden={!filterStore.canDedup()}>
						<div style={{ display: 'flex' }}>
							<Checkbox className="side-bar-checkbox"
								size="small"
								defaultChecked={false}
								value={filterStore.isDedupChecked()}
								onChange={() => filterStore.toggleDedupChecked()} />
							<div>Deduplication</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
});

export default SideBarSettings;