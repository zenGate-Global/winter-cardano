import {
  Data,
  IEvaluator,
  IFetcher,
  IListener,
  ISubmitter,
  MeshTxBuilder,
  MeshWallet,
  UTxO,
  Network
} from '@meshsdk/core';
import {
  applyParamsToScript,
  getV2ScriptHash,
  mConStr0,
  mConStr1,
  serializeBech32Address,
  stringToHex,
  v2ScriptToBech32
} from '@meshsdk/mesh-csl';
import JSONbig from 'json-bigint';
import { C } from './core';
import { Data as TData } from './data';
import { WINTER_FEE, WINTER_FEE_ADDRESS_MAINNET, WINTER_FEE_ADDRESS_TESTNET } from './fee';
import { Koios } from './koios';
import type {
  BuilderData,
  ContractType,
  ObjectDatumParameters,
  PlutusJson,
  Seed,
  Validators
} from './models';
import { PLUTUSJSON } from './plutus';
import { getEventDatum } from './read';
import { fromHex, SeedWallet, toHex } from './wallet';
import { FromSeed, walletFromSeed } from './wallet';
import { getWallet } from './utils/wallet';

export function networkToId(network: Network): number {
  const networkIds: Record<Network, number> = {
    Preprod: 0,
    Preview: 1,
    Mainnet: 2,
    Custom: 3
  };

  return networkIds[network] ?? 3;
}

const ObjectDatum = TData.Object({
  protocol_version: TData.Integer(),
  data_reference: TData.Bytes(),
  event_creation_info: TData.Bytes(),
  signers: TData.Array(TData.Bytes())
});

type ObjectDatum = TData.Static<typeof ObjectDatum>;

export class EventFactory {
  public readonly feeAddress: string;
  public readonly provider: IFetcher & ISubmitter & IEvaluator & IListener;
  public readonly networkId: number;
  public readonly feeAmount: bigint;
  public readonly network: Network;
  public readonly plutusJson: PlutusJson;
  public readonly validators: Validators;
  public singletonContract: ContractType;
  public objectEventContract: ContractType;
  public objectEventContractAddress: string;
  public objectDatum: BuilderData;
  public readonly recreateRedeemer: Data;
  public readonly spendRedeemer: Data;
  public readonly mintRedeemer: Data;
  public readonly burnRedeemer: Data;
  private objectContractSetup: boolean = false;
  public readonly wallet: MeshWallet;

  constructor(
    provider: IFetcher & ISubmitter & IEvaluator & IListener,
    network: Network,
    mnemonic: string
  ) {
    this.wallet = getWallet(network, provider, provider, mnemonic);
    this.provider = provider;
    this.network = network;
    this.networkId = networkToId(network);

    this.feeAddress =
      this.networkId === 1 ? WINTER_FEE_ADDRESS_MAINNET : WINTER_FEE_ADDRESS_TESTNET;
    this.feeAmount = WINTER_FEE;

    this.plutusJson = PLUTUSJSON;
    this.validators = {
      objectEvent: {
        script: this.plutusJson.validators[0].compiledCode,
        version: 'V2'
      },
      singleton: {
        script: this.plutusJson.validators[1].compiledCode,
        version: 'V2'
      }
    };
    this.recreateRedeemer = mConStr0([]);
    this.mintRedeemer = mConStr0([]);
    this.spendRedeemer = mConStr1([]);
    this.burnRedeemer = mConStr1([]);

    const paymentCredential = serializeBech32Address(this.feeAddress).pubKeyHash;

    const serializedPaymentCredential = JSON.stringify({
      constructor: 0,
      fields: [{ bytes: paymentCredential }]
    });

    const serializedFeeAmount = JSONbig.stringify({ int: this.feeAmount });
    const objectEventBytes = applyParamsToScript(this.validators.objectEvent.script, [
      serializedPaymentCredential,
      serializedFeeAmount
    ]);
    this.objectEventContract = {
      type: 'V2',
      script: objectEventBytes
    };
    this.objectEventContractAddress = v2ScriptToBech32(
      objectEventBytes,
      undefined,
      networkToId(this.network)
    );
  }

  public async setObjectContract(objectDatumParameters: ObjectDatumParameters): Promise<this> {
    this.objectDatum = EventFactory.getObjectDatum(
      objectDatumParameters.protocolVersion,
      objectDatumParameters.dataReference,
      objectDatumParameters.eventCreationInfo,
      objectDatumParameters.signers
    );
    this.objectContractSetup = true;
    return this;
  }

