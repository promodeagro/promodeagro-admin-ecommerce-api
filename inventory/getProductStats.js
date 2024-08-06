require("dotenv").config();
const { DynamoDBClient, ScanCommand } = require("@aws-sdk/client-dynamodb");

const dynamoClient = new DynamoDBClient();

module.exports.handler = async (event) => {
    const fallbackValue = -1;
    const [lowStockAlert, publishedStock, expired] = await Promise.all([
        getLowStockAlert().catch(() => fallbackValue),
        getPublishedStock().catch(() => fallbackValue),
        getExpired().catch(() => fallbackValue),
    ]);

    return {
        statusCode: 200,
        body: JSON.stringify({
            "Low Stock Alert": lowStockAlert,
            "Published Stock": publishedStock,
            "Expired": expired,
        }),
    };
};

const getLowStockAlert = async () => {
    return await scanProducts((item) => {
        const firstUnitPrice = item.unitPrices?.L?.[0];
        return item.availability?.BOOL === true && 
                firstUnitPrice && 
                parseInt(firstUnitPrice.M.qty.N) < 100;
    });
};

const getPublishedStock = async () => {
    return await scanProducts((item) => item.availability?.BOOL === true);
};

const getExpired = async () => {
    return await scanProducts((item) => item.availability?.BOOL === false);
};

const scanProducts = async (filterFunction) => {
    let itemCount = 0;
    let lastEvaluatedKey = null;

    do {
        const params = {
            TableName: process.env.PRODUCTS_TABLE,
            ExclusiveStartKey: lastEvaluatedKey,
        };

        try {
            const command = new ScanCommand(params);
            const data = await dynamoClient.send(command);

            itemCount += data.Items.filter(filterFunction).length;
            lastEvaluatedKey = data.LastEvaluatedKey;
        } catch (error) {
            console.error("Error scanning products:", error);
            throw error;
        }
    } while (lastEvaluatedKey);

    return itemCount;
};