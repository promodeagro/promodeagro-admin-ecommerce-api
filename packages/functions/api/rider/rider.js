import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { listRiders, getRider, activateRider, verifyDocument } from ".";
import { queryParamsValidator } from "../util/queryParamsValidator";

export const listRidersHandler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let status = event.queryStringParameters?.status || undefined;
	return await listRiders(status, nextKey);
}).use(errorHandler());

export const getRiderHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	return await getRider(id);
}).use(errorHandler());

export const activateRiderHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	return await activateRider(id);
}).use(errorHandler());

const documentQuerySchema = z.object({
	document: z.enum([
		"userPhoto",
		"aadharFront",
		"aadharBack",
		"pan",
		"dl",
		"vehicleImage",
		"rcBook",
	]),
});

export const verifyDocumentHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	let document = event.queryStringParameters?.document || undefined;
	return await verifyDocument(id, document);
})
	.use(queryParamsValidator(documentQuerySchema))
	.use(errorHandler());
