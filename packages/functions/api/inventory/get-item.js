import middy from "@middy/core";
import { findById } from "../../common/data";
import { Table } from "sst/node/table";
import { errorHandler } from "../util/errorHandler";

export const handler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	const data = await findById(Table.inventoryTable.tableName, id);
	return {
		statusCode: 200,
		body: JSON.stringify(data),
	};
}).use(errorHandler());
