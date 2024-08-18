import { findAll } from "../../common/data";
import { Config } from "sst/node/config";

export const handler = async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	try {
		const data = await findAll(Config.INVENTORY_TABLE, nextKey);
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
