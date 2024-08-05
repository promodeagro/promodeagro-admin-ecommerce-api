const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.getInStockProducts = async () => {
    try {
        // Define the ScanCommand to scan the entire table
        const command = new ScanCommand({
            TableName: process.env.PRODUCTS_TABLE
        });

        // Perform the Scan operation to get all inventory items
        const data = await dynamoDB.send(command);

        // Process the data, unmarshalling each item and filtering for in-stock status
        const inStockItems = data.Items
            .map(item => unmarshall(item))
            .filter(item => item.availability === 'in stock');

        // Return the list of in-stock inventory items
        return {
            statusCode: 200,
            body: JSON.stringify(inStockItems),
        };
    } catch (error) {
        console.error('Error getting in-stock inventory items:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get in-stock inventory items', error: error.message }),
        };
    }
};
