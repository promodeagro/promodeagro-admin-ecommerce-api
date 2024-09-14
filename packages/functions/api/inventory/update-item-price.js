import z from "zod";
import { findById, update } from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { bodyValidator } from "../util/bodyValidator";
import { errorHandler } from "../util/errorHandler";

const reqSchmea = z.array(
	z.object({
			id: z.string(),
			compareAt: z.number().positive(),
			onlineStorePrice: z.number().positive(),
		})
		.refine((ob) => ob.compareAt > ob.onlineStorePrice, {
			message: "compareAt must be greater than onlineStorePrice",
		})
);
export const handler = middy(async (event) => {
	const req = JSON.parse(event.body);
	await Promise.all(
		req.map(async (item) => {
			const product = await findById(
				Table.productsTable.tableName,
				item.id
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
						item.compareAt - item.onlineStorePrice
					),
				}
			);
		})
	);
	return {
		statusCode: 200,
		body: JSON.stringify({ message: "success" }),
	};
})
	.use(bodyValidator(reqSchmea))
	.use(errorHandler());

function calculateUnitPrices(units, price, savings) {
	const prices = [];
	const diffUnits = [250, 500, 1000];
	if (units === "grams") {
		for (const unit of diffUnits) {
			const unitPrice = Math.round((price / 1000) * unit);
			const unitSavings = Math.round((savings / 1000) * unit);
			const discountedPrice = unitPrice - unitSavings;
			prices.push({
				qty: unit,
				mrp: unitPrice,
				savings: unitSavings,
				price: discountedPrice,
			});
		}
	} else {
		prices.push({
			qty: 1,
			price: price,
			savings: savings,
			discountedPrice: price - savings,
		});
	}
	return prices;
}
