import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
	DynamoDBDocumentClient,
	GetCommand,
	ScanCommand,
	TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
import { findAll, save, update } from "../../common/data";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const pincodeTable = Table.pincodeTable.tableName;

export const deliveryTypes = ["same day", "next day"];

export const createPincode = async (req) => {
	const params = {
		TableName: pincodeTable,
		Key: {
			pincode: req.pincode,
		},
	};
	const exists = await docClient.send(new GetCommand(params));
	if (exists && exists.Item) {
		return {
			statusCode: 400,
			body: JSON.stringify({
				message: "pincode already exists",
			}),
		};
	}
	await save(pincodeTable, req);
	return req;
};

export const updatePincode = async (req) => {
	const pincode = req.pincode;
	delete req.pincode;
	return await update(
		pincodeTable,
		{
			pincode: pincode,
		},
		{
			...req,
		}
	);
};

export const changeActiveStatus = async ({ status, pincodes }) => {
	const batchUpdateParams = {
		// Remove the extra array wrapping around `pincodes.map(...)`
		TransactItems: pincodes.map((pin) => ({
			Update: {
				TableName: pincodeTable,
				Key: { pincode: pin }, // `pin` is directly used here since it's a string
				UpdateExpression: "SET #active = :newStatus",
				ExpressionAttributeNames: { "#active": "active" },
				ExpressionAttributeValues: { ":newStatus": status },
			},
		})),
	};
	return await docClient.send(new TransactWriteCommand(batchUpdateParams));
};

export const changeDeliveryType = async ({ type, pincodes }) => {
	const batchUpdateParams = {
		TransactItems: pincodes.map((pin) => ({
			Update: {
				TableName: pincodeTable,
				Key: { pincode: pin },
				UpdateExpression: "SET #deliveryType = :newType",
				ExpressionAttributeNames: {
					"#deliveryType": "deliveryType",
				},
				ExpressionAttributeValues: { ":newType": type },
			},
		})),
	};
	return await docClient.send(new TransactWriteCommand(batchUpdateParams));
};

export const list = async () => {
	return await findAll(pincodeTable);
};

export const searchPincodes = async (query) => {
	const params = {
		TableName: pincodeTable,
		FilterExpression: "contains(#pincode, :query)",
		ExpressionAttributeNames: {
			"#pincode": "pincode",
		},
		ExpressionAttributeValues: {
			":query": query,
		},
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	return data.Items;
};
