import crypto from "crypto";
import { save, itemExits } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const inventoryItemSchema = z.object({
	name: z.string(),
	description: z.string(),
	category: z.string(),
	units: z.union([z.literal("pieces"), z.literal("grams")], {
		message: "units must be either 'pieces' or 'grams'",
	}),
	purchasingPrice: z.number().positive(),
	msp: z.number().positive(),
	stockQuantity: z.number().int().nonnegative(),
	expiry: z.string().datetime(),
	images: z.array(z.string().url()).min(1, "at least 1 image is required"),
});

export const handler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await itemExits(Table.inventoryTable.tableName, req.name.toLowerCase());
	const uuid = crypto.randomUUID();
	const itemCode = uuid.split("-")[0].toUpperCase();
	const item = {
		id: uuid,
		itemCode,
		name: req.name.toLowerCase(),
		description: req.description,
		category: req.category,
		units: req.units,
		purchasingPrice: Number(req.purchasingPrice),
		msp: Number(req.msp),
		active: false,
		stockQuantity: Number(req.stockQuantity),
		expiry: req.expiry,
		updatedAt: new Date().toISOString(),
		images: req.images || [],
	};
	await save(Table.inventoryTable.tableName, item);

	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item added successfully" }),
	};
})
	.use(bodyValidator(inventoryItemSchema))
	.use(errorHandler());
