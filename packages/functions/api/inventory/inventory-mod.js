import crypto from "crypto";
import { save, findAll } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const ItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	stock: z.number().int(),
	compareAtPrice: z.number(),
	onlineStorePrice: z.number(),
	adjustQuantity: z.number().int(),
	purchasingPrice: z.number(),
});

const RequestBodySchema = z.object({
	reason: z.string(),
	description: z.string(),
	location: z.string(),
	items: z.array(ItemSchema),
});

export const add = middy(async (event) => {
	const req = JSON.parse(event.body);
	const uuid = crypto.randomUUID();
	const id = Math.floor(Date.now() / 1000) % 100000;
	const item = {
		id: id,
		reason: req.reason,
		description: req.description,
		date: new Date().toISOString(),
		// adjustedBy -- TODO
		location: req.location,
		items: JSON.stringify(req.items),
	};
	await save(Table.inventoryModificationTable.tableName, item);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item added successfully" }),
	};
})
	.use(bodyValidator(RequestBodySchema))
	.use(errorHandler());

export const getAll = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	const data = await findAll(Config.ORDER_TABLE, nextKey);
	return {
		statusCode: 200,
		body: JSON.stringify({
			count: data.count,
			items: data.items,
			nextKey: data.nextKey,
		}),
	};
}).use(errorHandler());
