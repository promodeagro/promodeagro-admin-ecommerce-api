import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { save } from "../functions/common/data.js";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

function sName(name) {
	return name.trim().toLowerCase().replace(/\s+/g, "");
}

async function allRiders() {
	const params = {
		TableName: "prod-promodeagro-admin-promodeagroUsers",
		FilterExpression: "#role = :riderRole",
		ExpressionAttributeNames: {
			"#role": "role",
		},
		ExpressionAttributeValues: {
			":riderRole": "rider",
		},
	};

	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	return data.Items;
}
try {
	const riders = await allRiders();
	let i = 0;
	riders.forEach(async (rider) => {
		console.log(JSON.stringify(rider, null, 2));
		rider.s_name = sName(rider.name);
		// await save("prod-promodeagro-admin-promodeagroUsers", rider);
		console.log(`SAVING RIDER SEARCH NAME : ${i++}`);
	});
} catch (e) {
	console.log(e.message);
}
