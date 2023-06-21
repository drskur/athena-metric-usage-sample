/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import * as process from "process";
import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryExecutionOutput,
  QueryExecutionState,
} from "@aws-sdk/client-athena";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Handler, SQSEvent } from "aws-lambda";

// Message Sample
// {
//   "query_id": "b838c7b6-1434-4728-99b4-b64a8580d53a",
//   "uid": "arn:aws:sts::443892063838:assumed-role/Dev-AthenaMetricApplicati-QueryExecutionIdFunction-13AYKL9HRAOLY/Dev-AthenaMetricApplicati-QueryExecutionIdFunction-eef53DJ38zBW",
//   "account_id": "443892063838",
//   "role": "Dev-AthenaMetricApplicati-QueryExecutionIdFunction-13AYKL9HRAOLY",
//   "dt": "2023-06-21 09:38:10.000 UTC"
// }
interface QueueMessage {
  query_id: string;
  uid: string;
  account_id: string;
  role: string;
  dt: string;
  awsregion: string;
}

const { BUCKET, QUEUE_URL } = process.env;

const sqsClient = new SQSClient({});
const s3Client = new S3Client({});

async function getQueryExecution(executionId: string, region: string) {
  const client = new AthenaClient({ region });
  const cmd = new GetQueryExecutionCommand({
    QueryExecutionId: executionId,
  });

  return client.send(cmd);
}

async function sendMessageDelayed(message: QueueMessage, delaySeconds: number) {
  const cmd = new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(message),
    DelaySeconds: delaySeconds,
  });

  await sqsClient.send(cmd);
}

async function putMetricData(
  message: QueueMessage,
  output: GetQueryExecutionOutput
) {
  const metric = {
    query_id: message.query_id,
    account_id: message.account_id,
    timestamp: message.dt,
    state: output.QueryExecution?.Status?.State,
    stage_change_reason: output.QueryExecution?.Status?.StateChangeReason,
    query: output.QueryExecution?.Query,
    data_scanned: output.QueryExecution?.Statistics?.DataScannedInBytes,
    execution_time:
      output.QueryExecution?.Statistics?.EngineExecutionTimeInMillis,
    submission_date_time: output.QueryExecution?.Status?.SubmissionDateTime,
    completion_date_time: output.QueryExecution?.Status?.CompletionDateTime,
  };

  const dt = new Date(message.dt);

  console.log("save metric", metric);

  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `${dt.getFullYear()}/${dt.getMonth() + 1}/${dt.getDate()}/${
      message.query_id
    }.json`,
    Body: `${JSON.stringify(metric)}\n`,
  });

  await s3Client.send(cmd);
}

export const handler: Handler = async (event: SQSEvent) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const message: QueueMessage = JSON.parse(record.body);
    const execution = await getQueryExecution(
      message.query_id,
      message.awsregion
    );
    console.log(execution);
    const state = execution.QueryExecution?.Status?.State;
    if (
      state === QueryExecutionState.QUEUED ||
      state === QueryExecutionState.RUNNING
    ) {
      await sendMessageDelayed(message, 60);
    } else {
      await putMetricData(message, execution);
    }
  }
};
