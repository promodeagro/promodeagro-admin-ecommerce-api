import { getByGroupId } from ".";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";

export const handler = middy(async (event) => {
    try {
        const { groupId } = event.pathParameters || {};

        if (!groupId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: "groupId is required"
                })
            };
        }

        const result = await getByGroupId(groupId);

        if (!result) {
            return {
                statusCode: 404,
                body: JSON.stringify({
                    message: "Collection not found"
                })
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error:', error);
        throw error; // Let the errorHandler middleware handle the error
    }
}).use(errorHandler()); 