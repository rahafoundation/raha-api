// tslint:disable:no-console
import * as fs from "fs";
import * as path from "path";

import packageJson = require("../package.json");
import { spawnSync } from "child_process";

const { scripts, ...restPackageJson } = packageJson;
const { prepublishOnly, ...newScripts } = packageJson.scripts;

const distDir = path.join(__dirname, "..", "dist");

console.info("Writing new package json in `dist/`...");
const newPackageJson = { ...restPackageJson, ...newScripts };
fs.writeFileSync(
  path.join(distDir, "package.json"),
  JSON.stringify(newPackageJson)
);

console.info("Written. Publishing `dist/`");
spawnSync("npm", ["publish", distDir], { stdio: "inherit" });
console.info("Done.");
