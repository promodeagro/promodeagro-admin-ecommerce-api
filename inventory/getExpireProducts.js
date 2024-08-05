const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.getExpiredProducts = async () => {
    try {
        // Define the ScanCommand to scan the entire table
        const command = new ScanCommand({
            TableName: process.env.PRODUCTS_TABLE
        });

        // Perform the Scan operation to get all inventory items
        const data = await dynamoDB.send(command);

        // Process the data, unmarshalling each item and filtering for expired availability status
        const expiredItems = data.Items
            .map(item => unmarshall(item))
            .filter(item => item.availability === 'expired');

        // Return the list of expired inventory items
        return {
            statusCode: 200,
            body: JSON.stringify(expiredItems),
        };
    } catch (error) {
        console.error('Error getting expired inventory items:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get expired inventory items', error: error.message }),
        };
    }
};
