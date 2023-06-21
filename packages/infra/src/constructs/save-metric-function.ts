import { Duration } from "aws-cdk-lib";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface SaveMetricFunctionProps {
  readonly queue: IQueue;
  readonly bucket: IBucket;
  readonly cloudTrailRegion: string;
}

export class SaveMetricFunction extends Construct {
  public readonly fn: NodejsFunction;
  constructor(scope: Construct, id: string, props: SaveMetricFunctionProps) {
    super(scope, id);

    const { queue, bucket, cloudTrailRegion } = props;

    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses",
        ],
        resources: ["*"],
      })
    );
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:PutObject"],
        resources: [`arn:aws:s3:::${bucket.bucketName}/*`],
      })
    );

    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["athena:GetQueryExecution"],
        resources: ["*"],
      })
    );

    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Resource::arn:aws:s3:::<AthenaMetricStorageBucket0B481480>/*",
            "Resource::*",
          ],
          reason: "This is not compile time resources",
        },
      ],
      true
    );

    queue.grantSendMessages(role);

    this.fn = new NodejsFunction(this, "Function", {
      entry: "../lambda/src/save-athena-metric.ts",
      role,
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(1),
      environment: {
        CLOUDTRAIL_REGION: cloudTrailRegion,
        BUCKET: bucket.bucketName,
        QUEUE_URL: queue.queueUrl,
      },
      reservedConcurrentExecutions: 1,
    });

    this.fn.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 1,
      })
    );
  }
}
