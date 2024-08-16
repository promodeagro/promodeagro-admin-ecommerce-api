import { findById } from "../../common/data";
import { Config } from "sst/node/config";

export const handler = async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	try {
		const data = await findById(Config.INVENTORY_TABLE, id);
		return {
			statusCode: 200,
			body: JSON.stringify(data),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error retrieving orders" }),
		};
	}
};
