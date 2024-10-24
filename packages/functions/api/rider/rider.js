import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
	listRiders,
	getRider,
	activateRider,
	verifyDocument,
	rejectDocument,
	rejectRider,
} from ".";
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

const patchRiderSchema = z
	.object({
		status: z.enum(["active", "inactive", "rejected"]),
		reason: z.string().optional(),
	})
	.refine(
		(data) =>
			data.status === "verified" ||
			(data.status === "rejected" && data.reason),
		{
			message: "Reason is required when status is 'rejected'",
			path: ["reason"],
		}
	);

export const patchRiderHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	const req = JSON.parse(event.body);
	if (req.status == "active" || req.status == "inactive") {
		return await activateRider(id, req);
	} else {
		return await rejectRider(id, req);
	}
})
	.use(bodyValidator(patchSchema))
	.use(errorHandler());

const documentQuerySchema = z.object({
	name: z.enum([
		"userPhoto",
		"aadharFront",
		"aadharBack",
		"pan",
		"dl",
		"vehicleImage",
		"rcBook",
	]),
});

const patchDocSchema = z
	.object({
		status: z.enum(["verified", "rejected"]),
		reason: z.string().optional(),
	})
	.refine(
		(data) =>
			data.status === "verified" ||
			(data.status === "rejected" && data.reason),
		{
			message: "Reason is required when status is 'rejected'",
			path: ["reason"],
		}
	);

export const patchDocuemntHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	let document = event.queryStringParameters?.name || undefined;
	const req = JSON.parse(event.body);
	if (req.status === "verified") {
		return await verifyDocument(id, document, req);
	} else {
		return await rejectDocument(id, document, req);
	}
})
	.use(bodyValidator(patchDocSchema))
	.use(queryParamsValidator(documentQuerySchema))
	.use(errorHandler());
