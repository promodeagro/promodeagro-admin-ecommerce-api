import { save, findAll } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { Config } from "sst/node/config";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const ItemSchema = z.object({
	id: z.string(),
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

const updateItem = async (item) => {
	const params = {
		TableName: Config.INVENTORY_TABLE,
		Key: { id: item.id },
		UpdateExpression:
			"SET onlineStorePrice = :osp, purchasingPrice = :pp, stockQuantity = stockQuantity + :aq",
		ExpressionAttributeValues: {
			":osp": item.newOnlineStorePrice,
			":pp": item.newPurchasingPrice,
			":aq": item.adjustQuantity,
		},
		ReturnValues: "ALL_NEW",
	};
	try {
		const command = new UpdateCommand(params);
		const response = await docClient.send(command);
		console.log("Update succeeded:", response.Attributes);
		return response.Attributes;
	} catch (error) {
		console.error("Unable to update item. Error:", error);
		throw error;
	}
};

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
