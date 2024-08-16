import { z } from "zod";

export const optionalParamsValidator = (schema: z.Schema) => ({
	before: (handler: { event: { queryStringParameters: any } }) => {
		const { queryStringParameters } = handler.event;

		const result = schema.safeParse(queryStringParameters);
		if (!result.success) {
			throw new Error("Invalid query parameters");
		}
	},
});
