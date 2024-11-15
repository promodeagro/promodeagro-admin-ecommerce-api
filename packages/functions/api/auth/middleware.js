import ky from "ky";
import jwt from "jsonwebtoken";

export const authorizer = async (event) => {
	const url = `https://cognito-idp.ap-south-1.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`;
	const response = await ky.get(url);
	const keys = response.data.keys;
	const key = keys.find((k) => k.kid === kid);

	if (!key) {
		throw new Error("Public key not found");
	}

	const token = event.headers["authorization"]?.split(" ")[1];

	if (!token) {
		return res.status(403).json({ message: "No token provided" });
	}

	try {
		const decodedHeader = jwt.decode(token, { complete: true });
		const kid = decodedHeader?.header.kid;

		if (!kid) {
			return res.status(400).json({ message: "Invalid token" });
		}

		const publicKey = await getCognitoPublicKey(kid);

		jwt.verify(
			token,
			publicKey,
			{ algorithms: ["RS256"] },
			(err, decoded) => {
				if (err) {
					return res.status(403).json({ message: "Unauthorized" });
				}

				event.user = decoded;
				next();
			}
		);
	} catch (error) {
		console.error("Error verifying token:", error);
		return res.status(403).json({ message: "Unauthorized" });
	}
};
