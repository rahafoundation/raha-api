// tslint:disable:no-console
import * as fs from "fs";
import * as path from "path";

import packageJson = require("../../package.json");
import { spawnSync } from "child_process";

const { scripts, ...restPackageJson } = packageJson;
const { prepublishOnly, ...newScripts } = packageJson.scripts;

const publishDir = path.join(__dirname, "..", "..", "dist");

// in order to achieve a flat package structure, we copy over the package json
// to the true root of the published code. The default `prepublishOnly` script
// prevents publishing manually, and instead mandates that you use this script;
// so we remove it for the final, actual publishing, before copying
// `package.json` over.
console.info(`Writing new package json in \`${publishDir}\`...`);
const newPackageJson = { ...restPackageJson, ...newScripts };
fs.writeFileSync(
  path.join(publishDir, "package.json"),
  JSON.stringify(newPackageJson, null, 2)
);

console.info(`Written. Publishing \`${publishDir}\``);
spawnSync("npm", ["publish", publishDir], { stdio: "inherit" });
console.info("Done.");
