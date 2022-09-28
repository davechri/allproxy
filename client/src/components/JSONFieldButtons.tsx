import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import Message from '../common/Message';
import { formatJSONPrimaryFields } from '../ImportJSONFile';
import { pickButtonStyle } from '../PickButtonStyle';
import pickIcon from '../PickIcon';
import MessageQueueStore from '../store/MessageQueueStore';
import MessageStore from '../store/MessageStore';
import { snapshotStore } from '../store/SnapshotStore';

export const JSONFieldButtonsHeight = 40;

/**
 * JSON Fields
 */
type Props = {
	messageQueueStore: MessageQueueStore
};
const JSONFieldButtons2 = observer(({ messageQueueStore }: Props): JSX.Element | null => {

	useEffect(() => {
		messageQueueStore.updateJSONFields(snapshotStore.getSelectedSnapshotName(), messageQueueStore.getMessages());
	}, [messageQueueStore])

	if (snapshotStore.getJsonFields(snapshotStore.getSelectedSnapshotName()).length === 0 || messageQueueStore.getMessages().length === 0) return null;

	const iconColor = messageQueueStore.getMessages()[0].getColor();
	const jsonFields = snapshotStore.getJsonFields(snapshotStore.getSelectedSnapshotName());
	return (
		<div className="jsonfieldbuttons" style={{
			maxHeight: `calc(3rem + ${JSONFieldButtonsHeight}px)`,
			overflowY: 'auto'
		}}>

			<div className={pickIcon('log:')}
				style={{ color: iconColor, margin: '0 .5rem' }}></div>
			{
				jsonFields.map((field, i) => (
					<button className={"btn btn-sm " + (field.selected ? "btn-primary" : "btn-secondary")}
						key={field.name}
						style={field.selected ? { margin: ".5rem .25rem", background: pickButtonStyle(field.name).background, color: pickButtonStyle(field.name).color } : { margin: ".5rem .25rem" }}
						onClick={() => {
							jsonFields[i].selected = !jsonFields[i].selected;
							updateRequestTitles(snapshotStore.getSelectedSnapshotName(), messageQueueStore.getMessages());
						}}
					>
						{field.name}
					</button>
				))
			}
		</div >
	)
});

export function updateRequestTitles(snapShotName: string, messages: MessageStore[]) {
	const selectedFields = snapshotStore.getJsonFields(snapShotName);
	const primaryFields: string[] = [];
	for (const f of selectedFields) {
		if (f.selected) {
			primaryFields.push(f.name);
		}
	}
	for (const messageStore of messages) {
		const message = messageStore.getMessage();
		if (message.protocol === 'log:' && typeof message.responseBody !== 'string') {
			const title = makeRequestTitle(messageStore.getMessage(), primaryFields);
			messageStore.setUrl(title);
		}
	}
}

export function makeRequestTitle(message: Message, primaryFields: string[]): string {
	let nonJSON = '';
	const i = message.url?.indexOf('<span');
	if (i !== -1) {
		nonJSON = message.url?.substring(0, i) + ' ';
	}
	if (message.path.length > 0) {
		nonJSON = message.path + ' ' + nonJSON;
	}

	let title = nonJSON +
		formatJSONPrimaryFields(message.responseBody as { [key: string]: string }, primaryFields);
	if (title.length === 0) {
		title = JSON.stringify(message.responseBody);
		if (title.length > 100) {
			title = title.substring(0, 100) + '...';
		}
	}

	return title;
}

function JSONFieldButtons(messageQueueStore: MessageQueueStore) {
	return <JSONFieldButtons2 messageQueueStore={messageQueueStore}></JSONFieldButtons2>
}

export default JSONFieldButtons;