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

## License

MIT
