import { Emulator, fromText, UTxO } from 'lucid-cardano';
import { test } from 'vitest';
import { EventFactory } from '../src';
import { generateAccount } from './utils';

const ACCOUNT_0 = await generateAccount({ lovelace: 75000000000n });
const ACCOUNT_1 = await generateAccount({ lovelace: 100000000n });

const emulator = new Emulator([ACCOUNT_0, ACCOUNT_1]);

const network = 'Preprod';

const winterEvent = new EventFactory(network);

await winterEvent.setProvider(emulator, {
  seed: ACCOUNT_0.seedPhrase
});

const walletAddress = await winterEvent.getWalletAddress();
const walletAddressPK = winterEvent.getAddressPK(walletAddress);

await winterEvent.setObjectContract({
  protocolVersion: 1n,
  dataReference: fromText('harvest'),
  eventCreationInfo: fromText(''),
  signers: [walletAddressPK]
});

const sharedUtxos: UTxO[] = [];

test('Singleton mint should work', async () => {
  const name = 'testSingletonTracker';
  const walletUtxos = await winterEvent.getWalletUtxos();

  const completeTx = await winterEvent.mintSingleton(name, walletUtxos);
  const signedTx = await completeTx.sign().complete();
  const txHash = await signedTx.submit();
  await winterEvent.waitForTx(txHash);

  const utxos = await winterEvent.getUtxosByOutRef([
    {
      txHash: txHash,
      outputIndex: 0
    }
  ]);

  sharedUtxos.push(...utxos);
});

test('Event recreation should work', async () => {
  const completeTx = await winterEvent.recreate(walletAddress, sharedUtxos);
  const signedTx = await completeTx.sign().complete();
  const txHash = await signedTx.submit();
  await winterEvent.waitForTx(txHash);

  const utxos = await winterEvent.getUtxosByOutRef([
    {
      txHash: txHash,
      outputIndex: 0
    }
  ]);

  sharedUtxos.length = 0;

  sharedUtxos.push(...utxos);
});

test('Event recreation should work repeatedly', async () => {
  for (let i = 0; i < 10; i++) {
    const completeTx = await winterEvent.recreate(walletAddress, sharedUtxos);
    const signedTx = await completeTx.sign().complete();
    const txHash = await signedTx.submit();
    await winterEvent.waitForTx(txHash);

    const utxos = await winterEvent.getUtxosByOutRef([
      {
        txHash: txHash,
        outputIndex: 0
      }
    ]);

    sharedUtxos.length = 0;

    sharedUtxos.push(...utxos);
  }
});

test('Event spend should work', async () => {
  const completeTx = await winterEvent.spend(walletAddress, walletAddress, sharedUtxos, undefined, [
    winterEvent.singletonContract
  ]);
  const signedTx = await completeTx.sign().complete();
  const txHash = await signedTx.submit();
  await winterEvent.waitForTx(txHash);

  const utxos = await winterEvent.getUtxosByOutRef([
    {
      txHash: txHash,
      outputIndex: 0
    }
  ]);

  sharedUtxos.length = 0;

  sharedUtxos.push(...utxos);
});
