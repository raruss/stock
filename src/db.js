import Dexie from 'dexie';

export const db = new Dexie('stock');
db.version(1).stores({
  items: '++id, upc, bestBefore, name, image, quantity, created',
});

export const add = (item) => {
	console.log('Add-------------');
	console.log(item);
	item.created = new Date();

	return db.items.add(item)
		.then((i) => i)
		.catch((e) => {
			alert ("Error: " + (e.stack || e));
	});
};

export const update = (key, item) => {
	db.items.update(key, item)
		.then((i) => i)
		.catch((e) => {
			alert ("Error: " + (e.stack || e));
	});
};

export const remove = (key) => {
	db.items.delete(key)
		.then((i) => i)
		.catch((e) => {
			alert ("Error: " + (e.stack || e));
	});
};