import {
	findAll,
	inventoryByCategory,
	searchInventory,
} from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { list } from "./index";

export const handler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let search = event.queryStringParameters?.search || undefined;
	let category = event.queryStringParameters?.category || undefined;
	let active = event.queryStringParameters?.active || undefined;
	console.log(active);
	// let data = {};
	// if (search) {
	// 	data.items = await searchInventory(search);
	// } else if (category || active) {
	// 	data = await inventoryByCategory(nextKey, category, active);
	// } else {
	const data = await list(nextKey);
	// }
	return {
		statusCode: 200,
		body: JSON.stringify(data),
	};
}).use(errorHandler());
