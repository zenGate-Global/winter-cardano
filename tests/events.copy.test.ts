require('dotenv').config();
import {
  deserializeAddress,
  fromUTF8,
  MaestroProvider,
  MeshWallet,
  OfflineFetcher,
  UTxO
} from '@meshsdk/core';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { EventFactory } from '../src/events';
import { ObjectDatum, ObjectDatumFields, ObjectDatumParameters } from '../src';

describe('Creating an EventFactory', () => {
  const network = 'Preview';
  const mnemonic = MeshWallet.brew();
  const fetcher = new OfflineFetcher();
  const submitter = new MaestroProvider({
    network: network,
    apiKey: process.env.MAESTRO_KEY as string,
    turboSubmit: false
  });

  const eventFactory = new EventFactory(network, mnemonic, fetcher, submitter, submitter);
  const addr = eventFactory.wallet.getChangeAddress();
  const pkHash = deserializeAddress(addr).pubKeyHash;
  const dataRef = fromUTF8('test');
  const previewTxHash = 'eca3e1ba974ef5a6c9fe4eef6af387ccbced6cb64ca13ace5188bf47c20c60a7';
  const pVersion = 1;

  const objectDatumParams: ObjectDatumParameters = {
    protocolVersion: pVersion,
    dataReferenceHex: dataRef,
    eventCreationInfoTxHash: previewTxHash,
    signersPkHash: [pkHash]
  };

  const inputs: UTxO[] = [
    {
      input: {
        outputIndex: 0,
        txHash: previewTxHash
      },
      output: {
        address: addr,
        amount: [
          {
            unit: 'lovelace',
            quantity: '100000000'
          }
        ]
      }
    }
  ];

  fetcher.addUTxOs(inputs);

  const events: UTxO[] = [];

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
    const refs = await eventFactory.getUtxosByOutRef(inputs.map((utxo) => utxo.input));
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
    const utxos = await eventFactory.wallet.getUtxos();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    expect(unsignedTx).toBeDefined();
    expectTypeOf(unsignedTx).toEqualTypeOf<string>();
  });

  it('Should sign a singleton event tx', async () => {
    const utxos = await eventFactory.wallet.getUtxos();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    const signedTx = await eventFactory.signTx(unsignedTx);
    expect(signedTx).toBeDefined();
    expectTypeOf(signedTx).toEqualTypeOf<string>();
  });

  it('Should submit a singleton event tx', async () => {
    const utxos = await eventFactory.wallet.getUtxos();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    const signedTx = await eventFactory.signTx(unsignedTx);
    const txHash = await eventFactory.submitTx(signedTx);
    expect(txHash).toBeDefined();
    expectTypeOf(txHash).toEqualTypeOf<string>();

    const ref = {
      txHash: txHash,
      outputIndex: 0
    };
    const refUtxo = await eventFactory.getUtxosByOutRef([ref]);
    events.push(...refUtxo);
  });

  it('Should build a recreation event tx', async () => {
    const utxos = await eventFactory.wallet.getUtxos();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    expect(unsignedTx).toBeDefined();
    expectTypeOf(unsignedTx).toEqualTypeOf<string>();
  });

  it('Should sign a recreation event tx', async () => {
    const utxos = await eventFactory.wallet.getUtxos();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    const signedTx = await eventFactory.signTx(unsignedTx);
    expect(signedTx).toBeDefined();
    expectTypeOf(signedTx).toEqualTypeOf<string>();
  });

  it('Should submit a recreation event tx', async () => {
    const utxos = await eventFactory.wallet.getUtxos();
    const tokenName = 'Test Token';
    const unsignedTx = await eventFactory.mintSingleton(tokenName, utxos);
    const signedTx = await eventFactory.signTx(unsignedTx);
    const txHash = await eventFactory.submitTx(signedTx);
    expect(txHash).toBeDefined();
    expectTypeOf(txHash).toEqualTypeOf<string>();

    const ref = {
      txHash: txHash,
      outputIndex: 0
    };
    const refUtxo = await eventFactory.getUtxosByOutRef([ref]);
    events.push(...refUtxo);
  });
});
