import { DynamoDBClient, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event) => {
	const fallbackValue = 0;
	const [totalProductsCount, activeProducts, inactiveProducts, totalGroups] =
		await Promise.all([
			totalProducts(),
			getActiveProducts(true).catch(() => fallbackValue),
			getActiveProducts(false).catch(() => fallbackValue),
        getTotalGroups().catch(() => fallbackValue),
		]);

	return {
		statusCode: 200,
		body: JSON.stringify({
			totalProducts: totalProductsCount,
			active: activeProducts,
			inactive: inactiveProducts,
        totalGroups: totalGroups,
		}),
	};
};

const getActiveProducts = async (active) => {
	let itemCount = 0;
	let lastEvaluatedKey = undefined;

	do {
		const params = {
			TableName: Table.productsTable.tableName,
			Select: "COUNT",
			FilterExpression: "#availability = :statusValue",
			ExpressionAttributeNames: {
				"#availability": "availability",
			},
			ExpressionAttributeValues: {
				":statusValue": active,
			},
			ExclusiveStartKey: lastEvaluatedKey,
		};

		try {
			const command = new ScanCommand(params);
			const data = await docClient.send(command);

			itemCount += data.Count;
			lastEvaluatedKey = data.LastEvaluatedKey;
		} catch (error) {
			console.error("Error scanning table:", error);
			throw error;
		}
	} while (lastEvaluatedKey);

	return itemCount;
};

const totalProducts = async () => {
	//Best approach for table <2.5gb
	const command = new DescribeTableCommand({
		TableName: Table.productsTable.tableName,
	});
	const response = await docClient.send(command);
	return response.Table.ItemCount;
};

// Add a function to count total groups (unique groupIds)
const getTotalGroups = async () => {
    let lastEvaluatedKey = undefined;
    const groupIdSet = new Set();

    do {
        const params = {
            TableName: Table.productsTable.tableName,
            ProjectionExpression: "groupId, id",
            ExclusiveStartKey: lastEvaluatedKey,
        };
        try {
            const command = new ScanCommand(params);
            const data = await docClient.send(command);
            (data.Items || []).forEach(item => {
                // If groupId exists, use it; otherwise, use id (for single/ungrouped items)
                groupIdSet.add(item.groupId || item.id);
            });
            lastEvaluatedKey = data.LastEvaluatedKey;
        } catch (error) {
            console.error("Error scanning table for groups:", error);
            throw error;
        }
    } while (lastEvaluatedKey);

    return groupIdSet.size;
};
