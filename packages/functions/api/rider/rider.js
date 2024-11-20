import middy from "@middy/core";
import z from "zod";
import {
	activateRider,
	getRider,
	listRiders,
	rejectRider,
	verifyDocument,
} from ".";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

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
	.refine((data) => data.status !== "rejected" || data.reason, {
		message: "Reason is required when status is 'rejected'",
		path: ["reason"],
	});

export const patchRiderHandler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	const req = JSON.parse(event.body);
	console.log(JSON.stringify(req, null, 2));
	if (req.status == "active" || req.status == "inactive") {
		return await activateRider(id, req);
	} else {
		return await rejectRider(id, req);
	}
})
	.use(bodyValidator(patchRiderSchema))
	.use(errorHandler());

const patchDocSchema = z
	.object({
		document: z.enum([
			"bankDetails",
			"userPhoto",
			"aadharFront",
			"aadharback",
			"pan",
			"drivingFront",
			"drivingBack",
			"VehicleImage",
			"rcFront",
			"rcBack",
		]),
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
	const req = JSON.parse(event.body);
	return await verifyDocument(id, req);
})
	.use(bodyValidator(patchDocSchema))
	.use(errorHandler());
