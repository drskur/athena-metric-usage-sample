import { Duration } from "aws-cdk-lib";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export class MetricQueue extends Construct {
  public readonly queue: Queue;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const dlq = new Queue(this, "DLQ", {
      enforceSSL: true,
    });
    NagSuppressions.addResourceSuppressions(
      dlq,
      [
        {
          id: "AwsSolutions-SQS3",
          reason: "This queue is dead letter queue.",
        },
      ],
      true
    );

    this.queue = new Queue(this, "Queue", {
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
      visibilityTimeout: Duration.minutes(1),
      enforceSSL: true,
    });
  }
}
