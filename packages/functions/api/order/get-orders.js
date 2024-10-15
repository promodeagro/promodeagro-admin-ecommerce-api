import { findById, findAllFilter } from "../../common/data";
import { Table } from "sst/node/table";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

export const handler = middy(async (event) => {
	let nextKey = event.queryStringParameters?.pageKey || undefined;
	let status = event.queryStringParameters?.status || undefined;
	let date = event.queryStringParameters?.date || undefined;
	let search = event.queryStringParameters?.search || undefined;
	let data = {};
	if (search) {
		data.items = await checkQuery(search);
	}
	if (date == undefined) {
		date = "7";
	}
	if (!["7", "14", "1m", "2m", "older"].includes(date)) {
		date = "7";
	}
	data = await findAllFilter(Table.OrdersTable.tableName, {
		nextKey,
		status,
		date,
	});
	const itemsArray = Array.isArray(data.items) ? data.items : [data.items];
	const res = itemsArray.map((item) => {
		return {
			id: item.id,
			orderDate: item.createdAt,
			customerName: item.customerName,
			items: item.items.length,
			paymentStatus: item.paymentDetails?.status || undefined,
			paymentType: item.paymentDetails?.method || undefined,
			orderStatus: item.status,
			totalAmount: item.totalPrice,
			assignee: item?.assigned || undefined,
			area: item.address.address,
		};
	});
	return {
		statusCode: 200,
		body: JSON.stringify({
			count: data.count,
			items: res,
			nextKey: data.nextKey,
		}),
	};
}).use(errorHandler());

export async function checkQuery(query) {
	const con = /^\d+$/.test(parseInt(query));
	if (con) {
		return await findById(Table.OrdersTable.tableName, query);
	} else {
		const params = {
			TableName: Table.OrdersTable.tableName,
			FilterExpression:
				"contains(#id, :query) OR contains(#customerName, :query)",
			ExpressionAttributeNames: {
				"#id": "id",
				"#customerName": "customerName",
			},
			ExpressionAttributeValues: {
				":query": query,
			},
		};
		const command = new ScanCommand(params);
		const data = await docClient.send(command);
		return data.Items;
	}
}
