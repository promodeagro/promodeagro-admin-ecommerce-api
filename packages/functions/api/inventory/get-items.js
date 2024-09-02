import {
	findAll,
	inventoryByCategory,
	searchInventory,
} from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";

export const handler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let search = event.queryStringParameters?.search || undefined;
	let category = event.queryStringParameters?.category || undefined;
	let active = event.queryStringParameters?.active || undefined;
	console.log(active);
	let data = {};
	if (search) {
		data.items = await searchInventory(search);
	} else if (category || active) {
		data = await inventoryByCategory(nextKey, category, active);
	} else {
		data = await findAll(Table.inventoryTable.tableName, nextKey);
	}
	return {
		statusCode: 200,
		body: JSON.stringify({
			count: data.count,
			items: data.items,
			nextKey: data.nextKey,
		}),
	};
}).use(errorHandler());
