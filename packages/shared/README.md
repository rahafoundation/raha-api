# shared/

Stuff that's used by both the API server and the REST client, including the
shape of all API endpoints as well as helpers and data models.

## Installation

```bash
yarn add @raha/api-shared
```

## Publishing the library

1.  Run `npm version <patch|minor|major>` and then `git push --tags`.
1.  Run `yarn build` in the `shared/` directory
1.  Run `npm publish dist` to publish the built code.

## Testing

Run `yarn test`.

This project uses `jest` for testing. Any file that ends in `.test.(j|t)sx?` is
treated as a test.

Tests are currently sparse/nonexistent; this must be fixed!
