import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
import { PDKPipelineTsProject } from "@aws-prototyping-sdk/pipeline";
import { TypeScriptProject } from "projen/lib/typescript";

const project = new NxMonorepoProject({
  defaultReleaseBranch: "main",
  devDeps: [
    "@aws-prototyping-sdk/nx-monorepo",
    "@aws-prototyping-sdk/pipeline",
  ],
  name: "lf-cloudtrail",
});
project.addGitIgnore(".idea");

new PDKPipelineTsProject({
  parent: project,
  cdkVersion: "2.1.0",
  defaultReleaseBranch: "mainline",
  devDeps: [],
  name: "infra",
  outdir: "packages/infra",
});

new TypeScriptProject({
  parent: project,
  defaultReleaseBranch: "mainline",
  deps: [
    "aws-lambda",
    "@aws-sdk/client-athena",
    "@aws-sdk/client-sqs",
    "@aws-sdk/client-s3",
    "uuid",
  ],
  devDeps: ["@types/aws-lambda", "@types/uuid"],
  name: "lambda",
  outdir: "packages/lambda",
  prettier: true,
});

project.synth();
