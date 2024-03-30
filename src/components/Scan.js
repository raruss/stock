import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import {add} from '../db';
import Barcode, {ScanType} from './Barcode';
import useBarcode from '../hooks/useBarcode';
import CircularProgress from '@mui/material/CircularProgress';

const defaultValues = {
	bestBefore: '',
	name: '',
	quantity: 1,
	upc: '',
};

export default function Scan() {
	const [open, setOpen] = React.useState(false);
	const [data, setData] = React.useState(defaultValues);
	const {loading} = useBarcode(data.upc, setData);

	const handleChange = React.useCallback(({target}) => {
		setData({...data, [target.name]: target.value});
	}, [data]);

	const handleClickOpen = () => {
		setOpen(true);
	};

	const handleClose = () => {
		setOpen(false);
		setData(defaultValues);
 	};

	const handleScan = React.useCallback((decodedText) => {
		if (decodedText) {
			setData({...defaultValues, upc: decodedText});
		}
	}, []);

	const handleScanError = React.useCallback((err) => {
		console.log(err);
	}, []);

	const barcode = React.useMemo(() => {
		return (
			<Barcode
				fps={10}
				qrbox={{width: 400, height: 150}}
				qrCodeSuccessCallback={handleScan}
				qrCodeErrorCallback={handleScanError}
				verbose
				supportedScanTypes={[ScanType.SCAN_TYPE_FILE, ScanType.SCAN_TYPE_CAMERA]}
			/>
		);
	}, [handleScanError, handleScan]);

	const handleAdd = React.useCallback(async (event) => {
		event.preventDefault();
		await add(data);
		setOpen(false);
		setData(defaultValues);
	}, [data]);
	return (
		<div>
			<Button variant="outlined" onClick={handleClickOpen}>
				Scan
			</Button>
			<Dialog open={open} onClose={handleClose}>
				<DialogTitle>Add Item</DialogTitle>
				<DialogContent>
					{!data.upc && barcode}
					{loading && <CircularProgress />}
					{data.upc && (
						<form onSubmit={handleAdd}>
							<TextField
								margin="dense"
								id="name"
								name="name"
								label="Name"
								fullWidth
								variant="outlined"
								onChange={handleChange}
								value={data.name}
								required
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
								value={data.quantity}
								required
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
								required
							/>
							<TextField
								margin="dense"
								id="upc"
								name="upc"
								label="UPC"
								fullWidth
								variant="outlined"
								onChange={handleChange}
								value={data.upc}
							/>
						</form>
					)}
					{data.image && <img src={data.image }/>}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleClose}>Cancel</Button>
					<Button type="submit" onClick={handleAdd}>Add</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
	}