import * as console from "console";
import * as process from "process";
import {
  AthenaClient,
  Datum,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  GetQueryResultsCommandOutput,
  QueryExecutionState,
  StartQueryExecutionCommand,
} from "@aws-sdk/client-athena";
import {
  SendMessageBatchCommand,
  SendMessageBatchRequestEntry,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { Handler } from "aws-lambda";
import { v4 as uuidv4 } from "uuid";

const { CLOUDTRAIL_REGION, ATHENA_OUTPUT, QUEUE_URL } = process.env;
const athenaClient = new AthenaClient({ region: CLOUDTRAIL_REGION });

async function runQuery() {
  const query = `
    WITH data AS (
        SELECT
                json_extract(responseelements, '$.queryExecutionId') AS query_id,
                (useridentity.arn) AS uid,
                (useridentity.accountId) AS account_id,
                (useridentity.sessioncontext.sessionIssuer.userName) AS role,
                from_iso8601_timestamp(eventtime) AS dt
        FROM    cloudtrail_logs_cloudtrail_awslogs_443892063838_z4rtnsvh_isengard_do_not_delete
        WHERE   eventsource='athena.amazonaws.com'
                AND eventname='StartQueryExecution'
                AND json_extract(responseelements, '$.queryExecutionId') is NOT null
    )
    SELECT *
    FROM data
    WHERE dt > date_add('minute',-65, now())
  `;
  const cmd = new StartQueryExecutionCommand({
    QueryString: query,
    ClientRequestToken: uuidv4(),
    QueryExecutionContext: {
      Database: "default",
    },
    ResultConfiguration: {
      OutputLocation: ATHENA_OUTPUT,
    },
  });

  const output = await athenaClient.send(cmd);

  return output.QueryExecutionId || "";
}

async function getQueryExecution(executionId: string) {
  const cmd = new GetQueryExecutionCommand({
    QueryExecutionId: executionId,
  });

  return athenaClient.send(cmd);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getQueryResults(executionId: string) {
  let executionState = (await getQueryExecution(executionId)).QueryExecution
    ?.Status?.State;

  while (
    executionState === QueryExecutionState.QUEUED ||
    executionState == QueryExecutionState.RUNNING
  ) {
    await delay(1000);
    executionState = (await getQueryExecution(executionId)).QueryExecution
      ?.Status?.State;
  }

  let nextToken = undefined;
  let jsonResults: Record<string, string>[] = [];

  do {
    const cmd: GetQueryResultsCommand = new GetQueryResultsCommand({
      QueryExecutionId: executionId,
      NextToken: nextToken,
    });
    const output = await athenaClient.send(cmd);
    jsonResults = jsonResults.concat(queryResultsJson(output));
    nextToken = output.NextToken;
  } while (nextToken !== undefined);

  return jsonResults;
}

function queryResultsJson(output: GetQueryResultsCommandOutput) {
  const rows = output.ResultSet?.Rows || [];
  const header: Datum[] = rows[0].Data || [];

  let data = [];
  for (let i = 1; i < rows.length; i++) {
    const datums: Datum[] = rows[i].Data || [];
    let obj: Record<string, string> = {};
    for (let j = 0; j < datums.length; j++) {
      const key = header[j].VarCharValue || "";
      const value = datums[j].VarCharValue || "";
      obj[key] = value.replace(/["']/g, "");
    }
    data.push(obj);
  }

  return data;
}

async function sendQueueMessage(record: Record<string, string>[]) {
  const client = new SQSClient({});
  const entries: SendMessageBatchRequestEntry[] = record.map((r) => ({
    Id: uuidv4(),
    MessageBody: JSON.stringify(r),
  }));
  const cmd = new SendMessageBatchCommand({
    QueueUrl: QUEUE_URL,
    Entries: entries,
  });

  await client.send(cmd);
}

export const handler: Handler = async (event) => {
  console.log("EVENT: \n" + JSON.stringify(event, null, 2));
  const executionId = await runQuery();
  const records = await getQueryResults(executionId);
  await sendQueueMessage(records);
  return executionId;
};
