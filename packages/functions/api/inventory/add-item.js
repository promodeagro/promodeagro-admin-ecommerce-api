import crypto from "crypto";
import { save, itemExits } from "../../common/data";
import z from "zod";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const categoriesWithSubcategories = {
	"Fresh Vegetables": [
		"Daily Vegetables",
		"Leafy Vegetables",
		"Exotic Vegetables",
	],
	"Fresh Fruits": ["Daily Fruits", "Exotic Fruits", "Dry Fruits"],
	"Eggs Meat & Fish": ["Eggs", "Chicken", "Mutton", "Fish"],
	Dairy: ["Milk", "Butter & Ghee", "Paneer & Khowa"],
	Groceries: ["Cooking Oil", "Rice", "Daal", "Spices", "Snacks"],
	"Bengali Special": [
		"Bengali Vegetables",
		"Bengali Groceries",
		"Bengali Home Needs",
	],
};

const inventoryItemSchema = z
	.object({
		name: z.string(),
		description: z.string(),
		category: z.enum([
			"Fresh Vegetables",
			"Fresh Fruits",
			"Eggs Meat & Fish",
			"Dairy",
			"Groceries",
			"Bengali Special",
		]),
		subCategory: z.string(),
		units: z.union(
			[z.literal("pieces"), z.literal("grams"), z.literal("kgs")],
			{
				message: "units must be either 'pieces' or 'grams'",
			}
		),
		purchasingPrice: z.number().positive(),
		msp: z.number().positive(),
		stockQuantity: z.number().int().nonnegative(),
		expiry: z.string().datetime().optional(),
		images: z
			.array(z.string().url())
			.min(1, "at least 1 image is required"),
	})
	.superRefine((data, ctx) => {
		const validSubCategories = categoriesWithSubcategories[data.category];
		if (!validSubCategories.includes(data.subCategory)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Invalid subcategory for ${
					data.category
				}. Valid subcategories are: ${validSubCategories.join(", ")}`,
				path: ["subCategory"],
			});
		}
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
