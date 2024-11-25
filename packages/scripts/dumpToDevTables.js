import { findAll, save } from "../functions/common/data.js";
// const runsheets = await findAll("prod-promodeagro-admin-runsheetTable");

// let k = 0;
// for (const runsheet of runsheets.items) {
// 	console.log(`ADDING runsheets ${i++}`);
// 	await save("dev-promodeagro-admin-runsheetTable", runsheet);
// }

// const products = await findAll("prod-promodeagro-admin-productsTable");
const inventory = await findAll("prod-promodeagro-admin-inventoryTable");

// let i = 0;
// for (const product of products.items) {
// 	console.log(`ADDING PRODUCTS ${i++}`);
// 	await save("dev-promodeagro-admin-productsTable", product);
// }
let j = 0;
for (const inven of inventory.items) {
	console.log(`ADDING INVENTORY ${j++}`);
	await save("dev-promodeagro-admin-inventoryTable", inven);
}

// const runsheets = await findAll("prod-promodeagro-admin-OrdersTable");
