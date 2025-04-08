require('dotenv').config();
import {
  BlockfrostProvider,
  deserializeAddress,
  fromUTF8,
  PlutusScript,
  UTxO
} from '@meshsdk/core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { EventFactory } from '../src/events';
import { ObjectDatum, ObjectDatumFields, ObjectDatumParameters } from '../src';

describe('Creating an EventFactory', async () => {
  const provider = new BlockfrostProvider(process.env.BLOCKFROST_KEY as string);
  const network = process.env.NETWORK as string;
  const mnemonic = process.env.MNEMONIC as string;

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

  const testCbor =
    'd8799f015f5840697066733a2f2f6261666b7265696169737835347979356c747033377a7932736a376c326b7067736f7372337266706f376e6878366f7a326535756a6d6a3432426369ff409f581c5afc8364f8733c895f54b5cf261b5efe71d3669f59ccad7439ccf289ffff';

  // Test script corresponds to the test policy id.
  const testSingletonScript: PlutusScript = {
    version: 'V2',
    code: '59038c01000033323232323232323232323223222323232322533300c323232533300f3007301137540022646464a66602c0022a660260202c264a66602e603400426464a66602a601a602e6ea803854ccc054c8cc004004018894ccc06c004528099299980c19baf301e301b3754603c00402629444cc00c00c004c07800454ccc054c0300044cdc78010088a501533016491536578706563740a202020202020202020206c6973742e616e7928696e707574732c20666e28696e70757429207b20696e7075742e6f75747075745f7265666572656e6365203d3d207574786f5f726566207d290016153330153370e0029000899b8f00201114a06eb4c05c008dd7180a8008a9980a0088b180c000999119299980a1805980b1baa00114bd6f7b63009bab301a30173754002646600200200644a666032002298103d87a8000132323253330183371e00c6eb8c06800c4cdd2a40006603a6e980052f5c026600a00a0046eacc068008c074008c06c004c8cc004004dd5980c180c980c980c980c80191299980b8008a5eb7bdb1804c8c8c8c94ccc05ccdc7a4500002100313301c337606ea4008dd3000998030030019bab3019003375c602e004603600460320026eb8c05cc050dd50019bac3016001301237540042a66020921236578706563742074782e4d696e7428706f6c6963795f696429203d20707572706f73650016301430150023013001300f37540022930a99806a491856616c696461746f722072657475726e65642066616c7365001365632533300b30030011533300f300e37540082930a998060050b0a99980598010008a99980798071baa004149854cc0300285854cc03002858c030dd50019b8748008dc3a4000a66666601e00220022a6601000c2c2a6601000c2c2a6601000c2c2a6601000c2c6eb800524018a657870656374205b2861737365745f6e616d652c20616d6f756e74295d203d0a2020202020206d696e740a20202020202020207c3e2076616c75652e66726f6d5f6d696e7465645f76616c75650a20202020202020207c3e2076616c75652e746f6b656e7328706f6c6963795f6964290a20202020202020207c3e20646963742e746f5f6c69737428290049010c72646d723a20416374696f6e005734ae7155ceaab9e5573eae815d0aba257489810f4e426c61636b205465612054657374004c012bd8799fd8799f58206773419548e12aad793c1c38c8dfdf1d93bac0689c4c5cab68b26f5f26532c90ff00ff0001'
  };

  const testPolicyId = 'de51e5038d491a98698045a464f4b7237fe181aa8cac8d68da1986f2';

  it('Should create an instance of EventFactory', () => {
    expectTypeOf(eventFactory).toEqualTypeOf<EventFactory>();
    expect(eventFactory).toBeDefined();
  });

  it('Should get the wallet utxos', async () => {
    const utxos = await eventFactory.getWalletUtxos();
    expect(utxos).toBeDefined();
    expectTypeOf(utxos).toEqualTypeOf<UTxO[]>();
  });

  it('Should get the wallet addresses', () => {
    const addr = eventFactory.getWalletAddress();
    expect(addr).toBeDefined();
    expectTypeOf(addr).toEqualTypeOf<string>();
  });

  it('Should get the wallet address public key hash', () => {
    const addrHash = eventFactory.getAddressPkHash();
    expect(addrHash).toBeDefined();
    expectTypeOf(addrHash).toEqualTypeOf<string>();
  });

  it('Should sort provided utxos by output reference', async () => {
    const utxos = await eventFactory.getWalletUtxos();
    const refs = await eventFactory.getUtxosByOutRef(utxos.map((utxo) => utxo.input));
    expect(refs).toBeDefined();
    expectTypeOf(refs).toEqualTypeOf<UTxO[]>();
  });

  it('Should get the script info', async () => {
    const bytes = await eventFactory.getScriptInfo(testPolicyId);
    console.log('script bytes: ', bytes);
    expect(bytes).toBeDefined();
    expect(bytes).toEqual(testSingletonScript.code);
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

  it('Should build a spend event tx', async () => {
    const utxos = await eventFactory.wallet.getCollateral();
    const unsignedTx = await eventFactory.spend(addr, addr, utxos, sharedEvents, undefined, [
      testSingletonScript
    ]);
    expect(unsignedTx).toBeDefined();
    expectTypeOf(unsignedTx).toEqualTypeOf<string>();
  });

  it('Should sign a spend event tx', async () => {
    const utxos = await eventFactory.wallet.getCollateral();
    const unsignedTx = await eventFactory.spend(addr, addr, utxos, sharedEvents, undefined, [
      testSingletonScript
    ]);
    const signedTx = await eventFactory.signTx(unsignedTx);
    expect(signedTx).toBeDefined();
    expectTypeOf(signedTx).toEqualTypeOf<string>();
  });

  // it('Should submit a spend event tx', async () => {
  //   const utxos = await eventFactory.wallet.getCollateral();
  //   const unsignedTx = await eventFactory.spend(addr, addr, utxos, sharedEvents, undefined, [
  //     testSingletonScript
  //   ]);
  //   const signedTx = await eventFactory.signTx(unsignedTx);
  //   const txHash = await eventFactory.submitTx(signedTx);
  //   expect(txHash).toBeDefined();
  //   expectTypeOf(txHash).toEqualTypeOf<string>();
  // });
});
