import { findById } from "../../common/data";
import { Config } from "sst/node/config";
import middy from "@middy/core";
import { errorHandler } from "../util/errorHandler";
import { subtle } from "crypto";

export const handler = middy(async (event) => {
	let id = event.pathParameters?.id;
	if (!id) {
		return {
			statusCode: 400,
			body: JSON.stringify({ message: "id is required" }),
		};
	}
	const orderData = await findById(Config.ORDER_TABLE, id);
	if(!orderData){
		return {
			statusCode: 200,
			body: JSON.stringify({ message: "order doesnt exist" }),
		};	}
	const response = {
		orderId: orderData.id,
		status: orderData.status,
		deliverySlot: orderData.deliverySlot,
		userInfo: {
			number: orderData?.customerNumber || undefined,
			name: orderData?.customerName || undefined,
			id: orderData?.id || undefined,
		},
		paymentDetails: orderData.paymentDetails,
		shippingDetails: {
			address: orderData.address.address,
			zipcode: orderData.address.zipCode,
		},
		items: orderData.items,
		tax: parseInt(orderData.tax).toFixed(2),
		deliveryCharges: parseInt(orderData.deliveryCharges).toFixed(2),
		subTotal: parseInt(orderData.subTotal).toFixed(2),
		createdAt: orderData.createdAt,
		assignedTo: orderData.assigned || undefined,
		totalPrice: parseInt(orderData.totalPrice).toFixed(2),
	};
	return {
		statusCode: 200,
		body: JSON.stringify(response),
	};
}).use(errorHandler());
