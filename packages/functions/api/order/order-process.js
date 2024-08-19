import { update } from "../../common/data";
import { Config } from "sst/node/config";

export const handler = async (event) => {
	const id = event.body.id;
	const state = event.stateName;
	let orderStatus;
	if (state === "OrderPlaced") {
		orderStatus = "order placed";
	} else if (state === "Packed") {
		orderStatus = "packed";
	} else if (state === "OnTheWay") {
		orderStatus = "on the way";
	} else if (state === "Delivered") {
		orderStatus = "delivered";
	}
	try {
		const updateAttr = {
			status: orderStatus,
			taskToken: event.token || null,
			assigned: event.body.assignedTo || null,
		};
		const result = update(
			Config.ORDER_TABLE,
			{
				id: id,
			},
			updateAttr
		);
	} catch (e) {
		console.log(e.message);
	}

	return event.body;
};
