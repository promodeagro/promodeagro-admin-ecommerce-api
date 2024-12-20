import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import {
	changeActiveStatus,
	changeDeliveryType,
	createPincode,
	deliveryTypes,
	updatePincode,
	list,
	searchPincodes,
} from ".";
import { authorizer } from "../auth/middleware";

const pincodeSchema = z.object({
	pincode: z.string(),
	deliveryType: z.enum(deliveryTypes),
	active: z.boolean().default(true),
	shifts: z.array(
		z.object({
			name: z.string(),
			slots: z.array(
				z.object({
					start: z.string().time(),
					end: z.string().time(),
				})
			),
		})
	),
});

export const createPincodeHandler = middy(async (event) => {
	const req = pincodeSchema.parse(JSON.parse(event.body));
	return await createPincode(req);
})
	.use(bodyValidator(pincodeSchema))
	.use(errorHandler());

export const updatePincodeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await updatePincode(req);
})
	.use(bodyValidator(pincodeSchema))
	.use(errorHandler());

const changeActiveStatusSchema = z
	.object({
		status: z.boolean(),
		pincodes: z.array(z.string()),
	})
	.refine((ob) => ob.pincodes.length > 0, {
		message: "must provide atleast one pincode",
	});

export const changeActiveStatusHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeActiveStatus(req);
})
	.use(bodyValidator(changeActiveStatusSchema))
	.use(errorHandler());

const changeDeliveryTypeSchema = z
	.object({
		type: z.enum(deliveryTypes),
		pincodes: z.array(z.string()),
	})
	.refine((ob) => ob.pincodes.length > 0, {
		message: "must provide atleast one pincode",
	});

export const changeDeliveryTypeHandler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await changeDeliveryType(req);
})
	.use(bodyValidator(changeDeliveryTypeSchema))
	.use(errorHandler());

export const listhandler = middy(async (event) => {
	let search = event.queryStringParameters?.search || undefined;
	let status = event.queryStringParameters?.status || undefined;
	let type = event.queryStringParameters?.type || undefined;
	if (search) {
		return await searchPincodes(search);
	}
	return await list(status, type);
}).use(errorHandler());
