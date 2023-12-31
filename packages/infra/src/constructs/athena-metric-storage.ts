/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export class AthenaMetricStorage extends Construct {
  public readonly bucket: Bucket;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bucket = new Bucket(this, "Bucket", {
      serverAccessLogsPrefix: "logs/",
      enforceSSL: true,
    });
  }
}
