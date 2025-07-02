import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { Table } from "sst/node/table";

// Initialize DynamoDB clients
const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const orderTableName = Table.OrdersTable.tableName;
const productTableName = Table.productsTable.tableName;


const FREE_DELIVERY_THRESHOLD = 300;
const FREE_DELIVERY_THRESHOLD_HYDERABAD = 100;
const FREE_DELIVERY_ZIP_CODES = ['500086', '500091', '500030', '500093'];
const DEFAULT_DELIVERY_CHARGE = 50;
const HYDERABAD_DELIVERY_CHARGE = 20;

// DynamoDB client configuration


// Helper functions
const calculateDeliveryCharges = (subTotal, zipCode) => {
  if (!zipCode) {
    return {
      charges: subTotal > FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_DELIVERY_CHARGE,
      tag: `Unlock free shipping on purchases over ₹${FREE_DELIVERY_THRESHOLD}`
    };
  }

  if (FREE_DELIVERY_ZIP_CODES.includes(zipCode)) {
    return {
      charges: subTotal > FREE_DELIVERY_THRESHOLD_HYDERABAD ? 0 : HYDERABAD_DELIVERY_CHARGE,
      tag: `Unlock free shipping on purchases over ₹${FREE_DELIVERY_THRESHOLD_HYDERABAD}`
    };
  }

  return {
    charges: subTotal > FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_DELIVERY_CHARGE,
    tag: `Unlock free shipping on purchases over ₹${FREE_DELIVERY_THRESHOLD}`
  };
};


/**
 * Get product details by productId, quantity, and quantityUnits
 */
async function getProductDetails(productId, quantity, quantityUnits) {
  const getProductParams = {
    TableName: productTableName,
    Key: { id: productId },
  };

  const { Item: product } = await docClient.send(new GetCommand(getProductParams));

  if (!product) {
    throw new Error(`Product with ID ${productId} not found`);
  }

  const price = product.sellingPrice;
  const mrp = product.comparePrice;
  const subtotal = price * quantity;
  const mrps = mrp * quantity;
  const savings = mrps - subtotal;

  return {
    product,
    price,
    mrp,
    savings,
    subtotal,
  };
}

/**
 * Find an order by ID
 */
async function findById(tableName, id) {
  const params = {
    TableName: tableName,
    Key: { id },
  };

  const { Item } = await docClient.send(new GetCommand(params));
  return Item || null;
}
export const handler = middy(async (event) => {
  try {
    const body = JSON.parse(event.body);
    const id = event.pathParameters?.id;

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Order ID is required" }),
      };
    }

    const orderData = await findById(orderTableName, id);
    if (!orderData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Order not found" }),
      };
    }

    const {
      removeProductIds = [],
      addItems = [],
      status,
      deliverySlot,
      assigned,
      packerId,
    } = body;

    let existingItems = orderData.items || [];
    let removedItems = orderData.removedItems || [];

    // 🚫 Remove items only if removeProductIds is not empty
    if (removeProductIds.length > 0) {
      const filteredItems = [];
      for (const item of existingItems) {
        if (removeProductIds.includes(item.productId)) {
          // Only push to removedItems if not already there
          if (!removedItems.find(r => r.productId === item.productId)) {
            removedItems.push(item);
          }
        } else {
          filteredItems.push(item);
        }
      }
      existingItems = filteredItems;
    }

    // ➕ Add items only if addItems is not empty
    const newItems = [];
    if (addItems.length > 0) {
      for (const item of addItems) {
        const { productId, quantity, quantityUnits} = item;
        const {
          product,
          price,
          mrp,
          savings,
          subtotal,
        } = await getProductDetails(productId, quantity, quantityUnits);

        const newItem = {
          productId: product.id,
          productName: product.name,
          quantity,
          quantityUnits,
          price,
          mrp,
          savings,
          subtotal,
          productImage: product.image || "",
        };

        // If it's present in removedItems, remove it
        removedItems = removedItems.filter(r => r.productId !== product.id);

        newItems.push(newItem);
      }
    }

    const updatedItems = [...existingItems, ...newItems];

    // Only recalculate subtotal if items changed
    const updatedSubtotal = (removeProductIds.length > 0 || addItems.length > 0)
      ? updatedItems.reduce((sum, item) => sum + item.subtotal, 0)
      : orderData.subtotal;

    const updatedSavings = (removeProductIds.length > 0 || addItems.length > 0)
      ? updatedItems.reduce((sum, item) => sum + item.savings, 0)
      : orderData.savings;




    const totalPrice = updatedSubtotal;
    var finalTotal = updatedSubtotal;

    const { charges: deliveryCharges} = calculateDeliveryCharges(
      totalPrice,
      orderData.address.zipCode
  );

   finalTotal = totalPrice + deliveryCharges


    // 🔧 Build update params
    const expressionAttributeNames = {
      "#status": "status",
    };
    const expressionAttributeValues = {
      ":status": status || orderData.status,
    };

    const updateExpressionParts = ["#status = :status"];

    if (removeProductIds.length > 0 || addItems.length > 0) {
      expressionAttributeNames["#items"] = "items";
      expressionAttributeNames["#removedItems"] = "removedItems";
      expressionAttributeNames["#deliveryCharges"] = "deliveryCharges";

      expressionAttributeValues[":deliveryCharges"] = deliveryCharges;
      expressionAttributeValues[":items"] = updatedItems;
      expressionAttributeValues[":removedItems"] = removedItems;
      expressionAttributeValues[":subTotal"] = totalPrice;
      expressionAttributeValues[":savings"] = updatedSavings;
      expressionAttributeValues[":totalPrice"] = finalTotal;
      expressionAttributeValues[":finalTotal"] = finalTotal;
      

      updateExpressionParts.push(
        "#items = :items",
        "#removedItems = :removedItems",
        "subTotal = :subTotal",
        "savings = :savings",
        "totalPrice = :totalPrice",
        "finalTotal = :finalTotal",
        "#deliveryCharges = :deliveryCharges" 
      );
    }
    
    if (deliverySlot) {
      expressionAttributeNames["#deliverySlot"] = "deliverySlot";
      expressionAttributeValues[":deliverySlot"] = deliverySlot;
      updateExpressionParts.push("#deliverySlot = :deliverySlot");
    }

    if (assigned) {
      expressionAttributeNames["#assigned"] = "assigned";
      expressionAttributeValues[":assigned"] = assigned;
      updateExpressionParts.push("#assigned = :assigned");
    }

    if (packerId) {
      expressionAttributeNames["#packerId"] = "packerId";
      expressionAttributeValues[":packerId"] = packerId;
      updateExpressionParts.push("#packerId = :packerId");
    }

    const updateParams = {
      TableName: orderTableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpressionParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await docClient.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Order updated successfully",
        order: result.Attributes,
      }),
    };

  } catch (error) {
    console.error("Error updating order:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: error.message || "Failed to update order" }),
    };
  }
}).use(errorHandler());
