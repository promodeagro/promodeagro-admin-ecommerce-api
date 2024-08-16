import { SSTConfig } from "sst";
import { API } from "./stacks/MyStack";
import { SFStack } from "./stacks/SFStack";

export default {
	config(_input) {
		return {
			name: "promodeargo-admin",
			region: "us-east-1",
		};
	},
	stacks(app) {
		app.stack(API).stack(SFStack);
	},
} satisfies SSTConfig;
