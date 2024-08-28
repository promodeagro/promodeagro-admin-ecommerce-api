import crypto from "crypto";
import { save } from "../../common/data.js";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
const stepFunctionClient = new SFNClient({ region: "us-east-1" });

const insertOrders = async () => {
	const order = generateRandomOrder();
	await save("Orders", order);
	const input = {
		stateMachineArn:
			"arn:aws:states:us-east-1:851725323791:stateMachine:OrderTrackingStateMachine-prod",
		input: JSON.stringify({ id: order.id }),
	};
	const command = new StartExecutionCommand(input);
	const response = await stepFunctionClient.send(command);
};

function generateRandomOrder() {
	const randomDate = () => new Date().toISOString();
	const randomQuantity = () => Math.floor(Math.random() * 10) + 1;

	// Fixed prices for each product
	const productPrices = {
		Apple: 25,
		Orange: 18,
		Banana: 30,
		Spinach: 15,
		Carrot: 10,
	};

	const productNames = Object.keys(productPrices);

	function getRandomProduct() {
		const name =
			productNames[Math.floor(Math.random() * productNames.length)];
		return {
			productName: name,
			price: productPrices[name],
		};
	}

	const items = [
		{
			quantity: randomQuantity(),
			productId: crypto.randomUUID().split("-")[0],
			...getRandomProduct(),
			quantityUnits: 1,
			category: "Fruits",
			units: "Kgs",
		},
		{
			quantity: randomQuantity(),
			productId: crypto.randomUUID().split("-")[0],
			...getRandomProduct(),
			quantityUnits: 1,
			category: "Vegetables",
			units: "Kgs",
		},
	];

	const calculatedItems = items.map((item) => {
		const mrp = parseFloat(item.price * 1.2).toFixed(2);
		const total = parseFloat(item.price * item.quantity);
		const savings = parseFloat(
			((mrp - item.price) * item.quantity).toFixed(2)
		);
		return { ...item, mrp, total, savings };
	});

	const totalSavings = parseFloat(
		calculatedItems.reduce((sum, item) => sum + item.savings, 0).toFixed(2)
	);
	const tax = 0;
	const deliveryCharges = 0;
	const subTotal = calculatedItems
		.reduce((sum, item) => sum + item.total, 0)
		.toFixed(2);
	const total = tax + deliveryCharges + subTotal;
	const order = {
		id: generateNumericId(),
		totalPrice: parseFloat(total),
		subTotal: parseFloat(subTotal),
		paymentDetails: {
			amount: parseFloat(total).toFixed(2),
			currency: "INR",
			method: "Credit Card",
			transactionId: `txn-${crypto.randomUUID().split("-")[0]}`,
		},
		status: "order placed",
		createdAt: new Date().toISOString(),
		address: {
			zipCode: "500086",
			phoneNumber: "7028132546",
			address: "Sector 1, Himayat sagar, Hyderabad",
			name: "Faiyyaj Qureshi",
			userId: crypto.randomUUID().split("-")[0],
			email: "kureshifaiyyaj7@gmail.com",
			addressId: crypto.randomUUID().split("-")[0],
		},
		items: calculatedItems,
		totalSavings: totalSavings.toFixed(2),
		updatedAt: randomDate(),
		userId: crypto.randomUUID().split("-")[0],
		assigned: "jane_smith",
		deliverySlot: {
			//new Date + 10hours
			startTime: new Date().toDateString() + " 10:00",
			id: crypto.randomUUID().split("-")[0],
			endTime: "17:00",
		},
		tax: 0,
		deliveryCharges: 0,
		test: true,
	};

	return order;
}

(async () => {
	let c = 0;
	for (let i = 0; i < 20; i++) {
		console.log("INSERING NEW ORDER");
		await insertOrders();
		console.log(`INSERTED ${++c} ORDERS`);
		console.log("WAITING FOR 500ms");
		await new Promise((resolve) => setTimeout(resolve, 2000));
	}
})();

// console.log(JSON.stringify(generateRandomOrder()));

function generateNumericId() {
	const part1 = a();
	const part2 = a();
	const s1 = BigInt(`0x${part1}`).toString().slice(0, 7);
	const s2 = BigInt(`0x${part2}`).toString().slice(0, 7);
	return `401-${s1}-${s2}`;
}

function a() {
	return crypto.randomBytes(10).toString("hex");
}
