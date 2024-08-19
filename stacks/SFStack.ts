import { StackContext, use } from "sst/constructs";
import { StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Function } from "sst/constructs";
import { API } from "./MyStack";

export const SFStack = ({ stack }: StackContext) => {
	const { ORDER_TABLE, orderTable } = use(API);

	const orderPlacedFn = new Function(stack, "OrderPlacedFunction", {
		handler: "packages/functions/api/order/order-process.handler",
		permissions: ["dynamodb", orderTable],
		bind: [ORDER_TABLE],
	});

	orderPlacedFn.attachPermissions(["dynamodb:PutItem"]);

	const definition = sfn.Chain.start(
		new tasks.LambdaInvoke(stack, "OrderPlaced", {
			lambdaFunction: orderPlacedFn,
			resultPath: "$",
			integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
			retryOnServiceExceptions: true,
			payload: sfn.TaskInput.fromObject({
				body: sfn.JsonPath.stringAt("$"),
				token: sfn.JsonPath.taskToken,
				stateName: sfn.JsonPath.stringAt("$$.State.Name"),
			}),
		})
	)
		.next(
			new tasks.LambdaInvoke(stack, "Packed", {
				lambdaFunction: orderPlacedFn,
				resultPath: "$",
				integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
				// payloadResponseOnly: true,
				retryOnServiceExceptions: true,
				payload: sfn.TaskInput.fromObject({
					body: sfn.JsonPath.stringAt("$"),
					token: sfn.JsonPath.taskToken,

					stateName: sfn.JsonPath.stringAt("$$.State.Name"),
				}),
			})
		)
		.next(
			new tasks.LambdaInvoke(stack, "OnTheWay", {
				lambdaFunction: orderPlacedFn,
				resultPath: "$",
				integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
				// payloadResponseOnly: true,
				retryOnServiceExceptions: true,
				payload: sfn.TaskInput.fromObject({
					body: sfn.JsonPath.stringAt("$"),
					token: sfn.JsonPath.taskToken,

					stateName: sfn.JsonPath.stringAt("$$.State.Name"),
				}),
			})
		)
		.next(
			new tasks.LambdaInvoke(stack, "Delivered", {
				lambdaFunction: orderPlacedFn,
				resultPath: "$",
				integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
				// payloadResponseOnly: true,
				retryOnServiceExceptions: true,
				payload: sfn.TaskInput.fromObject({
					body: sfn.JsonPath.stringAt("$"),
					stateName: sfn.JsonPath.stringAt("$$.State.Name"),
				}),
			})
		);
	const orderProcessStateMachine = new StateMachine(
		stack,
		"OrderTrackingStateMachine",
		{
			definition,
			stateMachineName: "OrderTrackingStateMachine-" + stack.stage,
		}
	);
};
