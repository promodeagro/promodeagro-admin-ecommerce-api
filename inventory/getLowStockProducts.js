const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.getLowStockProducts = async () => {
    try {
        // Define the ScanCommand to scan the entire table
        const command = new ScanCommand({
            TableName: process.env.PRODUCTS_TABLE
        });

        // Perform the Scan operation to get all inventory items
        const data = await dynamoDB.send(command);

        // Process the data, unmarshalling each item and filtering for low stock
        const lowStockItems = data.Items
            .map(item => unmarshall(item))
            .filter(item => 
                Array.isArray(item.unitPrices) && item.unitPrices.some(unitPrice => unitPrice.qty < 260)
            );

        // Return the list of low stock inventory items
        return {
            statusCode: 200,
            body: JSON.stringify(lowStockItems),
        };
    } catch (error) {
        console.error('Error getting low stock inventory items:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get low stock inventory items', error: error.message }),
        };
    }
};
