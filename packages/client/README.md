# `client/`

API REST client. Has full and very complete TypeScript definitions.

## Installation

```bash
yarn add @raha/api
```

## Usage

```typescript
import { list } from "@raha/api/operations/list";
const API_BASE = "https://raha-5395e.appspot.com/api/";

list(API_BASE).then(({ status, body }) => {
  if (status !== 200) {
    throw new Error("How sad!");
  }
  body.map(operation => console.log(JSON.stringify(operation))); // or do something else.
});
```

## Publishing the library

Run this command:

```bash
yarn pub
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
