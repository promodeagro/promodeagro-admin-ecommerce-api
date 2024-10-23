import z from "zod";
import { findById, update } from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";
import { Events } from "./events";
import { v4 as uuidv4 } from "uuid";

export const reqSchmea = z.array(
	z
		.object({
			id: z.string(),
			compareAt: z.number().positive(),
			onlineStorePrice: z.number().positive(),
		})
		.refine((ob) => ob.compareAt > ob.onlineStorePrice, {
			message: "compareAt must be greater than onlineStorePrice",
		})
);
export const handler = middy(async (event) => {
	console.log(1);
	const req = JSON.parse(event.body);
	console.log(2);
	await Promise.all(
		req.map(async (item) => {
			const product = await findById(
				Table.productsTable.tableName,
				item.id
			);
			const InventoryItem = await findById(
				Table.inventoryTable.tableName,
				product.itemCode
			);
			return update(
				Table.inventoryTable.tableName,
				{ id: product.itemCode },
				{
					compareAt: item.compareAt,
					onlineStorePrice: item.onlineStorePrice,
					unitPrices: calculateUnitPrices(
						product.unit,
						item.onlineStorePrice,
						item.compareAt,
						InventoryItem
					),
				}
			);
		})
	);
	console.log(3);
	await Events.PriceUpdate.publish(req);
	console.log(4);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "success" }),
	};
})
	.use(bodyValidator(reqSchmea))
	.use(errorHandler());


// function calculateUnitPrices(units, price, savings, existingUnitPrices) {
// 	const prices = [];
// 	const diffUnits = [250, 500, 1000];

// 	if (existingUnitPrices.unitPrices) {
// 		if (units === "grams") {
// 			for (const unit of diffUnits) {
// 				const existingVariant = existingUnitPrices.find(p => p.qty === unit);
// 				const unitPrice = Math.round((unit / 1000) * price);
// 				const unitCompareAt = Math.round((unit / 1000) * savings);
// 				const discountedSavings = Math.abs(unitPrice - unitCompareAt);

// 				if (existingVariant) {
// 					// Update existing variant
// 					prices.push({
// 						varient_id: existingVariant.varient_id, // Use existing variant ID
// 						qty: unit,
// 						mrp: unitCompareAt,
// 						savings: discountedSavings,
// 						price: unitPrice,
// 					});
// 				} else {
// 					// Create a new variant if it doesn't exist
// 					prices.push({
// 						varient_id: uuidv4(), // Generate a new variant ID
// 						qty: unit,
// 						mrp: unitCompareAt,
// 						savings: discountedSavings,
// 						price: unitPrice,
// 					});
// 				}
// 			}
// 		} else {
// 			const existingVariant = existingUnitPrices.find(p => p.qty === 1);

// 			if (existingVariant) {
// 				// Update existing variant
// 				prices.push({
// 					varient_id: existingVariant.varient_id,
// 					qty: 1,
// 					price: price,
// 					savings: Math.abs(price - savings),
// 					discountedPrice: Math.abs(price - savings),
// 				});
// 			} else {
// 				// Create a new variant if it doesn't exist
// 				prices.push({
// 					varient_id: uuidv4(), // Generate a new variant ID
// 					qty: 1,
// 					price: price,
// 					savings: Math.abs(price - savings),
// 					discountedPrice: Math.abs(price - savings),
// 				});
// 			}

// 		}


// 	} else {

// 		if (units === "grams") {
// 			for (const unit of diffUnits) {
// 				const unitPrice = Math.round((unit / 1000) * price);
// 				const unitCompareAt = Math.round((unit / 1000) * savings);
// 				const discountedSavings = Math.abs(unitPrice - unitCompareAt);

// 				// Create a new variant if it doesn't exist
// 				prices.push({
// 					varient_id: uuidv4(), // Generate a new variant ID
// 					qty: unit,
// 					mrp: unitCompareAt,
// 					savings: discountedSavings,
// 					price: unitPrice,
// 				});
// 			}

// 		} else {
// 			// Create a new variant if it doesn't exist
// 			prices.push({
// 				varient_id: uuidv4(), // Generate a new variant ID
// 				qty: 1,
// 				price: price,
// 				savings: Math.abs(price - savings),
// 				discountedPrice: Math.abs(price - savings),
// 			});
// 		}


// 	}
// 	return prices;
// }
function calculateUnitPrices(units, price, savings, existingUnitPrices) {
	const prices = [];
	const diffUnits = [250, 500, 1000];

	if (existingUnitPrices.unitPrices) {
		if (units === "grams") {
			for (const unit of diffUnits) {
				const existingVariant = existingUnitPrices.unitPrices.find(p => p.qty === 1);
				
				const unitPrice = Math.round((unit / 1000) * price);
				const unitCompareAt = Math.round((unit / 1000) * savings);
				const discountedSavings = Math.abs(unitPrice - unitCompareAt);

				prices.push({
					varient_id: existingVariant.varient_id , // Use existing variant ID or generate a new one
					qty: unit,
					mrp: unitCompareAt,
					savings: discountedSavings,
					price: unitPrice,
				});
			}
		} else {
			const existingVariant = existingUnitPrices.unitPrices.find(p => p.qty === 1);
			const discountedSavings = Math.abs(price - savings);

			prices.push({
				varient_id: existingVariant ? existingVariant.varient_id : uuidv4(), // Use existing variant ID or generate a new one
				qty: 1,
				price: price,
				savings: discountedSavings,
				discountedPrice: discountedSavings,
			});
		}
	} else {
		if (units === "grams") {
			for (const unit of diffUnits) {
				const unitPrice = Math.round((unit / 1000) * price);
				const unitCompareAt = Math.round((unit / 1000) * savings);
				const discountedSavings = Math.abs(unitPrice - unitCompareAt);

				prices.push({
					varient_id: uuidv4(), // Generate a new variant ID
					qty: unit,
					mrp: unitCompareAt,
					savings: discountedSavings,
					price: unitPrice,
				});
			}
		} else {
			const discountedSavings = Math.abs(price - savings);

			prices.push({
				varient_id: uuidv4(), // Generate a new variant ID
				qty: 1,
				price: price,
				savings: discountedSavings,
				discountedPrice: discountedSavings,
			});
		}
	}

	return prices;
}
