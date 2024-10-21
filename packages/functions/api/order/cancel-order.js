import { z } from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { cancelOrder } from ".";

const reasonSchema = z.object({
	reason: z.string({
		message: "reason required for cancellation",
	}),
});

export const handler = middy(async (event) => {
	let id = event.pathParameters?.id;
	const { reason } = JSON.parse(event.body);

	return await cancelOrder(id,reason);
})
	.use(bodyValidator(reasonSchema))
	.use(errorHandler());
