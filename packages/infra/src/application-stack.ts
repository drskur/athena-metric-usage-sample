/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { MetricQueue } from "./constructs/metric-queue";
import { QueryExecutionIdFunction } from "./constructs/query-execution-id-function";

export class ApplicationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const { queue } = new MetricQueue(this, "MetricQueue");
    new QueryExecutionIdFunction(this, "QueryExecutionIdFunction", {
      queue,
    });
  }
}
