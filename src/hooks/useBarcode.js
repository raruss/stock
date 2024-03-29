import React from 'react';

export default function useBarcode(barcode) {
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
			debugger;
			const result = {
				image: product?.image_front_small_url,
				name: product?.product_name,
			};
		debugger;
			setData(result);
		  });


	}, [barcode]);

	return React.useMemo(() => {
		return {loading, data};
	}, [data, loading]);
}
