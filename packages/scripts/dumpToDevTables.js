import { findAll, save, update } from "../functions/common/data.js";
// const runsheets = await findAll("prod-promodeagro-admin-runsheetTable");

// let k = 0;
// for (const runsheet of runsheets.items) {
// 	console.log(`ADDING runsheets ${i++}`);
// 	await save("dev-promodeagro-admin-runsheetTable", runsheet);
// }

// const products = await findAll("prod-promodeagro-admin-productsTable");
const orders = await findAll("dev-promodeagro-admin-OrdersTable");

// let i = 0;
// for (const product of products.items) {
// 	console.log(`ADDING PRODUCTS ${i++}`);
// 	await save("dev-promodeagro-admin-productsTable", product);
// }
let s = 0;
const getShift = () => {
	const shift = ["morning", "evening"];
	s = s == 0 ? 1 : 0;
	return shift[s];
};

let j = 0;
for (const order of orders.items) {
	console.log(`ADDING INVENTORY ${j++}`);
	order.deliverySlot.shift = getShift();
	await update(
		"dev-promodeagro-admin-OrdersTable",
		{ id: order.id },
		{
			deliverySlot: order.deliverySlot,
		}
	);
}

// const runsheets = await findAll("prod-promodeagro-admin-OrdersTable");
