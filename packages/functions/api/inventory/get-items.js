import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { list, searchByName, searchByItemCode, inventoryByCategory } from ".";

export const handler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let search = event.queryStringParameters?.search || undefined;
	let category = event.queryStringParameters?.category || undefined;
	let active = event.queryStringParameters?.active || undefined;
	console.log(active);
	let data = {};
	if (search) {
		const itemCodeRegex = /^[a-fA-F0-9]+$/;
		if (itemCodeRegex.test(search)) {
			data = await searchByItemCode(search);
		} else {
			data = await searchByName(search);
		}
	} else if (category || active) {
		data = await inventoryByCategory(nextKey, category, active);
	} else {
		data = await list(nextKey);
	}
	return {
		statusCode: 200,
		body: JSON.stringify(data),
	};
}).use(errorHandler());
