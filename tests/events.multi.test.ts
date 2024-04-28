import { Emulator, fromText, UTxO } from 'lucid-cardano';
import { test } from 'vitest';
import { EventFactory } from '../src';
import { generateAccount } from './utils';

const ACCOUNT_0 = await generateAccount({ lovelace: 75000000000n });
const ACCOUNT_1 = await generateAccount({ lovelace: 100000000n });

const emulator = new Emulator([ACCOUNT_0, ACCOUNT_1]);

const network = 'Preprod';

const winterEvent1 = new EventFactory(network);
const winterEvent2 = new EventFactory(network);

await winterEvent1.setProvider(emulator, {
  seed: ACCOUNT_0.seedPhrase
});

await winterEvent2.setProvider(emulator, {
  seed: ACCOUNT_1.seedPhrase
});

const walletAddress1 = await winterEvent1.getWalletAddress();
const walletAddressPK1 = winterEvent1.getAddressPK(walletAddress1);

const walletAddress2 = await winterEvent1.getWalletAddress();
const walletAddressPK2 = winterEvent1.getAddressPK(walletAddress2);

await winterEvent1.setObjectContract({
  protocolVersion: 1n,
  dataReference: fromText('harvest'),
  eventCreationInfo: fromText(''),
  signers: [walletAddressPK1, walletAddressPK2]
});

await winterEvent2.setObjectContract({
  protocolVersion: 1n,
  dataReference: fromText('crop'),
  eventCreationInfo: fromText(''),
  signers: [walletAddressPK2, walletAddressPK1]
});

const sharedUtxos: UTxO[] = [];

test('Singleton mint should work', async () => {
  const name1 = 'testSingletonTracker1';
  const walletUtxos1 = await winterEvent1.getWalletUtxos();

  const name2 = 'testSingletonTracker2';
  const walletUtxos2 = await winterEvent2.getWalletUtxos();

  const completeTx1 = await winterEvent1.mintSingleton(name1, walletUtxos1);
  const signedTx1 = await completeTx1.sign().complete();
  const txHash1 = await signedTx1.submit();
  await winterEvent1.waitForTx(txHash1);

  const completeTx2 = await winterEvent2.mintSingleton(name2, walletUtxos2);
  const signedTx2 = await completeTx2.sign().complete();
  const txHash2 = await signedTx2.submit();
  await winterEvent2.waitForTx(txHash2);

  const utxos1 = await winterEvent1.getUtxosByOutRef([
    {
      txHash: txHash1,
      outputIndex: 0
    }
  ]);

  const utxos2 = await winterEvent1.getUtxosByOutRef([
    {
      txHash: txHash2,
      outputIndex: 0
    }
  ]);

  sharedUtxos.push(...utxos1, ...utxos2);
});

test('Event recreation with multiple inputs sharing common signers should work', async () => {
  const completeTx = await winterEvent1.recreate(walletAddress1, sharedUtxos, [
    'deafbeef',
    'cafebabe'
  ]);
  const signedTx = await completeTx.sign().complete();
  const txHash = await signedTx.submit();
  await winterEvent1.waitForTx(txHash);

  const utxos = await winterEvent1.getUtxosByOutRef([
    {
      txHash: txHash,
      outputIndex: 0
    }
  ]);

  sharedUtxos.length = 0;

  sharedUtxos.push(...utxos);
});

test('Event spend with multiple inputs sharing common signers should work', async () => {
  const completeTx = await winterEvent1.spend(
    walletAddress2,
    walletAddress1,
    sharedUtxos,
    undefined,
    [winterEvent1.singletonContract, winterEvent2.singletonContract]
  );
  const signedTx = await completeTx.sign().complete();
  const txHash = await signedTx.submit();
  await winterEvent1.waitForTx(txHash);

  const utxos = await winterEvent1.getUtxosByOutRef([
    {
      txHash: txHash,
      outputIndex: 0
    }
  ]);

  sharedUtxos.length = 0;

  sharedUtxos.push(...utxos);
});
