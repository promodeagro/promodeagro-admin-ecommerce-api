import { save, findAll } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { updateItem } from ".";

const ItemSchema = z.object({
	id: z.string(),
	itemCode: z.string(),
	name: z.string(),
	stock: z.number().int(),
	currentCompareAtPrice: z.number(),
	currentOnlineStorePrice: z.number(),
	adjustQuantity: z.number().int(),
	newPurchasingPrice: z.number().positive(),
	newOnlineStorePrice: z.number().positive(),
});

const RequestBodySchema = z.object({
	reason: z.string(),
	description: z.string(),
	location: z.string(),
	items: z.array(ItemSchema),
});

export const add = middy(async (event) => {
	const req = JSON.parse(event.body);
	const id = Math.floor(Date.now() / 1000) % 100000;
	const item = {
		id: id.toString(),
		reason: req.reason,
		description: req.description,
		date: new Date().toISOString(),
		// adjustedBy -- TODO
		location: req.location,
		items: JSON.stringify(req.items),
	};
	await save(Table.inventoryModificationTable.tableName, item);
	await Promise.all(req.items.map((item) => updateItem(item)));
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item added successfully" }),
	};
})
	.use(bodyValidator(RequestBodySchema))
	.use(errorHandler());

export const list = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	const data = await findAll(
		Table.inventoryModificationTable.tableName,
		nextKey
	);
	const res = data.items.map((item) => {
		return {
			id: item.id,
			reason: item.reason,
			description: item.description,
			date: item.date,
			// adjustedBy -- TODO
			location: item.location,
			items: JSON.parse(item.items),
		};
	});
	return {
		statusCode: 200,
		body: JSON.stringify({
			count: data.count,
			items: res,
			nextKey: data.nextKey,
		}),
	};
}).use(errorHandler());
