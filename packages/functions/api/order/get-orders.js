import { findAll } from "../../common/data";
import { Table } from "sst/node/table";

export const handler = async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	try {
		const data = await findAll(Config.ORDER_TABLE, nextKey);
		const res = data.items.map((item) => {
			return {
				id: item.id,
				orderDate: item.createdAt,
				customerName: item.address.name,
				items: item.items.length,
				paymentStatus: item.paymentDetails?.paymentStatus || undefined,
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
