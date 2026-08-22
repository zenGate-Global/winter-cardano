# winter-cardano-sdk

TypeScript implementation of the WINTER traceability protocol for Cardano Blockchain.

# Documentation

Explore the documentation to learn how to use the Winter Cardano SDK:

### Introduction

- [What is Winter Protocol](./docs/base/introduction/what-is-winter-protocol.mdx) - Overview of the SDK and its capabilities

### Setup

- [Getting Started](./docs/versions/v1.0.0/setup/getting-started.mdx) - Installation and initial setup
- [Contract](./docs/versions/v1.0.0/setup/contract.mdx) - Contract configuration
- [Reference Scripts](./docs/versions/v1.0.0/setup/reference-scripts.mdx) - Working with reference scripts
- [Providers](./docs/versions/v1.0.0/setup/providers.mdx) - Setting up providers

### Events

- [Minting](./docs/versions/v1.0.0/event/minting.mdx) - Minting unique on-chain objects
- [Spending](./docs/versions/v1.0.0/event/spending.mdx) - Spending operations
- [Recreation](./docs/versions/v1.0.0/event/recreation.mdx) - Recreating objects

### Changelog

- [Changelog](./docs/base/changelog/index.mdx) - Version history and updates

## Package Contents

Published package ships only `dist` (`package.json:8` `files: ["dist"]`). Source is not included in the npm tarball. Clone from GitHub to audit source. This is intentional.

## Breaking Changes in Next Major

This is a breaking release. Pin or update call sites before you upgrade.

### 1. `getUtxosByOutRef` is now ordered and strict

Before: results were grouped by `txHash` and could return in a different order than requested. Missing refs were silently dropped, so the returned array could be shorter than requested.

Now: results are returned in the caller requested order. If any `txHash:outputIndex` is not found, the call throws. Update code that relied on silent filtering or on provider order to handle the thrown error and to keep the array order you pass in.

### 2. `spend` no longer takes `recipientAddress`

Before:

```typescript
await eventFactory.spend(recipientAddress, signerAddress, walletUtxos, events, utxoRefMap)
```

Now:

```typescript
await eventFactory.spend(signerAddress, walletUtxos, events, utxoRefMap)
```

Remove the first argument. The fee address is used internally.

### 3. Strict validation for `mintSingleton`, `recreate`, and `spend`

These methods now reject invalid inputs where they previously built a transaction that would lock funds or corrupt the datum:

- empty `utxos` / `walletUtxos` / `events` arrays
- empty or malformed signer lists
- empty or malformed `dataReferenceHex` / `newDataReferences` entries
- `recreate` where `newDataReferences.length` does not match `events.length`

They throw before building. Add checks at call sites and handle the error. Valid inputs are unchanged.