  public async getWalletUtxos(): Promise<UTxO[]> {
    const walletAddress = await this.getWalletAddress();
    return this.getAddressUtxos(walletAddress);
  }

  public async getAddressUtxos(address: string): Promise<UTxO[]> {
    return this.provider.fetchAddressUTxOs(address);
  }

  public async getWalletAddress(): Promise<string> {
    return this.seedWallet.address();
  }

  public async getUtxosByOutRef(
    outRefs: { txHash: string; outputIndex: number }[]
  ): Promise<UTxO[]> {
    const groupedOutRefs: { [txHash: string]: number[] } = {};
    outRefs.forEach((ref) => {
      if (groupedOutRefs[ref.txHash]) {
        groupedOutRefs[ref.txHash].push(ref.outputIndex);
      } else {
        groupedOutRefs[ref.txHash] = [ref.outputIndex];
      }
    });

    const promises = Object.entries(groupedOutRefs).map(async ([txHash, outputIndexes]) => {
      const utxos = await this.provider.fetchUTxOs(txHash);
      return utxos.filter((utxo) => outputIndexes.includes(utxo.input.outputIndex));
    });

    const utxos = await Promise.all(promises);
    return utxos.flat();
  }

  public getAddressPK(address: string): string {
    return serializeBech32Address(address).pubKeyHash;
  }

  public async waitForTx(txHash: string): Promise<boolean> {
    return true;
  }

  public async mintSingleton(name: string, utxos: UTxO[]): Promise<C.Transaction> {
    if (!this.objectContractSetup)
      throw new Error('setObjectContract must be called before mintSingleton');

    const outRef = JSONbig.stringify({
      constructor: 0,
      fields: [
        { constructor: 0, fields: [{ bytes: utxos[0].input.txHash }] },
        { int: BigInt(utxos[0].input.outputIndex) }
      ]
    });
    const encodedName = JSON.stringify({ bytes: stringToHex(name) });

    const singletonBytes = applyParamsToScript(this.validators.singleton.script, [
      encodedName,
      outRef
    ]);

    this.singletonContract = { type: 'V2', script: singletonBytes };

    const policyId = getV2ScriptHash(singletonBytes);

    const txBuilder = new MeshTxBuilder({ fetcher: this.provider, submitter: this.provider });

    const tx = txBuilder
      .selectUtxosFrom(utxos)
      .mintPlutusScriptV2()
      .mint('1', policyId, stringToHex(name))
      .mintingScript(this.singletonContract.script)
      .mintRedeemerValue(mConStr0([]))
      .txOut(this.objectEventContractAddress, [
        { unit: policyId + stringToHex(name), quantity: '1' }
      ])
      .txOutInlineDatumValue(this.objectDatum.content, this.objectDatum.type)
      .changeAddress(await this.getWalletAddress());

    utxos.forEach((u) =>
      tx.txInCollateral(u.input.txHash, u.input.outputIndex, u.output.amount, u.output.address)
    );

    await tx.complete();
    const signedTx = tx.completeSigning();
    txBuilder.reset();

    return this.toTranslucentTransaction(signedTx);
  }

  public static getObjectDatum(
    protocolVersion: bigint,
    dataReference: string,
    eventCreationInfo: string,
    signers: string[]
  ): BuilderData {
    const data = {
      constructor: 0,
      fields: [
        { int: protocolVersion },
        { bytes: dataReference },
        { bytes: eventCreationInfo },
        { list: signers.map((key) => ({ bytes: key })) }
      ]
    };
    return {
      type: 'JSON',
      content: JSONbig.stringify(data)
    };
  }

