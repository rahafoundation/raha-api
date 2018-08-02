# shared/

Stuff that's used by both the API server and the REST client, including the
shape of all API endpoints as well as helpers and data models.

## Installation

```bash
yarn add @raha/api-shared
```

## Publishing the library

First, ask a maintainer of this library to grant you access to
`@raha/api-shared` on NPM.

Then, run this command:

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
