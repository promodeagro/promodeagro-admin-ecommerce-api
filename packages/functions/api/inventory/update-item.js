import { updateItem } from ".";
import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { categoriesWithSubcategories } from "./add-item";

const updateItemSchema = z
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
		units: z.enum(["pieces", "grams", "kgs", "litres"]),
		expiry: z.string().datetime().optional(),
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
	const id = event.pathParameters.id ?? undefined;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "product id missing" }),
		};
	}
	const updateData = {
		name: req.name,
		description: req.description,
		category: req.category,
		subCategory: req.subCategory,
		units: req.units.toLowerCase(),
		// expiry: req.EXPIRY ? new Date(req.EXPIRY).toISOString() : undefined,
		availability: req.availability,
		sellingPrice: req.sellingPrice,
		// discount: req.DISCOUNT,
		purchasingPrice: req.purchasingPrice,
		stockQuantity: req.stockQuantity,
		stockQuantityAlert: req.stockQuantityAlert,
		comparePrice: req.comparePrice,
		isVariant: req.isVariant,
		minimumSellingWeight: req.minimumSellingWeight,
		minimumSellingWeightUnit: req.MinimumSellingWeightUnit,
		maximumSellingWeight: req.maximumSellingWeight,
		maximumSellingWeightUnit: req.MaximumSellingWeightUnit,
		buyerLimit: req.buyerLimit,
		tags: req.tags || [],
		// searchName: req.SEARCH_NAME,
		totalQuantityInB2C: req.totalQuantityInB2c,
		totalquantityB2cUnit: req.TotalquantityB2cUnit,
		images: req.images  || [],
		image: req.image,
		// createdAt: req.CREATEDAT ? new Date(req.CREATEDAT).toISOString() : undefined,
		updatedAt: new Date().toISOString(),
	};
	await updateItem(id, updateData);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item updated successfully" }),
	};
})
	.use(errorHandler());
