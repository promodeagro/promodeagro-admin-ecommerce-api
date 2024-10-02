import { SSTConfig } from "sst";
import { API } from "./stacks/MyStack";
import { SFStack } from "./stacks/SFStack";
import { AuthStack } from "./stacks/AuthStack";

export default {
	config(_input) {
		return {
			name: "promodeagro-admin",
			region: "ap-south-1",
		};
	},
	stacks(app) {
		if (app.stage !== "prod") {
			app.setDefaultRemovalPolicy("destroy");
		}
		app.stack(AuthStack).stack(API).stack(SFStack);
	},
} satisfies SSTConfig;
