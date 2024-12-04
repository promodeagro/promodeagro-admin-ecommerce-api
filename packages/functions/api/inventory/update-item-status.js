import z from "zod";
import { Table } from "sst/node/table";
import { update } from "../../common/data";
import middy from "@middy/core";
import { updateItemStatus } from ".";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
// import { updateProductStatus } from ".";

const updateActiveSchema = z.array(
	z.object({
		id: z.string(),
		active: z.boolean(),
	})
);

export const handler = middy(async (event) => {
	const req = JSON.parse(event.body);
	// await updateProductStatus(req);
	return await updateItemStatus(req);
})
	.use(bodyValidator(updateActiveSchema))
	.use(errorHandler());
