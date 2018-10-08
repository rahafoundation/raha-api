# `server/`

API server. Entry point is `app.ts`.

## Setup

### Make sure you have gcloud installed

1.  Install gcloud: `brew cask install google-cloud-sdk`
1.  Initialize gcloud: `gcloud init`

### Install Node deps

```bash
yarn install
```

## Running locally

1.  If you don't have Firebase service account credentials, follow the
    instructions at:
    https://firebase.google.com/docs/admin/setup#add_firebase_to_your_app to get
    them. DO NOT COMMIT THESE CREDENTIALS.
1.  Run `yarn use-test-config` for Raha Test and `yarn use-prod-config` for Raha prod.
1.  Run the dev server (this refreshes on changes automatically):

```bash
FIREBASE_CREDENTIALS_PATH="<path to service account credentials>" yarn start:dev
```

It spams that it restarted the server a bunch when you first run it, but after
that it should be fine.

### Troubleshooting

If you receive an error about default application credentials, try logging in
with `gcloud`:

```bash
gcloud auth application-default login
```

## Acquiring Coconut API key

We use [Coconut](https://app.coconut.co) to handle encoding our videos. Coconut
requires an API key which we include in the `./src/data/DO_NOT_COMMIT.secrets.config.ts`
file with the following structure:

```
{
    "coconutApiKey": <api_key>
}
```

This file must be present to deploy raha-api or run it locally. Until we have
a better key management system, you will have to create this file yourself.
Ask @rahulgi for the key.

## Deploy Instructions

If the changes here depend on changes to `@raha/api-shared` (i.e.
changes to `/packages/shared`), ensure:

1.  You publish `/packages/shared` first.
1.  The version of `@raha/api-shared` referenced in
    `/packages/server/package.json` has been bumped to the newly published
    version.

Then, run:

```bash
yarn deploy-test
# or
yarn deploy-prod
```

If you're getting Typescript errors related to `@raha/api-shared`, go to `packages/shared` and run `yarn build` first.

## Testing

Run `yarn test`.

This project uses `jest` for testing. Any file that ends in `.test.(j|t)sx?` is
treated as a test.

Tests are currently sparse/nonexistent; this must be fixed!
