import { createEventBuilder, ZodValidator } from "sst/node/event-bus";
import { reqSchmea } from "./update-item-price";
import z from "zod";

export const event = createEventBuilder({
	bus: "bus",
	validator: ZodValidator,
});

export const Events = {
	PriceUpdate: event(
		"Product.PriceUpdate",
		z.array(
			z
				.object({
					id: z.string(),

					purchasingPrice: z.number().positive(),

					sellingPrice: z.number().positive(),
				})


		)
	),
};
