import z from "zod";
import { update } from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const reqSchmea = z.array(
	z.object({
		id: z.string(),
		compareAt: z.number().positive(),
		onlineStorePrice: z.number().positive(),
	}).refine((ob) => ob.compareAt > ob.onlineStorePrice, {
		message: "compareAt must be greater than onlineStorePrice",
	})
);
export const handler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await Promise.all(
		req.map((item) => {
			return update(
				Table.inventoryTable.tableName,
				{ id: item.id },
				{
					compareAt: item.compareAt,
					onlineStorePrice: item.onlineStorePrice,
				}
			);
		})
	);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "success" }),
	};
})
	.use(bodyValidator(reqSchmea))
	.use(errorHandler());
