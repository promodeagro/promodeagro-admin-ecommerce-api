import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

export const listRidersHandler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let status = event.queryStringParameters?.status || undefined;
	return await listRiders(status, nextKey);
})
	.use(bodyValidator(patchRiderSchema))
	.use(errorHandler());
