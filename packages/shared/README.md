# shared/

Stuff that's used by both the API server and the REST client, including the
shape of all API endpoints as well as helpers and data models.

## Installation

```bash
yarn add @raha/api-shared
```

## Developing simultaneously with other packages in the monorepo

If you're working on the `shared/` package simultaneously with sibling packages
in this repo that depend on `shared/`, like `client/` or `server/`, it's useful
to have the latest working changes available to those libraries before this
library is published. To do that, make sure that Typescript is compiling the
code in this package as you code, by running:

```bash
yarn build:watch
```

### Background

With [Typescript Project
References](https://www.typescriptlang.org/docs/handbook/project-references.html)
configured in the root `tsconfig.json`, those sibling packages use whatever
types are available in `shared/dist/` (the build directory of this package) to
fill in the types in those respective packages.

So, for the latest types for `shared/` to be present, ensure that the latest
types are always available, by watching on any changes here and rebuilding
automatically, with the command above.

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
