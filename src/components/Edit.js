import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function Edit({data, onUpdate, onClose}) {
  const [item, setItem] = React.useState(data);

  const handleChange = React.useCallback(({target}) => {
    setItem({...item, [target.name]: target.value});
  }, [item]);

  const handleUpdate = React.useCallback(() => {
	onUpdate(item);
  }, [item]);

	return (
		<div>
			<Dialog open={true} onClose={onClose}>
				<DialogTitle>Edit Item</DialogTitle>
				<DialogContent>
				<DialogContentText>
					Update item data.
				</DialogContentText>
				<TextField
					margin="dense"
					id="name"
					name="name"
					label="Name"
					fullWidth
					variant="outlined"
					onChange={handleChange}
					value={item.name}
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
					value={item.quantity}
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
					value={item.bestBefore}
				/>
				<TextField
					margin="dense"
					id="upc"
					name="upc"
					label="UPC"
					fullWidth
					variant="outlined"
					onChange={handleChange}
					value={item.upc}
				/>
				</DialogContent>
				<DialogActions>
					<Button onClick={onClose}>Cancel</Button>
					<Button onClick={handleUpdate}>Update</Button>
				</DialogActions>
			</Dialog>
		</div>
	);
	}