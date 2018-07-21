# shared/

Stuff that's used by both the API server and the REST client, including the
shape of all API endpoints as well as helpers and data models.

## Installation

```bash
yarn add @raha/api-shared
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
