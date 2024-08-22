import { findById } from "../../common/data";
import { Config } from "sst/node/config";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";

const stepFunctionClient = new SFNClient({ region: "us-east-1" });

export const handler = async (event) => {
	const orderIds = event.queryStringParameters.ids;
	const assignedTo = event.queryStringParameters?.assignee || undefined;
	const idArr = orderIds.split(",");

	try {
		await Promise.all(idArr.map(orderId => processOrder(orderId, assignedTo)));
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "success" }),
		};
	} catch (error) {
		console.error("Error:", error);
		return {
			statusCode: 500,
			body: JSON.stringify({ message: error.message }),
		};
	}
};

const processOrder = async (orderId, assignedTo) => {
	try {
		const response = await findById(Config.ORDER_TABLE, orderId);
		if (!response) {
			throw new Error(`Order not found: ${orderId}`);
		}

		if (response.status === "packed" && !assignedTo) {
			throw new Error(`Assignee not provided for packed order: ${orderId}`);
		}

		if (response.status !== "packed" && assignedTo) {
			throw new Error(`Cannot assign order that is not packed: ${orderId}`);
		}

		const input = {
			output: JSON.stringify({ ...response, assignedTo }),
			taskToken: response.taskToken,
		};
		const tokenCommand = new SendTaskSuccessCommand(input);
		await stepFunctionClient.send(tokenCommand);

		console.log(`Processed order: ${orderId}`);
	} catch (error) {
		console.error(`Error processing order ${orderId}:`, error);
		throw error; // Re-throw the error to ensure it is caught by Promise.all
	}
};