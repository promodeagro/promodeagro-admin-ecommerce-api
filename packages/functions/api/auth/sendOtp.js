import { randomInt } from "node:crypto";
import https from "node:https";
import { Config } from "sst/node/config";

export const sendOtp = async (otp, number) => {
	const url = `https://restapi.smscountry.com/v0.1/Accounts/${Config.SMS_AUTH}/SMSes/`;
	const header = Buffer.from(
		`${Config.SMS_AUTH}:${Config.SMS_AUTH_TOKEN}`,
		"utf-8"
	).toString("base64");

	const data = JSON.stringify({
		Text: `${otp} is your OTP to login to Promode Agro Application. Team Promode Agro Farms.`,
		Number: number,
		SenderId: "PROMAG",
		Tool: "API",
	});

	const options = {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: "Basic " + header,
			"Content-Length": data.length,
		},
	};

	return new Promise((resolve, reject) => {
		const req = https.request(url, options, (res) => {
			let responseBody = "";

			res.on("data", (chunk) => {
				responseBody += chunk;
			});

			res.on("end", () => {
				resolve(JSON.parse(responseBody));
			});
		});

		req.on("error", (error) => {
			reject(error);
		});

		req.write(data);
		req.end();
	});
};

export function generateOtp() {
	return randomInt(100000, 999999);
}
