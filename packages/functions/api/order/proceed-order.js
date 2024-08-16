import { findById } from "../../common/data";
import { Config } from "sst/node/config";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";

const stepFunctionClient = new SFNClient({ region: "us-east-1" });

export const handler = async (event) => {
	const orderId = event.pathParameters.id;

	try {
		const response = await findById(Config.ORDER_TABLE, orderId);
		if (!response) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "Order not found" }),
			};
		}
		const input = {
			output: JSON.stringify(response),
			taskToken: response.taskToken,
		};
		const tokenCommand = new SendTaskSuccessCommand(input);
		const respone = await stepFunctionClient.send(tokenCommand);

		return {
			statusCode: 200,
			body: JSON.stringify({ message: respone }),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Internal server error" }),
		};
	}
};
