import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
	createRunsheet,
	getRunsheet,
	runsheetList,
	closeRunsheet,
	runsheetSearch,
	cashCollectionList,
	cashCollectionSearch,
} from ".";

const runsheetSchema = z.object({
	riderId: z.string().uuid(),
	orders: z.array(z.string()),
});

export const createRunsheetHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await createRunsheet(req);
})
	.use(bodyValidator(runsheetSchema))
	.use(errorHandler());

export const listRunsheetHandler = middy(async (event) => {
	let search = event.queryStringParameters?.search || undefined;
	if (search) {
		return await runsheetSearch(search);
	}
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	console.log(2);
	return await runsheetList(nextKey);
}).use(errorHandler());

export const getRunsheetHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	return await getRunsheet(id);
}).use(errorHandler());

const closeRunsheetSchema = z.object({
	amount: z.number(),
});

export const closeRunsheetHandler = middy(async (event) => {
	const { amount } = JSON.parse(event.body);
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	return await closeRunsheet(id, amount);
})
	.use(bodyValidator(closeRunsheetSchema))
	.use(errorHandler());

export const cashCollectionListHandler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let status = event.queryStringParameters?.status || undefined;
	let search = event.queryStringParameters?.search || undefined;
	if (search) {
		return await cashCollectionSearch(search);
	}
	if (status !== "closed" && status !== "pending") {
		status = "pending";
	}
	return await cashCollectionList(status, nextKey);
}).use(errorHandler());
