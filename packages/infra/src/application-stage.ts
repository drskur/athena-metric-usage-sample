/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ApplicationStack } from "./application-stack";

export interface ApplicationStageProps extends StageProps {
  readonly cloudTrailRegion: string;
  readonly cloudTrailBucket: string;
  readonly cloudTrailTableName: string;
  readonly athenaResultBucket: string;
}

export class ApplicationStage extends Stage {
  constructor(scope: Construct, id: string, props: ApplicationStageProps) {
    super(scope, id, props);

    const {
      cloudTrailRegion,
      cloudTrailBucket,
      cloudTrailTableName,
      athenaResultBucket,
    } = props;

    new ApplicationStack(this, "AthenaMetricApplication", {
      cloudTrailRegion,
      cloudTrailBucket,
      cloudTrailTableName,
      athenaResultBucket,
    });
  }
}
