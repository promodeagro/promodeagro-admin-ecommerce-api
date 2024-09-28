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
	await updateItem(id, req);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item updated successfully" }),
	};
})
	.use(bodyValidator(updateItemSchema))
	.use(errorHandler());
