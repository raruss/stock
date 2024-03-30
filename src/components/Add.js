import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {defaultValues} from './Scan';
import useBarcode from '../hooks/useBarcode';
import {add} from '../db';

export default function Add(props) {
	const [open, setOpen] = React.useState(false);
	const [data, setData] = React.useState({});
	const [upc, setUpc] = React.useState();
	const {loading} = useBarcode(upc, setData);

	const handleChange = React.useCallback(({target}) => {
		setData({...data, [target.name]: target.value});
	}, [data]);

	const handleCheck = () => {
		setUpc(data.upc);
	};

	const handleClickOpen = () => {
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
		setData(defaultValues);
	};

	const handleAdd = React.useCallback(async  () => {
		await add(data);
		handleClose();
	}, [data]);

	return (
		<div>
			<Button variant="outlined" onClick={handleClickOpen}>
				Add
			</Button>
			<Dialog open={open} onClose={handleClose}>
				<DialogTitle>Add Item</DialogTitle>
				<DialogContent>
				<DialogContentText>
					Add manually item data.
				</DialogContentText>
				<TextField
					margin="dense"
					id="name"
					name="name"
					label="Name"
					fullWidth
					variant="outlined"
					value={data.name}
					onChange={handleChange}
				/>
				<TextField
					margin="dense"
					id="quantity"
					name="quantity"
					label="Quantity"
					fullWidth
					type="number"
					variant="outlined"
					onChange={handleChange}
				/>
				<TextField
					margin="dense"
					id="bestBefore"
					name="bestBefore"
					label="Best Before"
					fullWidth
					type="date"
					variant="outlined"
					onChange={handleChange}
					format="YYYY-MM-DD"
				/>
				<TextField
					margin="dense"
					id="upc"
					name="upc"
					label="UPC"
					fullWidth
					variant="outlined"
					onChange={handleChange}
				/>
				<Button disabled={loading} onClick={handleCheck}>Check</Button>
				{data.image && <img src={data.image }/>}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Cancel</Button>
					<Button onClick={handleAdd}>Add</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
	}