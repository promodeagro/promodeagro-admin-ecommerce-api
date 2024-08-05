const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
require('dotenv').config();

const dynamoDB = new DynamoDBClient({
    region: process.env.REGION
});

module.exports.getAllInventory = async () => {
    try {
        // Define the ScanCommand to scan the entire table
        const command = new ScanCommand({
            TableName: process.env.PRODUCTS_TABLE
        });


        // Perform the Scan operation to get all inventory items
        const data = await dynamoDB.send(command);
        console.log(data);

        // Process the data, unmarshalling each item
        const formattedItems = data.Items.map(item => unmarshall(item));


        // Return the list of inventory items
        return {
            statusCode: 200,
            body: JSON.stringify(formattedItems),
        };
    } catch (error) {
        console.error('Error getting all inventory items:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to get all inventory items', error: error.message }),
        };
    }
};
