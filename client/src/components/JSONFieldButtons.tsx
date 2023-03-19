import { TableSortLabel } from '@material-ui/core';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import Message from '../common/Message';
import { pickButtonStyle } from '../PickButtonStyle';
import pickIcon from '../PickIcon';
import { getJSONFields } from '../store/JSONFieldsStore';
import MessageQueueStore from '../store/MessageQueueStore';
import MessageStore from '../store/MessageStore';
import { snapshotStore } from '../store/SnapshotStore';
import { sortOrderHandler } from './SortBy';

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
		<div style={{
			maxHeight: `calc(${JSONFieldButtonsHeight}px)`,
			overflowY: 'auto'
		}}>

			<div className={pickIcon('log:')}
				style={{ color: iconColor, margin: '0 .5rem' }}></div>
			{
				jsonFields.map((field, i) => (
					<span style={{ whiteSpace: "nowrap" }}>
						<button className={"btn btn-sm " + (messageQueueStore.getSortByField() === field.name ? "" : "btn-secondary")}
							key={field.name}
							style={{
								margin: ".5rem 0", marginLeft: ".25rem", padding: "0",
								background: messageQueueStore.getSortByField() === field.name ? pickButtonStyle(field.name).background : undefined
							}}
							hidden={!field.selected}
							onClick={() => sortOrderHandler(field.name)}
							title={`Sort by ${field.name}`}
						>
							<TableSortLabel active={messageQueueStore.getSortByField() === field.name}
								direction={messageQueueStore.getSortOrder()}></TableSortLabel>
						</button>
						<button className={"btn btn-sm " + (field.selected ? "" : "btn-secondary")}
							key={field.name}
							style={field.selected ?
								{ margin: ".5rem 0", marginRight: ".25rem", background: pickButtonStyle(field.name).background, color: pickButtonStyle(field.name).color } :
								{ margin: ".5rem .25rem" }}
							onClick={() => {
								jsonFields[i].selected = !jsonFields[i].selected;
								updateRequestTitles(snapshotStore.getSelectedSnapshotName(), messageQueueStore.getMessages());
								if (messageQueueStore.getSortByField() === field.name) {
									messageQueueStore.setSortByField(undefined);
									messageQueueStore.setSortOrder('asc');
									messageQueueStore.sortOrderChanged();
								}
							}}
						>
							{field.name}
						</button>
					</span>
				))
			}
		</div >
	)
});

export async function updateRequestTitles(snapShotName: string, messages: MessageStore[]) {
	const selectedFields = snapshotStore.getJsonFields(snapShotName);
	const primaryFields: string[] = [];
	for (const f of selectedFields) {
		if (f.selected) {
			primaryFields.push(f.name);
		}
	}
	// Custom JSON fields
	const customJsonFields: string[] = await getJSONFields();
	for (const messageStore of messages) {
		const message = messageStore.getMessage();
		if (message.protocol === 'log:' && typeof message.responseBody !== 'string') {
			const title = makeRequestTitle(messageStore.getMessage(), primaryFields, customJsonFields);
			messageStore.setUrl(title);
		}
	}
}

export function makeRequestTitle(message: Message, primaryFields: string[], customJsonFields: string[]): string {
	let title = formatJSONPrimaryFields(message.responseBody as { [key: string]: string }, primaryFields, customJsonFields);
	if (title.length === 0) {
		// Look for embedded JSON object
		let nonJson = message.path ? message.path + ' ' : '';

		title = nonJson + JSON.stringify(message.responseBody);
		// if (title.length > 200) {
		// 	title = title.substring(0, 200) + '...';
		// }
	}

	return title;
}

function JSONFieldButtons(messageQueueStore: MessageQueueStore) {
	return <JSONFieldButtons2 messageQueueStore={messageQueueStore}></JSONFieldButtons2>
}

function getFieldCombos(field: string): string[] {
	const combos: string[] = [field];
	function doCombos(fields: string[], i: number) {
		const field = fields[i];

		// all lowercase
		if (field !== fields[i].toLowerCase()) {
			fields[i] = fields[i].toLowerCase();
			combos.push(fields.join('.'))
		}
		if (i + 1 < fields.length) doCombos(fields, i + 1)

		// uppercase first char
		const camel = fields[i].substring(0, 1).toUpperCase() + fields[i].substring(1)
		if (field !== camel) {
			fields[i] = camel;
			combos.push(fields.join('.'))
		}
		if (i + 1 < fields.length) doCombos(fields, i + 1)

		// all uppercase
		if (field !== fields[i].toUpperCase()) {
			fields[i] = fields[i].toUpperCase()
			combos.push(fields.join('.'))
		}
		if (i + 1 < fields.length) doCombos(fields, i + 1)
	}
	doCombos(field.split('.'), 0);
	//console.log(combos);

	return combos;
}

function formatJSONPrimaryFields(json: { [key: string]: string }, primaryJsonFields: string[], customJsonFields: string[]): string {
	let title = '';
	const fields = primaryJsonFields.concat(customJsonFields);
	fields.forEach((field) => {
		let value: string | number | undefined = undefined;
		if (Object.keys(json).length > 0) {
			const combos = getFieldCombos(field)
			for (const combo of combos) {
				try {
					value = eval('json.' + combo);
				} catch (e) {
					continue;
				}
				if (value === undefined || (typeof value !== 'string' && typeof value !== 'number')) return;
				break;
			}
			if (value == undefined) return;
		}

		if (field !== 'PREFIX') {
			if (title.length > 0) title += ' ';
			const style = pickButtonStyle(field);
			title += `<span style="color: white; background:${style.background};padding: 0 .25rem;border-radius: .25rem;border:${style.background} thin solid">`
				+ field +
				'</span> ';
		}
		if (value === '') value = `""`
		title += value;
	})

	return title;
}

export default JSONFieldButtons;