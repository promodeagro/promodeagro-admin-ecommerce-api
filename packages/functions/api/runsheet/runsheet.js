import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { createRunsheet, getRunsheet, runsheetList } from ".";

const runsheetSchema = z.object({
	riderId: z.string().uuid(),
	orders: z.array(z.string().uuid()),
});

export const createRunsheetHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await createRunsheet(req);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "created runsheet successfully" }),
	};
})
	.use(bodyValidator(runsheetSchema))
	.use(errorHandler());

export const listRunsheetHandler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
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
