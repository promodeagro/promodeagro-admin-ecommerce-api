import { z } from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { assignPacker } from ".";

const assignPackerSChema = z.array(
	z.object({
		orderId: z.string(),
		packerId: z.string(),
	})
);

export const handler = middy(async (event) => {
	const req = JSON.parse(event.body);
	return await assignPacker(req);
})
	.use(bodyValidator(assignPackerSChema))
	.use(errorHandler());
