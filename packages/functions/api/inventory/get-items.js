import { findAll } from "../../common/data";
import { Table } from "sst/node/table";

export const handler = async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	try {
		console.log("name", Table.inventoryTable.tableName);
		const data = await findAll(Table.inventoryTable.tableName, nextKey);
		return {
			statusCode: 200,
			body: JSON.stringify({
				count: data.count,
				items: data.items,
				nextKey: data.nextKey,
			}),
		};
	} catch (error) {
		console.error("Error getting all inventory items:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error retrieving orders" }),
		};
	}
};
