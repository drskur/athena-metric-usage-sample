import { Duration, Stack } from "aws-cdk-lib";
import {
  Effect,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface QueryExecutionIdFunctionProps {
  readonly queue: IQueue;
}

export class QueryExecutionIdFunction extends Construct {
  public readonly fn: NodejsFunction;

  constructor(
    scope: Construct,
    id: string,
    props: QueryExecutionIdFunctionProps
  ) {
    super(scope, id);
    const { queue } = props;

    const CloudtrailRegion = "us-east-1";
    const AthenaResultBucket =
      "aws-athena-query-results-443892063838-us-east-1";
    const CloudTrailBucket =
      "cloudtrail-awslogs-443892063838-z4rtnsvh-isengard-do-not-delete";
    const CloudTrailTableName =
      "cloudtrail_logs_cloudtrail_awslogs_443892063838_z4rtnsvh_isengard_do_not_delete";

    const role = new Role(this, "Role", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
        ],
        resources: ["*"],
      })
    );
    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: ["Resource::*"],
          reason: "Athena permission will be managed by Lake Formation",
        },
      ],
      true
    );
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:ListMultipartUploadParts",
          "s3:AbortMultipartUpload",
          "s3:CreateBucket",
          "s3:PutObject",
        ],
        resources: [
          "arn:aws:s3:::aws-athena-query-results*",
          `arn:aws:s3:::${CloudTrailBucket}`,
          `arn:aws:s3:::${CloudTrailBucket}/*`,
        ],
      })
    );
    NagSuppressions.addResourceSuppressions(
      role,
      [
        {
          id: "AwsSolutions-IAM5",
          appliesTo: [
            "Resource::arn:aws:s3:::aws-athena-query-results*",
            `Resource::arn:aws:s3:::${CloudTrailBucket}/*`,
          ],
          reason: "This is not compile time resource",
        },
      ],
      true
    );
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["glue:GetTable"],
        resources: [
          `arn:aws:glue:${CloudtrailRegion}:${Stack.of(this).account}:catalog`,
          `arn:aws:glue:${CloudtrailRegion}:${
            Stack.of(this).account
          }:database/default`,
          `arn:aws:glue:${CloudtrailRegion}:${
            Stack.of(this).account
          }:table/default/${CloudTrailTableName}`,
        ],
      })
    );

    queue.grantSendMessages(role);

    this.fn = new NodejsFunction(this, "Function", {
      entry: "../lambda/src/query-execution-id.ts",
      role,
      runtime: Runtime.NODEJS_18_X,
      timeout: Duration.minutes(1),
      environment: {
        CLOUDTRAIL_REGION: CloudtrailRegion,
        ATHENA_OUTPUT: `s3://${AthenaResultBucket}/`,
        QUEUE_URL: queue.queueUrl,
      },
    });
  }
}
