import { findById } from "../../common/data";
import { Config } from "sst/node/config";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";

const stepFunctionClient = new SFNClient({ region: "us-east-1" });

export const handler = async (event) => {
	const orderId = event.pathParameters.id;
	const assignedTo = event.queryStringParameters?.assigneed || undefined;

	try {
		const response = await findById(Config.ORDER_TABLE, orderId);
		if (!response) {
			return {
				statusCode: 404,
				body: JSON.stringify({ message: "Order not found" }),
			};
		}
		if (response.status !== "packed" && assignedTo != undefined) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "cannot assign order" }),
			};
		}
		const input = {
			output: JSON.stringify({ ...response, assignedTo }),
			taskToken: response.taskToken,
		};
		const tokenCommand = new SendTaskSuccessCommand(input);
		const respone = await stepFunctionClient.send(tokenCommand);

		return {
			statusCode: 200,
			body: JSON.stringify({ message: "success" }),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: "Internal server error" }),
		};
	}
};
