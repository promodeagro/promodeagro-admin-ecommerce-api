require("dotenv").config();
const { findAll } = require("../common/data");

module.exports.handler = async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	try {
		const data = await findAll("Inventory", nextKey);
		return {
			statusCode: 200,
			body: JSON.stringify({
				count: data.count,
				items: data.items,
				nextKey: nextKey,
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
