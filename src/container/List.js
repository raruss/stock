import * as React from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '../components/Grid';
import Add from '../components/Add';
import Scan from '../components/Scan';
import {db} from '../db';

export default function List() {
	const items = useLiveQuery(
		() => db.items.where('quantity').above(0).toArray(),
		[]
	);
	return (
		<Stack spacing={2}>
			<Grid container spacing={3}>
				<Grid item>
					<Add />
				</Grid>
				<Grid item>
					<Scan />
				</Grid>
			</Grid>
			<Table items={items} />
		</Stack>
	);
}