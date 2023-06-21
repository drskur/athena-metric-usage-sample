/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { AthenaMetricStorage } from "./constructs/athena-metric-storage";
import { MetricQueue } from "./constructs/metric-queue";
import { QueryExecutionIdFunction } from "./constructs/query-execution-id-function";
import { SaveMetricFunction } from "./constructs/save-metric-function";

export interface ApplicationStackProps extends StackProps {
  readonly cloudTrailRegion: string;
  readonly cloudTrailBucket: string;
  readonly cloudTrailTableName: string;
  readonly athenaResultBucket: string;
}

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props: ApplicationStackProps) {
    super(scope, id, props);

    const {
      cloudTrailRegion,
      cloudTrailBucket,
      cloudTrailTableName,
      athenaResultBucket,
    } = props;

    const { queue } = new MetricQueue(this, "MetricQueue");

    const storage = new AthenaMetricStorage(this, "AthenaMetricStorage");

    new QueryExecutionIdFunction(this, "QueryExecutionIdFunction", {
      queue,
      cloudTrailRegion,
      cloudTrailBucket,
      cloudTrailTableName,
      athenaResultBucket,
    });

    new SaveMetricFunction(this, "SaveMetricFunction", {
      queue,
      bucket: storage.bucket,
    });
  }
}
