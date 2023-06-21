import { NxMonorepoProject } from "@aws-prototyping-sdk/nx-monorepo";
const project = new NxMonorepoProject({
  defaultReleaseBranch: "main",
  devDeps: ["@aws-prototyping-sdk/nx-monorepo"],
  name: "lf-cloudtrail",

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();