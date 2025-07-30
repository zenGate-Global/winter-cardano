# Winter Cardano

See here for docs website: https://palmyra-docs.vercel.app/docs/Cardano/winter

## Table of Contents

* [Installation](#installation)
* [Event Instantiation](#event-instantiation)

  * [Set Up Event Builder](#set-up-event-builder)
  * [Set Up Provider](#set-up-provider)
  * [Additional Provider Settings](#additional-provider-settings)
  * [Set Up Contract](#set-up-contract)
* [Minting](#minting)
* [Recreation](#recreation)
* [Spending](#spending)
* [Best Practices Guide](#best-practices-guide)

---

## Installation

```bash
# NPM
npm install winter-cardano

# Yarn
yarn add winter-cardano

# pnpm
pnpm add winter-cardano
```

---

## Event Instantiation

### Prerequisites

* Have your **seed phrase** prepared with some ADA in the wallet.
* Have your **provider** details ready.

---

### Set Up Event Builder

Choose your network:

```ts
// Mainnet
const winterEvent = new EventFactory('Mainnet');

// Preview
const winterEvent = new EventFactory('Preview');

// Preprod
const winterEvent = new EventFactory('Preprod');

// Custom
const winterEvent = new EventFactory('Custom');
```

---

### Set Up Provider

#### Blockfrost

```ts
const provider = new Blockfrost('<apiUrl>', '<projectId>');
await winterEvent.setProvider(provider, {
  seed: '<seedPhrase>'
});
```

#### Kupmios

```ts
const provider = new Kupmios('http://localhost:1442', 'ws://localhost:1337');
await winterEvent.setProvider(provider, {
  seed: '<seedPhrase>'
});
```

#### Maestro

```ts
const provider = new Maestro({
  network: '<network>',
  apiKey: '<Your-API-Key>',
  turboSubmit: false
});
await winterEvent.setProvider(provider, {
  seed: '<seedPhrase>'
});
```

#### Custom

```ts
class MyProvider { ... }
const provider = new MyProvider();
await winterEvent.setProvider(provider, {
  seed: '<seedPhrase>'
});
```

---

### Additional Provider Settings

You can specify extra options:

```ts
await winterEvent.setProvider(provider, {
  seed: '<seedPhrase>',
  options: {
    addressType: 'Base',
    accountIndex: 1,
    password: '<myPassword>'
  }
});
```

Or use a private key instead of a seed phrase:

```ts
await winterEvent.setProvider(provider, undefined, '<privKey>');
```

---

### Set Up Contract

Set your immutable data for your commodity:

```ts
const walletAddress = await winterEvent.getWalletAddress();
const walletAddressPK = winterEvent.getAddressPK(walletAddress);

await winterEvent.setObjectContract({
  protocolVersion: 1n,
  dataReference: fromText('harvest'),
  eventCreationInfo: fromText(''),
  signers: [walletAddressPK]
});
```

#### Contract Fields Explained

* **protocolVersion**: Which version of the protocol is being used (bigint).
* **dataReference**: Arbitrary data in hex (e.g. IPFS link).
* **eventCreationInfo**: The original txId. Typically an empty string at creation.
* **signers**: Array of payment credential hashes of authorized signers.

---

## Minting

A **singleton** token is minted to the contract for unique identification (like an NFT).

> ⚠️ **Important**: Ensure the entire instantiation step is complete and smart contract parameters are set correctly before minting.

```ts
const name = 'testSingletonTracker';
const walletUtxos = await winterEvent.getWalletUtxos();

const completeTx = await winterEvent.mintSingleton(name, walletUtxos);
const signedTx = await completeTx.sign().complete();
const txHash = await signedTx.submit();
await winterEvent.waitForTx(txHash); // optional confirmation
```

---

## Recreation

Recreation moves the singleton to a new UTXO while paying a 1 ADA fee to the winter protocol (one-time per transaction regardless of input count).

---

### UTXO Selection

You can select UTXOs manually:

```ts
const utxos = await winterEvent.getUtxosByOutRef([
  {
    txHash: '<txHash>',
    outputIndex: <index>
  }
]);
```

You can also select multiple UTXOs from the same contract address (with intersecting signers).

---

### Transaction Building

Pass new data references for recreation:

```ts
const newDataRef = ["deadbeef"];
const completeTx = await winterEvent.recreate(walletAddress, utxos, newDataRef);
const signedTx = await completeTx.sign().complete();
const txHash = await signedTx.submit();
await winterEvent.waitForTx(txHash);
```

---

## Spending

Spend the UTXO and burn the singleton. A 1 ADA fee is paid to the winter protocol (one-time per transaction regardless of input count).

---

### UTXO Selection

Select exact UTXOs as before:

```ts
const utxos = await winterEvent.getUtxosByOutRef([
  {
    txHash: '<txHash>',
    outputIndex: <index>
  }
]);
```

Multiple UTXOs from the same contract address can also be used if they share intersecting signers.

---

### Transaction Building

If the singleton contract is not readily available, you can extract it from Koios.

* **Local** (if same instance minted the singleton):

```ts
const completeTx = await winterEvent.spend(
  walletAddress,
  walletAddress,
  utxos,
  undefined,
  [winterEvent.singletonContract]
);
const signedTx = await completeTx.sign().complete();
const txHash = await signedTx.submit();
await winterEvent.waitForTx(txHash);
```

* **Koios**:

```ts
const completeTx = await winterEvent.spend(
  walletAddress,
  walletAddress,
  utxos,
  '<koiosUrl>'
);
const signedTx = await completeTx.sign().complete();
const txHash = await signedTx.submit();
await winterEvent.waitForTx(txHash);
```

---

## Best Practices Guide
### Security & Key Management

Wallet Isolation

Guideline: It is strongly recommended to use a dedicated Cardano wallet (and thus a unique 24-word mnemonic) exclusively for the Winter Backend.

API Key Management

Guideline: Restrict API keys (like Maestro or NFT.Storage) with IP whitelisting or other available security features.

On-Chain Data & Transaction Management

This section focuses on the "blockchain" aspect: cost, permanence, and efficiency.

Data Immutability

Guideline: Data submitted to the blockchain is permanent. Before creating an event, validate all metadata and parameters in your application layer. The error-declaration event is for correcting logical errors, not for fixing simple typos.

Efficient Transaction Batching

Guideline: Whenever possible, batch multiple operations into a single transaction. For example, when using the recreate or spend functions, you can process multiple UTXOs at once.

UTXO Management Strategy

Guideline: Your application should be aware of its UTXO state. Avoid creating many small "dust" UTXOs. If your application logic allows, periodically consolidate UTXOs into larger ones to simplify management and reduce future transaction sizes (thus less fees).

Handling Transaction Confirmations

Guideline: Always use await winterEvent.waitForTx(txHash) or a similar confirmation-checking mechanism before attempting to use the outputs of a transaction you just submitted. Rollbacks are also a possibility, so its best to even wait for a few blocks to pass.

### Backend Deployment & Operations

This is for users running your winter-backend-cardano service.

Production vs. Development Configuration

Guideline: For production environments, always set POSTGRES_SYNC=false. Only set it to true during initial setup or active development.

Reasoning: POSTGRES_SYNC=true can cause destructive changes to your database schema and data if the TypeORM entities are modified. It is also inefficient for a running application.

Database & Redis Backups

Guideline: Implement a regular backup strategy for your PostgreSQL database and your Redis instance. Your PostgreSQL data contains a historical record of events, and your Redis data is critical for live UTXO management.

Reasoning: While the blockchain is the ultimate source of truth, your local database provides fast querying capabilities. Losing the Redis UTXO lock data could lead to temporary service interruptions or transaction failures until the state is rebuilt.

### Monitoring and Logging

Guideline: Integrate the backend with a logging and monitoring service. Key metrics to watch include: API endpoint error rates (4xx/5xx), transaction submission failures, database query latency, and Redis connectivity.

Reasoning: Proactive monitoring allows you to detect issues like a failing Cardano API provider, database performance degradation, or bugs in your application logic before they impact users.

### Metadata & Off-Chain Storage

This section is about the data before it gets referenced on-chain.

Metadata Consistency

Guideline: Define and enforce a consistent schema for your metadata within your own application before submitting it. For example, ensure all dates are in ISO 8601 format and that predefined keys (e.g., "District", "Quality") use a consistent set of values.

Reasoning: This practice ensures that the data being traced is reliable and machine-readable, maximizing the value of the traceability system.

IPFS Pinning Strategy

Guideline: Understand the data persistence policy of your IPFS provider (e.g., NFT.Storage). For critical, long-term data, consider running your own IPFS node or using a dedicated pinning service to ensure your metadata remains available indefinitely.

Reasoning: The blockchain only stores a link (the CID) to the metadata. If the data is no longer available on the IPFS network, that link becomes useless.

## License

MIT
