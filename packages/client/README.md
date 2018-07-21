# `client/`

API REST client. Has full and very complete TypeScript definitions.

## Installation

```bash
yarn add @raha/api
```

## Usage

```typescript
import { list } from "@raha/api/client/operations/list";
const API_BASE = "https://raha-5395e.appspot.com/api/";

list(API_BASE).then(({ status, body }) => {
  if (status !== 200) {
    throw new Error("How sad!");
  }
  body.map(operation => console.log(JSON.stringify(operation))); // or do something else.
});
```

## Page weight

You probably want to use some tree-shaking so that you don't include unnecessary
code like the server in your frontend.
