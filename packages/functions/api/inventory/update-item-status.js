import z from "zod";
import { Table } from "sst/node/table";
import { update } from "../../common/data";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const updateActiveSchema = z.array(
	z.object({
		id: z.string(),
		active: z.boolean(),
	})
);

export const handler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await Promise.all(
		req.map(async (item) => {
			return update(
				Table.productsTable.tableName,
				{ id: item.id },
				{ availability: item.active }
			);
		})
	);
	return {
		statusCode: 200,
		body: JSON.stringify({
			message: "item updated successfully",
		}),
	};
})
	.use(bodyValidator(updateActiveSchema))
	.use(errorHandler());
