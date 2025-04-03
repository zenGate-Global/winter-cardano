require('dotenv').config();
import { deserializeAddress, fromUTF8, MaestroProvider, UTxO } from '@meshsdk/core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { EventFactory } from '../src/events';
import { ObjectDatum, ObjectDatumFields, ObjectDatumParameters } from '../src';

describe('Creating an EventFactory', async () => {
  const network = 'Preview';
  const mnemonic = process.env.MNEMONIC as string;
  //const fetcher = new OfflineFetcher();
  const provider = new MaestroProvider({
    network: network,
    apiKey: process.env.MAESTRO_KEY as string,
    turboSubmit: false
  });

  const eventFactory = new EventFactory(network, mnemonic, provider, provider, provider);
  const addr = eventFactory.wallet.getChangeAddress();
  const pkHash = deserializeAddress(addr).pubKeyHash;
  const dataRef = fromUTF8('Test Data');
  const previewTxHash = '88a5d805c7e4579d89ae1792b79660716318ef52c1d0e89b8529f81db279c12c';
  const pVersion = 1;

  const objectDatumParams: ObjectDatumParameters = {
    protocolVersion: pVersion,
    dataReferenceHex: dataRef,
    eventCreationInfoTxHash: previewTxHash,
    signersPkHash: [pkHash]
  };

  const sharedEvents: UTxO[] = await eventFactory.getUtxosByOutRef([
    { txHash: previewTxHash, outputIndex: 0 }
  ]);
  console.log('shared events: ', sharedEvents);

  const testCbor =
    'd8799f015f5840697066733a2f2f6261666b7265696169737835347979356c747033377a7932736a376c326b7067736f7372337266706f376e6878366f7a326535756a6d6a3432426369ff409f581c5afc8364f8733c895f54b5cf261b5efe71d3669f59ccad7439ccf289ffff';

  it('Should create an instance of EventFactory', () => {
    expectTypeOf(eventFactory).toEqualTypeOf<EventFactory>();
    expect(eventFactory).toBeDefined();
  });

  it('Should get the wallet utxos', async () => {
    const utxos = await eventFactory.getWalletUtxos();
    expect(utxos).toBeDefined();
    expectTypeOf(utxos).toEqualTypeOf<UTxO[]>();
  });

  it('Should get the wallet addresses', async () => {
    const addr = await eventFactory.getWalletAddress();
    expect(addr).toBeDefined();
    expectTypeOf(addr).toEqualTypeOf<string>();
  });

  it('Should get the wallet address public key hash', async () => {
    const addrHash = await eventFactory.getAddressPkHash();
    expect(addrHash).toBeDefined();
    expectTypeOf(addrHash).toEqualTypeOf<string>();
  });

  it('Should sort provided utxos by output reference', async () => {
    const utxos = await eventFactory.getWalletUtxos();
    const refs = await eventFactory.getUtxosByOutRef(utxos.map((utxo) => utxo.input));
    expect(refs).toBeDefined();
    expectTypeOf(refs).toEqualTypeOf<UTxO[]>();
  });

  it('Should save the object contract setup and get the status', () => {
    eventFactory.setObjectContract(objectDatumParams);
    expect(eventFactory.getObjectContractSetupStatus()).toEqual(true);
  });

  it('Should get an ObjectDatum from parameters', () => {
    const datum = EventFactory.getObjectDatumFromParams(objectDatumParams);
    expect(datum).toBeDefined();
    expectTypeOf(datum).toEqualTypeOf<ObjectDatum>();
  });

  it('Should get ObjectDatum fields from datum Plutus data', () => {
    const fields = EventFactory.getObjectDatumFieldsFromPlutusCbor(testCbor);
    expect(fields).toBeDefined();
    expectTypeOf(fields).toEqualTypeOf<ObjectDatumFields>();
  });

  it('Should build a singleton event tx', async () => {
    const utxos = await eventFactory.wallet.getCollateral();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    expect(unsignedTx).toBeDefined();
    expectTypeOf(unsignedTx).toEqualTypeOf<string>();
  });

  it('Should sign a singleton event tx', async () => {
    const utxos = await eventFactory.wallet.getCollateral();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    const signedTx = await eventFactory.signTx(unsignedTx);
    expect(signedTx).toBeDefined();
    expectTypeOf(signedTx).toEqualTypeOf<string>();
  });

  // it('Should submit a singleton event tx', async () => {
  //   const utxos = await eventFactory.wallet.getCollateral();
  //   const tokenName = 'Test Token';
  //   const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
  //   const signedTx = await eventFactory.signTx(unsignedTx);
  //   const txHash = await eventFactory.submitTx(signedTx);
  //   expect(txHash).toBeDefined();
  //   expectTypeOf(txHash).toEqualTypeOf<string>();
  // });

  it('Should build a recreation event tx', async () => {
    const utxos = await eventFactory.wallet.getCollateral();
    const newReference = [fromUTF8('Test Reference')];
    const unsignedTx = await eventFactory.recreate(addr, utxos, sharedEvents, newReference);
    expect(unsignedTx).toBeDefined();
    expectTypeOf(unsignedTx).toEqualTypeOf<string>();
  });

  it('Should sign a recreation event tx', async () => {
    const utxos = await eventFactory.wallet.getCollateral();
    const newReference = [fromUTF8('Test Reference')];
    const unsignedTx = await eventFactory.recreate(addr, utxos, sharedEvents, newReference);
    const signedTx = await eventFactory.signTx(unsignedTx);
    expect(signedTx).toBeDefined();
    expectTypeOf(signedTx).toEqualTypeOf<string>();
  });

  // it('Should submit a recreation event tx', async () => {
  //   const utxos = await eventFactory.wallet.getCollateral();
  //   const newReference = [fromUTF8('Test Reference')];
  //   const unsignedTx = await eventFactory.recreate(addr, utxos, sharedEvents, newReference);
  //   const signedTx = await eventFactory.signTx(unsignedTx);
  //   const txHash = await eventFactory.submitTx(signedTx);
  //   expect(txHash).toBeDefined();
  //   expectTypeOf(txHash).toEqualTypeOf<string>();
  // });
});
