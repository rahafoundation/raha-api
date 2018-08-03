# `client/`

API REST client. Has full and very complete TypeScript definitions.

## Installation

```bash
yarn add @raha/api
```

## Usage

```typescript
import { list } from "@raha/api/dist/operations/list";
const API_BASE = "https://raha-5395e.appspot.com/api/";

list(API_BASE).then(({ status, body }) => {
  if (status !== 200) {
    throw new Error("How sad!");
  }
  body.map(operation => console.log(JSON.stringify(operation))); // or do something else.
});
```

## Publishing the library

First, ask a maintainer of this library to grant you access to
`@raha/api` on NPM.

Then, if the changes here depend on changes to `@raha/api-shared` (i.e. changes to
`/packages/shared`), ensure:

1.  You publish `/packages/shared` first.
1.  The version of `@raha/api-shared` referenced in
    `/packages/client/package.json` has been bumped to the newly published
    version.

Then, run:

```bash
npm login  # log into NPM if you haven't already
npm publish
```

Please follow [semver](https://semver.org) when choosing a version number.

## Testing

Run `yarn test`.

This project uses `jest` for testing. Any file that ends in `.test.(j|t)sx?` is
treated as a test.

Tests are currently sparse/nonexistent; this must be fixed!

## Page weight

You probably want to use some tree-shaking so that you don't include unnecessary
code like the server in your frontend.
