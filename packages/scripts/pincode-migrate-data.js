import { findAll, save } from "../functions/common/data.js";

const pincodes = await findAll("prod-promodeagro-admin-pincodeTable");

const slotId = () => {
	return crypto.randomUUID().split("-")[0];
};

pincodes.items.forEach((pincode) => {
	pincode?.shifts.forEach((shift) => {
		shift.slots.forEach((slot) => {
			slot.id = slotId();
		});
	});
});

let i = 0;
for (const pincode of pincodes.items) {
	console.log(`ADDING PINCODES ${i++}`);
	await save("prod-promodeagro-admin-pincodeTable", pincode);
}
