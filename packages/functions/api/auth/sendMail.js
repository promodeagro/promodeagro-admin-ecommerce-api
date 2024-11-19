import sgMail from "@sendgrid/mail";
import { Config } from "sst/node/config";

const secretKey = Config.SENDGRID_API_KEY;
sgMail.setApiKey(secretKey);

export const sendMail = async ({ to, username, password }) => {
	const msg = {
		to: to,
		from: "contact.sohailali@gmail.com",
		subject: "Your Login Credentials for Our Application",
		text: `Hello, 
  
Welcome to our platform!

Here are your login credentials:
Username: ${username}
Password: ${password}

Please log in and update your password as soon as possible.

Best regards,
The Support Team`,
		html: `
			<p>Hello,</p>
			<p>Welcome to our platform!</p>
			<p>Here are your login credentials:</p>
			<ul>
				<li><strong>Username:</strong> ${username}</li>
				<li><strong>Password:</strong> ${password}</li>
			</ul>
			<p>Please log in and update your password as soon as possible.</p>
			<p>Best regards,</p>
			<p><strong>The Support Team</strong></p>
		`,
	};

	await sgMail.send(msg);
};
