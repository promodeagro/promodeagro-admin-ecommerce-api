import { z } from "zod";

export const pathParamsValidator = (schema: z.Schema) => ({
	before: (handler: { event: { pathParameters: any } }) => {
		const { pathParameters } = handler.event;
		if (!pathParameters) {
			throw new Error("Path parameters are missing!");
		}
		const result = schema.safeParse(pathParameters);
		if (!result.success) {
			throw new Error("Invalid path parameters");
		}
	},
});
