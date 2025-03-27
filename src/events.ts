import {
  applyParamsToScript,
  byteString,
  conStr0,
  deserializeAddress,
  hashByteString,
  IEvaluator,
  IFetcher,
  IListener,
  integer,
  ISubmitter,
  list,
  MeshTxBuilder,
  MeshWallet,
  Network,
  outputReference,
  PlutusData,
  PlutusScript,
  pubKeyAddress,
  pubKeyHash,
  resolveScriptHash,
  serializePlutusScript,
  stringToHex,
  tokenName,
  UTxO
} from '@meshsdk/core';
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
import { fromHex, fromText, SeedWallet, toHex } from './wallet';
import { FromSeed, walletFromSeed } from './wallet';
import { getAddressPublicKeyHash, getWallet, networkToId } from './utils/wallet';

// export function networkToId(network: Network): number {
//   const networkIds: Record<Network, number> = {
//     Preprod: 0,
//     Preview: 1,
//     Mainnet: 2,
//     Custom: 3
//   };

//   return networkIds[network] ?? 3;
// }

const ObjectDatum = TData.Object({
  protocol_version: TData.Integer(),
  data_reference: TData.Bytes(),
  event_creation_info: TData.Bytes(),
  signers: TData.Array(TData.Bytes())
});

type ObjectDatum = TData.Static<typeof ObjectDatum>;

export class EventFactory {
  // Winter protocol fee information.
  public readonly feeAddress: string;
  public readonly feeAmount: number;

  // Winter protocol raw Plutus scripts.
  public readonly plutusJson: PlutusJson;
  public readonly validators: Validators;

  // Winter protocol contracts with applied parameters,
  // specific to this instance of the EventFactory.
  public singletonContract: PlutusScript;
  public objectEventContract: PlutusScript;
  public objectEventContractAddress: string;
  public objectDatum: PlutusData;

  public readonly recreateRedeemer: PlutusData;
  public readonly spendRedeemer: PlutusData;
  public readonly mintRedeemer: PlutusData;
  public readonly burnRedeemer: PlutusData;

  private objectContractSetup: boolean = false;

  // Required EventFactory constructor information.
  public readonly wallet: MeshWallet;
  public readonly fetcher: IFetcher;
  public readonly submitter: ISubmitter;
  public readonly network: Network;
  public readonly networkId: number;

  constructor(
    network: Network,
    mnemonic: string | string[],
    fetcher: IFetcher,
    submitter: ISubmitter
  ) {
    // Store wallet information.
    this.wallet = getWallet(network, mnemonic, fetcher, submitter);
    this.fetcher = fetcher;
    this.submitter = submitter;
    this.network = network;
    this.networkId = networkToId(network);

    // Store Winter protocol fees.
    this.feeAddress =
      this.networkId === 1 ? WINTER_FEE_ADDRESS_MAINNET : WINTER_FEE_ADDRESS_TESTNET;
    this.feeAmount = WINTER_FEE;

    // Store Plutus script information.
    this.plutusJson = PLUTUSJSON;
    this.validators = {
      objectEvent: {
        code: this.plutusJson.validators[0].compiledCode,
        version: 'V2'
      },
      singleton: {
        code: this.plutusJson.validators[1].compiledCode,
        version: 'V2'
      }
    };

    // Store empty redeemers.
    this.recreateRedeemer = conStr0([]);
    this.mintRedeemer = conStr0([]);
    this.spendRedeemer = conStr0([]);
    this.burnRedeemer = conStr0([]);

    // Apply parameters to the object event script.
    // a. The first parameter is the payment credential of the Winter fee address.
    // b. The second parameter is the fee amount.
    const pubkeyHashBytes = deserializeAddress(this.feeAddress).pubKeyHash;
    const paymentCredential = pubKeyAddress(pubkeyHashBytes, undefined, false);
    const feeAmount = integer(this.feeAmount);
    const objectEventContractWithParamsScriptBytes = applyParamsToScript(
      this.validators.objectEvent.code,
      [paymentCredential, feeAmount],
      'JSON'
    );

    // We save the contract in the EventFactory as a PlutusScript
    this.objectEventContract = {
      version: this.validators.objectEvent.version,
      code: objectEventContractWithParamsScriptBytes
    };

    // We save the address of the object event,
    // which is the Bech32 encoding of the PlutusScript bytes.
    this.objectEventContractAddress = serializePlutusScript(
      this.objectEventContract,
      undefined,
      this.networkId,
      false
    ).address;
  }

