import { findById } from "../../common/data";
import { Config } from "sst/node/config";
import { SFNClient, SendTaskSuccessCommand } from "@aws-sdk/client-sfn";

const stepFunctionClient = new SFNClient({ region: "us-east-1" });

export const handler = async (event) => {
	const orderIds = event.queryStringParameters.ids;
	const assignedTo = event.queryStringParameters?.assignee || undefined;
	const idArr = orderIds.split(",");

	try {
		if (idArr.length === 1) {
			console.log("1");
			const response = await findById(Config.ORDER_TABLE, idArr[0]);
			if (!response) {
				return {
					statusCode: 400,
					body: JSON.stringify({ message: "order not found" }),
				};
			}
			if (response.status === "packed" && assignedTo === undefined) {
				return {
					statusCode: 400,
					body: JSON.stringify({ message: "assignee not provided" }),
				};
			}
			if (response.status !== "packed" && assignedTo !== undefined) {
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
			await stepFunctionClient.send(tokenCommand);
		} else {
			await Promise.all(
				idArr.map((orderId) => processOrder(orderId, assignedTo))
			);
		}
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

const processOrder = async (orderId, assignedTo) => {
	try {
		const response = await findById(Config.ORDER_TABLE, orderId);
		if (!response) {
			console.log(`Order not found: ${orderId}`);
			return;
		}
		if (response.status !== "packed" && assignedTo != undefined) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "cannot assign order" }),
			};
		}
		if (response.status === "packed" && assignedTo != undefined) {
			return {
				statusCode: 400,
				body: JSON.stringify({ message: "assignee not provided" }),
			};
		}

		// We're not checking the status here, processing regardless
		const input = {
			output: JSON.stringify({ ...response, assignedTo }),
			taskToken: response.taskToken,
		};
		const tokenCommand = new SendTaskSuccessCommand(input);
		await stepFunctionClient.send(tokenCommand);

		console.log(`Processed order: ${orderId}`);
	} catch (error) {
		console.error(`Error processing order ${orderId}:`, error);
		// We're not rethrowing the error, just logging it
	}
};
