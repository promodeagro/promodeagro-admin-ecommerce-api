import { updateItem } from ".";
import z from "zod";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { categoriesWithSubcategories } from "./add-item";
import { standardizeUnits, getValidUnits, standardizeAttributeUnits } from "./unitUtils";

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
		units: z.string(), // Allow any string, will be standardized
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
	
	// Standardize all unit fields in the request
	const standardizedReq = standardizeUnits(req);
	
	// Standardize attribute if it exists
	if (standardizedReq.attribute) {
		standardizedReq.attribute = standardizeAttributeUnits(standardizedReq.attribute);
	}
	
	// Determine which stock field to use based on stockQuantity value
	const useOverallStock = !standardizedReq.stockQuantity || standardizedReq.stockQuantity === 0 || standardizedReq.stockQuantity === '';
	const finalStockQuantity = useOverallStock ? null : standardizedReq.stockQuantity;
	const finalOverallStock = useOverallStock ? (standardizedReq.overallStock || standardizedReq.stockQuantity || 0) : (standardizedReq.overallStock || 0);

	const updateData = {
		name: standardizedReq.name,
		description: standardizedReq.description,
		category: standardizedReq.category,
		subCategory: standardizedReq.subCategory,
		units: standardizedReq.units, // Already standardized
		// expiry: req.EXPIRY ? new Date(req.EXPIRY).toISOString() : undefined,
		availability: standardizedReq.availability,
		sellingPrice: standardizedReq.sellingPrice,
		// discount: req.DISCOUNT,
		purchasingPrice: standardizedReq.purchasingPrice,
		stockQuantity: finalStockQuantity,
		stockQuantityAlert: standardizedReq.stockQuantityAlert,
		comparePrice: standardizedReq.comparePrice,
		isVariant: standardizedReq.isVariant,
		overallStock: finalOverallStock,
		overallStockUnit: standardizedReq.overallStockUnit,
		attribute: standardizedReq.attribute, // Include standardized attribute
		tags: standardizedReq.tags || [],
		// searchName: req.SEARCH_NAME,
		totalQuantityInB2C: standardizedReq.totalQuantityInB2c,
		totalquantityB2cUnit: standardizedReq.totalquantityB2cUnit, // Already standardized
		images: standardizedReq.images || [],
		image: standardizedReq.image,
		// createdAt: req.CREATEDAT ? new Date(req.CREATEDAT).toISOString() : undefined,
		updatedAt: new Date().toISOString(),
	};
	
	console.log("Standardized units in update:", {
		original: req.units,
		standardized: standardizedReq.units,
		originalB2cUnit: req.TotalquantityB2cUnit,
		standardizedB2cUnit: standardizedReq.totalquantityB2cUnit
	});
	
	await updateItem(id, updateData);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "Item updated successfully" }),
	};
})
	.use(errorHandler());
