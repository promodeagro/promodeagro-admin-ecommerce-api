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
	const updateAttr = {
		status: orderStatus,
	};

	if (event.token !== undefined) {
		updateAttr.taskToken = event.token;
	}
	if (event.body.assignedTo !== undefined) {
		updateAttr.assigned = event.body.assignedTo;
	}
	try {
		const result = await update(
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
