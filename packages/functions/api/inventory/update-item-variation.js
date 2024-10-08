import { update } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";

const reqSchmea = z.object({
	compareAt: z.number().positive(),
	onlineStorePrice: z.number().positive(),
});

export const handler = async (event) => {
	const id = event.pathParameters.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	const req = JSON.parse(event.body);
	const parseRes = reqSchmea.safeParse(req);
	if (!parseRes.success) {
		const errorMessage = parseRes.error.errors
			.map((err) => `${err.path.join(".")}: ${err.message}`)
			.join("; ");
		return {
			statusCode: 400,
			body: JSON.stringify({ message: errorMessage }),
		};
	}
	try {
		const item = {
			compareAt: req.compareAt,
			onlineStorePrice: req.onlineStorePrice,
		};
		data = await update(Table.inventoryTable.tableName, { id: id }, item);
		return {
			statusCode: 200,
			body: JSON.stringify({ message: data }),
		};
	} catch (error) {
		console.error("Error adding item to DynamoDB", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Error adding item to inventory" }),
		};
	}
};
