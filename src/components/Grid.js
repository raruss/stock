import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import {compareAsc, format} from 'date-fns'
import {remove, update} from '../db';
import Edit from './Edit';

export default function Grid({items = []}) {
	const [edit, setEdit] = React.useState();
	items.sort(({bestBefore: a}, {bestBefore: b}) => compareAsc(new Date(a), new Date(b)));
	const products = items.slice(0, 10);

	const handleDelete = React.useCallback((idx) => () => {
		const item = items[idx];
		remove(item.id);
	}, [items]);

	const handleEdit = React.useCallback((idx) => () => {
		const item = items[idx];
		setEdit(item);
	}, [items]);

	const handleUpdate = React.useCallback(({id, ...item}) => {
		update(id, item);
		setEdit(null);
	}, [items]);

	const handleCloseEdit = React.useCallback(() => {
		setEdit(null);
	}, [items]);

	return (
		<>
			<TableContainer component={Paper}>
				<Table sx={{ minWidth: 650 }} aria-label="simple table">
					<TableHead>
					<TableRow>
						<TableCell>Photo</TableCell>
						<TableCell>Best Before</TableCell>
						<TableCell>Name</TableCell>
						<TableCell>Quantity</TableCell>
						<TableCell>Actions</TableCell>
					</TableRow>
					</TableHead>
					<TableBody>
					{products?.map((row, idx) => (
						<TableRow
							key={row.name}
							sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
							>
								<TableCell><img src={row.image} height="50"/></TableCell>
								<TableCell>{format(new Date(row.bestBefore), 'yyyy-MM-dd')}</TableCell>
								<TableCell component="th" scope="row">
									{row.name}
								</TableCell>
								<TableCell>{row.quantity}</TableCell>
								<TableCell>
									<IconButton aria-label="edit" onClick={handleEdit(idx)}>
										<EditIcon />
									</IconButton>
									<IconButton aria-label="delete" onClick={handleDelete(idx)}>
										<DeleteIcon />
									</IconButton>
								</TableCell>
						</TableRow>
					))}
					</TableBody>
				</Table>
			</TableContainer>
			{edit && <Edit data={edit} onUpdate={handleUpdate} onClose={handleCloseEdit}/>}
		</>
	);
}