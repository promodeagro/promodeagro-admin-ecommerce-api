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
	subCategory: z.string(),
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
	const exists = await itemExits(Table.productsTable.tableName, req.name);
	if (exists) {
		return {
			statusCode: 409,
			body: JSON.stringify({
				message: "Item with same name already exists",
			}),
		};
	}
	const uuid = crypto.randomUUID();
	const itemCode = uuid.split("-")[0].toUpperCase();
	const productItem = {
		id: uuid,
		itemCode,
		name: req.name,
		search_name: req.name.toLowerCase(),
		description: req.description,
		category: req.category,
		subCategory: req.subCategory,
		unit: req.units.toLowerCase(),
		availability: false,
		image: req.images[0],
		images: req.images || [],
	};
	const inventoryItem = {
		id: itemCode,
		productId: uuid,
		purchasingPrice: Number(req.purchasingPrice),
		msp: Number(req.msp),
		stockQuantity: Number(req.stockQuantity),
		expiry: req.expiry,
	};
	await Promise.all([
		save(Table.inventoryTable.tableName, inventoryItem),
		save(Table.productsTable.tableName, productItem),
	]);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item added successfully" }),
	};
})
	.use(bodyValidator(inventoryItemSchema))
	.use(errorHandler());
