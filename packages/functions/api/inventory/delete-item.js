import { deleteItemById } from ".";
import { findById } from "../../common/data";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { Table } from "sst/node/table";

export const handler = middy(async (event) => {
	const id = event.pathParameters.id || null;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "product id is required" }),
		};
	}
	const product = await findById(Table.productsTable.tableName, id);
	await Promise.all([
		deleteItemById(Table.productsTable.tableName, id),
		deleteItemById(Table.inventoryTable.tableName, product.itemCode),
	]);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item deleted successfully" }),
	};
}).use(errorHandler());
