import ky from "ky";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

export const authorizer = () => ({
	before: async ({ event }) => {
		const token = event.headers["authorization"]?.split(" ")[1];
		if (!token) {
			return {
				statusCode: 403,
				body: "Unauthorized",
			};
		}
		const decodedHeader = jwt.decode(token, { complete: true });
		const kid = decodedHeader?.header.kid;

		if (!kid) {
			return {
				statusCode: 403,
				body: "Unauthorized",
			};
		}

		const keys = await getCognitoKeys();
		const key = keys.find((k) => k.kid === kid);
		const pem = jwkToPem(key);

		const decoded = jwt.verify(token, pem);
	},
});

const getCognitoKeys = async () => {
	const response = await ky.get(
		`https://cognito-idp.ap-south-1.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`
	);
	const { keys } = await response.json();
	return keys;
};
