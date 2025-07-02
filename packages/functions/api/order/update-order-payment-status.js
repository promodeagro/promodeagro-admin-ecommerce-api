const { DynamoDB } = require('aws-sdk');
const dynamodb = new DynamoDB.DocumentClient();
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { Table } from "sst/node/table";

// Initialize DynamoDB clien
const orderTableName = Table.OrdersTable.tableName;
export const handler = middy(async (event) => {
    try {
        const { orderId, paymentStatus } = JSON.parse(event.body);

        // Validate input
        if (!orderId || !paymentStatus) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Order ID and payment status are required'
                })
            };
        }

        // Validate payment status values
        if (!['PAID', 'PENDING'].includes(paymentStatus)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Payment status must be either PAID or PENDING'
                })
            };
        }

        // Update the payment status
        const params = {
            TableName: orderTableName,
            Key: {
                id: orderId
            },
            UpdateExpression: 'SET paymentDetails.#status = :paymentStatus, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':paymentStatus': paymentStatus,
                ':updatedAt': new Date().toISOString()
            },
            ReturnValues: 'ALL_NEW'
        };

        const result = await dynamodb.update(params).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Payment status updated successfully',
                order: result.Attributes
            })
        };

    } catch (error) {
        console.error('Error updating payment status:', error);
        throw error;
    }
}).use(errorHandler());
