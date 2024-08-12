require("dotenv").config();
const { findAll } = require("../common/data");

module.exports.handler = async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	try {
		const data = await findAll("Orders", nextKey);

		const res = data.items.map((item) => {
			return {
				id: item.id,
				orderDate: item.createdAt,
				customerName: item.address.name,
				items: item.items.length,
				orderStatus: item.status,
				totalAmount: item.totalPrice,
				area: item.address.address,
			};
		});
		return {
			statusCode: 200,
			body: JSON.stringify({
				count: data.count,
				items: res,
				nextKey: data.nextKey,
			}),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error retrieving orders" }),
		};
	}
};