  public async mintSingleton(name: string, utxos: UTxO[]): Promise<string> {
    if (!this.objectContractSetup)
      throw new Error('setObjectContract must be called before mintSingleton');

    // Apply parameters to the singleton script.
    // a. The first parameter is the token name of the singleton.
    // b. The second parameter is the output reference used for the one-shot minting policy.
    const hexName = stringToHex(name);
    const tName = tokenName(hexName);
    const outputRef = outputReference(utxos[0].input.txHash, utxos[0].input.outputIndex);
    const singletonContractWithParamsScriptBytes = applyParamsToScript(
      this.validators.singleton.code,
      [tName, outputRef],
      'JSON'
    );

    // We save the contract in the EventFactory as a PlutusScript.
    this.singletonContract = {
      version: this.validators.singleton.version,
      code: singletonContractWithParamsScriptBytes
    };

    // We generate the policy id from the parameterized script.
    const policyId = resolveScriptHash(this.singletonContract.code, this.singletonContract.version);

    // We create a transaction builder to build our minting transaction.
    const txBuilder = new MeshTxBuilder({
      fetcher: this.fetcher,
      submitter: this.submitter,
      verbose: true
    });

    // The singleton script does not require any redeemer.
    txBuilder
      .selectUtxosFrom(utxos)
      .mintPlutusScriptV2()
      .mint('1', policyId, hexName)
      .mintingScript(this.singletonContract.code)
      .mintRedeemerValue(this.mintRedeemer, 'JSON')
      .txOut(this.objectEventContractAddress, [
        {
          unit: policyId + hexName,
          quantity: '1'
        }
      ])
      .txOutInlineDatumValue(this.objectDatum, 'JSON')
      .changeAddress(this.wallet.getChangeAddress());

    // All inputs to the transaction will count as collateral utxos.
    utxos.forEach((u) =>
      txBuilder.txInCollateral(
        u.input.txHash,
        u.input.outputIndex,
        u.output.amount,
        u.output.address
      )
    );

    // Complete the transaction building and obtain the unsigned transaction.
    const unsignedTxHex = await txBuilder.complete();
    txBuilder.reset();
    return unsignedTxHex;

    // // Sign the transaction with the wallet associated with the EventFactory.
    // const signedTx = await this.wallet.signTx(unsignedTx)
    // txBuilder.reset();
    // Transaction
    // return this.toTranslucentTransaction(signedTx);
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

  public static getObjectDatum(
    protocolVersion: bigint,
    dataReferenceHex: string,
    eventCreationInfoTxHash: string,
    signersPkHash: string[]
  ): PlutusData {
    return conStr0([
      integer(protocolVersion),
      byteString(dataReferenceHex),
      byteString(eventCreationInfoTxHash), // Note this does not check for the length of the transaction id hash from the blake2b_256 function (32 bytes).
      list(signersPkHash.map((key) => pubKeyHash(key)))
    ]);
  }

  public setObjectContract(objectDatumParameters: ObjectDatumParameters): this {
    this.objectDatum = EventFactory.getObjectDatum(
      objectDatumParameters.protocolVersion,
      objectDatumParameters.dataReferenceHex,
      objectDatumParameters.eventCreationInfoTxHash,
      objectDatumParameters.signersPkHash
    );
    this.objectContractSetup = true;
    return this;
  }

  public getObjectContractSetupStatus(): boolean {
    return this.objectContractSetup;
  }

  public async getWalletUtxos(): Promise<UTxO[]> {
    return await this.wallet.getUtxos();
  }

  public getWalletAddress(): string {
    return this.wallet.getChangeAddress();
  }

  public getAddressPkHash(): string {
    return getAddressPublicKeyHash(this.wallet.getChangeAddress());
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
      const utxos = await this.fetcher.fetchUTxOs(txHash);
      return utxos.filter((utxo) => outputIndexes.includes(utxo.input.outputIndex));
    });

    const utxos = await Promise.all(promises);
    return utxos.flat();
  }

  public async waitForTx(txHash: string): Promise<boolean> {
    return true;
  }

  private toTranslucentTransaction(txHex: string): C.Transaction {
    return C.Transaction.from_bytes(fromHex(txHex));
  }

  // public async signTx(tx: C.Transaction): Promise<string> {
  //   const witnessSet = await this.seedWallet.signTx(tx);
  //   const witnessSetBuilder = C.TransactionWitnessSetBuilder.new();
  //   witnessSetBuilder.add_existing(witnessSet);
  //   witnessSetBuilder.add_existing(tx.witness_set());
  //   const signedTx = C.Transaction.new(tx.body(), witnessSetBuilder.build(), tx.auxiliary_data());
  //   return toHex(signedTx.to_bytes());
  // }

  public async signTx(unsignedTx: string): Promise<string> {
    return await this.wallet.signTx(unsignedTx);
  }

  public async submitTx(tx: string): Promise<string> {
    return await this.wallet.submitTx(tx);
  }
}
