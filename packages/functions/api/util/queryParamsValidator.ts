import { z } from "zod";

export const queryParamsValidator = (schema: z.Schema) => ({
	before: (handler: { event: { queryStringParameters: any } }) => {
		const { queryStringParameters } = handler.event;
		if (!queryStringParameters) {
			throw new Error("query parameters are missing!");
		}
		const result = schema.safeParse(queryStringParameters);
		if (!result.success) {
			throw new Error("Invalid query parameters");
		}
	},
});
