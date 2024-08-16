import middy from "@middy/core";

export const errorHandler = (): middy.MiddlewareObj<any, any> => ({
	onError: (request): void => {
		const { error } = request;
		request.response = {
			statusCode: 500,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
			body: JSON.stringify({
				message: error?.message || "An error occurred",
				error: error,
			}),
		};
	},
});
