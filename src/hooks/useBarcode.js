import React from 'react';

export default function useBarcode(barcode, onChange) {
	const [loading, setLoading] = React.useState(false);
	const [data, setData] = React.useState(null);

	React.useEffect(() => {
		if (!barcode) {
			return
		}
		setLoading(true);
		const myRequest = new Request(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);

		fetch(myRequest)
		  .then((response) => {
			setLoading(false);
			if (!response.ok) {
			  throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		  })
		  .then(({product}) => {
			const result = {
				image: product?.image_front_small_url,
				name: product?.product_name,
			};
			setData(result);
			onChange((data) => ({...data, ...result}));
		  });


	}, [barcode]);

	return React.useMemo(() => {
		return {loading, data};
	}, [data, loading]);
}
