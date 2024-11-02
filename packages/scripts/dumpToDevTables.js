import { findAll, save } from "../functions/common/data.js";
// const products = await findAll("prod-promodeagro-admin-productsTable");
// const inventory = await findAll("prod-promodeagro-admin-inventoryTable");

// let i = 0;
// for (const product of products.items) {
// 	console.log(`ADDING PRODUCTS ${i++}`);
// 	await save("dev-promodeagro-admin-productsTable", product);
// }
// i = 0;
// for (const inven of inventory.items) {
// 	console.log(`ADDING INVENTORY ${i++}`);
// 	await save("dev-promodeagro-admin-inventoryTable", inven);
// }

const orders = await findAll("prod-promodeagro-admin-OrdersTable");

let i = 0;
for (const order of orders.items) {
	console.log(`ADDING ORDERS ${i++}`);
	await save("dev-promodeagro-admin-OrdersTable", order);
}
