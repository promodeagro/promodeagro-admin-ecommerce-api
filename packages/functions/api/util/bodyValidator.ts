import { z } from "zod";

export const bodyValidator = (schema: z.Schema) => ({
	before: (handler: { event: { body: any } }) => {
		const { body } = handler.event;
		if (!body) {
			throw new Error("empty request body!");
		}
		const data = JSON.parse(body);
		const result = schema.safeParse(data);
		if (!result.success) {
			const errorMessage = result.error.errors
				.map((err) => `${err.path.join(".")}: ${err.message}`)
				.join("; ");
			throw new Error(`Validation error: ${errorMessage}`);
		}
	},
});