  public async recreate(
    signerAddress: string,
    walletUtxos: UTxO[],
    utxos: UTxO[],
    newDataReferences: string[]
  ): Promise<C.Transaction> {
    const txBuilder = new MeshTxBuilder({ fetcher: this.provider, submitter: this.provider });

    const tx = txBuilder.selectUtxosFrom(walletUtxos);

    utxos.forEach((utxo, index) => {
      let objectDatum;
      try {
        if (!utxo.output.plutusData) {
          throw new Error();
        }
        objectDatum = getEventDatum(utxo.output.plutusData);
      } catch (e) {
        throw new Error('issue with datum');
      }

      if (objectDatum!.data_reference === newDataReferences[index]) {
        throw new Error('data references cannot be the same');
      }

      const newObjectDatum = TData.to<ObjectDatum>(
        {
          protocol_version: objectDatum!.protocol_version,
          data_reference: newDataReferences[index],
          event_creation_info:
            objectDatum!.event_creation_info === ''
              ? utxo.input.txHash
              : objectDatum!.event_creation_info,
          signers: objectDatum!.signers
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        ObjectDatum
      );
      const out = [
        {
          unit: utxo.output.amount.filter((t) => t.unit !== 'lovelace')[0].unit,
          quantity: utxo.output.amount.filter((t) => t.unit !== 'lovelace')[0].quantity
        }
      ];
      tx.spendingPlutusScriptV2()
        .txIn(utxo.input.txHash, utxo.input.outputIndex)
        .txInInlineDatumPresent()
        .txInRedeemerValue(mConStr0([]))
        .txInScript(this.objectEventContract.script)
        .requiredSignerHash(this.getAddressPK(signerAddress))
        .txOut(utxo.output.address, out)
        .txOutInlineDatumValue(newObjectDatum, 'CBOR');
    });

    walletUtxos.forEach((u) =>
      tx.txInCollateral(u.input.txHash, u.input.outputIndex, u.output.amount, u.output.address)
    );

    await tx
      .txOut(this.feeAddress, [{ unit: 'lovelace', quantity: this.feeAmount.toString() }])
      .changeAddress(await this.getWalletAddress())
      .complete();

    const signed = tx.completeSigning();
    txBuilder.reset();

    return this.toTranslucentTransaction(signed);
  }

  public async spend(
    recipientAddress: string,
    signerAddress: string,
    walletUtxos: UTxO[],
    utxos: UTxO[],
    KOIOS_URL?: string,
    singletonContracts?: ContractType
  ): Promise<C.Transaction> {
    if (!KOIOS_URL && !singletonContracts)
      throw new Error('either KOIOS_URL or singletonContracts must be provided');

    const cardanoKoiosClient = KOIOS_URL ? new Koios(KOIOS_URL) : undefined;

    const txBuilder = new MeshTxBuilder({
      fetcher: this.provider,
      submitter: this.provider,
      evaluator: this.provider
    });

    const tx = txBuilder
      .selectUtxosFrom(walletUtxos)
      .requiredSignerHash(serializeBech32Address(signerAddress).pubKeyHash);

    for (let index = 0; index < utxos.length; index++) {
      // just checks for valid datum structure, doesnt actually use the value
      try {
        if (!utxos[index].output.plutusData) {
          throw new Error();
        }
        getEventDatum(utxos[index].output.plutusData!);
      } catch (e) {
        throw new Error('issue with datum');
      }

      const tokenId = utxos[index].output.amount.filter((k) => k.unit !== 'lovelace')[0].unit;
      const policyId = tokenId.substring(0, 56);
      const tokenName = tokenId.substring(56);

      const scriptBytes = cardanoKoiosClient
        ? (await cardanoKoiosClient.scriptInfo([policyId]))[0].bytes
        : singletonContracts!.script;

      const mintingScript = {
        type: 'V2',
        script: applyParamsToScript(scriptBytes, [])
      };

      tx.spendingPlutusScriptV2()
        .txIn(utxos[index].input.txHash, utxos[index].input.outputIndex) // validator input which contains token
        .txInInlineDatumPresent()
        .txInRedeemerValue(mConStr1([]))
        .txInScript(this.objectEventContract.script)
        .mintPlutusScriptV2()
        .mint('-1', policyId, tokenName)
        .mintingScript(mintingScript.script)
        .mintRedeemerValue(mConStr1([]))
        .txOut(recipientAddress, []);
    }

    walletUtxos.forEach((u) =>
      tx.txInCollateral(u.input.txHash, u.input.outputIndex, u.output.amount, u.output.address)
    );

    await tx
      .txOut(this.feeAddress, [{ unit: 'lovelace', quantity: this.feeAmount.toString() }])
      .changeAddress(await this.getWalletAddress())
      .complete();

    const signedTx = tx.completeSigning();
    txBuilder.reset();

    return this.toTranslucentTransaction(signedTx);
  }

  private toTranslucentTransaction(txHex: string): C.Transaction {
    return C.Transaction.from_bytes(fromHex(txHex));
  }

  public async signTx(tx: C.Transaction): Promise<string> {
    const witnessSet = await this.seedWallet.signTx(tx);
    const witnessSetBuilder = C.TransactionWitnessSetBuilder.new();
    witnessSetBuilder.add_existing(witnessSet);
    witnessSetBuilder.add_existing(tx.witness_set());
    const signedTx = C.Transaction.new(tx.body(), witnessSetBuilder.build(), tx.auxiliary_data());
    return toHex(signedTx.to_bytes());
  }

  public async submitTx(tx: string): Promise<string> {
    return this.provider.submitTx(tx);
  }
}
