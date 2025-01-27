import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";
import { Table } from "sst/node/table";
import { findById, update } from "../../common/data";
import { signup } from "../auth";
import { sendMail } from "../auth/sendMail";

const client = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(client);

const usersTable = Table.promodeagroUsers.tableName;

export const createNewUser = async (req) => {
	const password = generatePass();
	req.password = password;
	await signup(req);
	let mail = {
		to: req.email,
		username: req.email,
		password: password,
	};
	return mail
	// await sendMail(mail);
};

export const listUsers = async (active, role) => {
	const params = {
		TableName: usersTable,
		FilterExpression: "",
		ExpressionAttributeNames: {},
		ExpressionAttributeValues: {},
	};

	if (active) {
		active = active === "true";
		params.FilterExpression = "#s = :active";
		params.ExpressionAttributeNames["#s"] = "active";
		params.ExpressionAttributeValues[":active"] = active;
	}

	if (role) {
		if (params.FilterExpression) {
			params.FilterExpression += " AND #r = :role";
		} else {
			params.FilterExpression = "#r = :role";
		}
		params.ExpressionAttributeNames["#r"] = "role";
		params.ExpressionAttributeValues[":role"] = role;
	}

	if (!params.FilterExpression) {
		delete params.FilterExpression;
		delete params.ExpressionAttributeNames;
		delete params.ExpressionAttributeValues;
	}
	const data = await docClient.send(new ScanCommand(params));
	data.Items = data.Items.map((user) => ({
		id: user.id,
		name: user.name,
		email: user.role === "rider" ? user.personalDetails.email : user.email,
		role: user.role,
		createdAt: user.createdAt,
		active: user.active ?? true,
	}));
	return {
		count: data.Count,
		items: data.Items,
		nextKey: data.nextKey,
	};
};

export const getUser = async (id) => {
	const data = await findById(usersTable, id);
	return {
		id: data.id,
		name: data.name,
		email: data.role === "rider" ? data.personalDetails.email : data.email,
		role: data.role,
		createdAt: data.createdAt,
		active: data.active ?? true,
	};
};
export const changeActiveStatus = async ({ id, active }) => {
	const data = await update(
		usersTable,
		{
			id: id,
		},
		{
			active: active,
		}
	);
	return {
		id: data.id,
		name: data.name,
		email: data.role === "rider" ? data.personalDetails.email : data.email,
		role: data.role,
		createdAt: data.createdAt,
		active: data.active,
	};
};

export const searchByName = async (query) => {
	const params = {
		TableName: usersTable,
		FilterExpression: "contains(#name, :query)",
		ExpressionAttributeNames: {
			"#name": "name",
		},
		ExpressionAttributeValues: {
			":query": query,
		},
	};
	const command = new ScanCommand(params);
	const data = await docClient.send(command);
	const modData = data.Items.map((user) => ({
		id: user.id,
		name: user.name,
		email: user.role === "rider" ? user.personalDetails.email : user.email,
		role: user.role,
		createdAt: user.createdAt,
		active: user.active ?? true,
	}));
	return {
		count: data.Count,
		items: modData,
	};
};

function generatePass(length = 12) {
	const upperCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const lowerCharset = "abcdefghijklmnopqrstuvwxyz";
	const numberCharset = "0123456789";
	const symbolCharset = "!@#$%^&*()_+[]{}|;:',.<>?";
	const allCharset =
		upperCharset + lowerCharset + numberCharset + symbolCharset;

	const getRandomChar = (charset) =>
		charset[crypto.randomInt(0, charset.length)];

	let password = [
		getRandomChar(upperCharset),
		getRandomChar(lowerCharset),
		getRandomChar(numberCharset),
		getRandomChar(symbolCharset),
	];

	for (let i = 4; i < length; i++) {
		password.push(getRandomChar(allCharset));
	}

	password = password.sort(() => crypto.randomInt(0, 2) - 1).join("");

	return password;
}
