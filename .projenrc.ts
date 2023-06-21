import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
import { PDKPipelineTsProject } from "@aws-prototyping-sdk/pipeline";

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

project.synth();
