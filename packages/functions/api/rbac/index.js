import crypto from "crypto";
import { signup } from "../auth";
import { sendMail } from "../auth/sendMail";

export const createNewUser = async (req) => {
	const password = generatePass();
	req.password = password;
	await signup(req);
	let mail = {
		to: req.email,
		username: req.email,
		password: password,
	};
	await sendMail(mail);
};

function generatePass(length = 12) {
	const upperCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const lowerCharset = "abcdefghijklmnopqrstuvwxyz";
	const numberCharset = "0123456789";
	const symbolCharset = "!@#$%^&*()_+[]{}|;:',.<>?";
	const allCharset =
		upperCharset + lowerCharset + numberCharset + symbolCharset;

	// Ensure at least one character from each category
	const getRandomChar = (charset) =>
		charset[crypto.randomInt(0, charset.length)];

	let password = [
		getRandomChar(upperCharset),
		getRandomChar(lowerCharset),
		getRandomChar(numberCharset),
		getRandomChar(symbolCharset),
	];

	// Fill the remaining length with random characters from the full charset
	for (let i = 4; i < length; i++) {
		password.push(getRandomChar(allCharset));
	}

	// Shuffle the password to ensure randomness
	password = password.sort(() => crypto.randomInt(0, 2) - 1).join("");

	return password;
}
