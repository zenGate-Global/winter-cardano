import {
  applyParamsToScript,
  byteString,
  conStr0,
  deserializeAddress,
  deserializeDatum,
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
  resolvePlutusScriptHash,
  resolveScriptHash,
  scriptHash,
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
  ObjectDatum,
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
    const deserializedAddr = deserializeAddress(this.feeAddress);
    const paymentCredential = pubKeyAddress(
      deserializedAddr.pubKeyHash,
      deserializedAddr.stakeCredentialHash,
      false
    );
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
      deserializedAddr.stakeCredentialHash,
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
  ): Promise<string> {
    // We create a transaction builder to build our recreate transaction.
    const txBuilder = new MeshTxBuilder({
      fetcher: this.fetcher,
      submitter: this.submitter,
      verbose: true
    });

    txBuilder.selectUtxosFrom(walletUtxos);

    utxos.forEach((utxo, index) => {
      let objectDatum: ObjectDatum;
      try {
        if (!utxo.output.plutusData) {
          throw new Error('No Plutus data in utxo.');
        }
        objectDatum = deserializeDatum<ObjectDatum>(utxo.output.plutusData);
      } catch (e) {
        throw new Error('Issue building ObjectDatum from CBOR string.');
      }

      if (objectDatum!.data_reference_hex.bytes === newDataReferences[index]) {
        throw new Error('data references cannot be the same');
      }

      const newObjectDatum = EventFactory.getObjectDatum(
        objectDatum!.protocol_version.int as number,
        newDataReferences[index],
        objectDatum!.event_creation_info_tx_hash.bytes === ''
          ? utxo.input.txHash
          : objectDatum!.event_creation_info_tx_hash.bytes,
        objectDatum!.signers_pk_hash.list.map((pkh) => pkh.bytes)
      );

      const outAmount = [
        {
          unit: utxo.output.amount.filter((t) => t.unit !== 'lovelace')[0].unit,
          quantity: utxo.output.amount.filter((t) => t.unit !== 'lovelace')[0].quantity
        }
      ];

      txBuilder
        .spendingPlutusScriptV2()
        .txIn(utxo.input.txHash, utxo.input.outputIndex)
        .txInInlineDatumPresent()
        .txInRedeemerValue(this.recreateRedeemer, 'JSON')
        .txInScript(this.objectEventContract.code)
        .requiredSignerHash(getAddressPublicKeyHash(signerAddress))
        .txOut(utxo.output.address, outAmount)
        .txOutInlineDatumValue(newObjectDatum, 'JSON');
    });

    walletUtxos.forEach((u) =>
      txBuilder.txInCollateral(
        u.input.txHash,
        u.input.outputIndex,
        u.output.amount,
        u.output.address
      )
    );

    txBuilder
      .txOut(this.feeAddress, [{ unit: 'lovelace', quantity: this.feeAmount.toString() }])
      .changeAddress(this.wallet.getChangeAddress());

    const unsignedTx = await txBuilder.complete();

    return unsignedTx;
  }

  public async spend(
    recipientAddress: string,
    signerAddress: string,
    walletUtxos: UTxO[],
    utxos: UTxO[],
    KOIOS_URL?: string,
    singletonContracts?: PlutusScript
  ): Promise<string> {
    if (!KOIOS_URL && !singletonContracts)
      throw new Error('either KOIOS_URL or singletonContracts must be provided');

    const cardanoKoiosClient = KOIOS_URL ? new Koios(KOIOS_URL) : undefined;

    // We create a transaction builder to build our spend transaction.
    const txBuilder = new MeshTxBuilder({
      fetcher: this.fetcher,
      submitter: this.submitter,
      verbose: true
    });

    txBuilder
      .selectUtxosFrom(walletUtxos)
      .requiredSignerHash(getAddressPublicKeyHash(signerAddress));

    for (let index = 0; index < utxos.length; index++) {
      // This just checks for valid datum structure, it does not actually use the value.
      try {
        if (!utxos[index].output.plutusData) {
          throw new Error('No Plutus data in utxo.');
        }
        deserializeDatum<ObjectDatum>(utxos[index].output.plutusData!);
        //getEventDatum(utxos[index].output.plutusData!);
      } catch (e) {
        throw new Error('Issue building ObjectDatum from CBOR string.');
      }

      const tokenId = utxos[index].output.amount.filter((k) => k.unit !== 'lovelace')[0].unit;
      const policyId = tokenId.substring(0, 56);
      const tokenName = tokenId.substring(56);

      const scriptBytes = cardanoKoiosClient
        ? (await cardanoKoiosClient.scriptInfo([policyId]))[0].bytes
        : singletonContracts!.code;

      const mintingScript = {
        version: 'V2',
        code: applyParamsToScript(scriptBytes, []) // What does this do?
      };

      txBuilder
        .spendingPlutusScriptV2()
        .txIn(utxos[index].input.txHash, utxos[index].input.outputIndex) // validator input which contains token
        .txInInlineDatumPresent()
        .txInRedeemerValue(this.spendRedeemer, 'JSON')
        .txInScript(this.objectEventContract.code)
        .mintPlutusScriptV2()
        .mint('-1', policyId, tokenName)
        .mintingScript(mintingScript.code)
        .mintRedeemerValue(this.mintRedeemer)
        .txOut(recipientAddress, []);
    }

    walletUtxos.forEach((u) =>
      txBuilder.txInCollateral(
        u.input.txHash,
        u.input.outputIndex,
        u.output.amount,
        u.output.address
      )
    );

    txBuilder
      .txOut(this.feeAddress, [{ unit: 'lovelace', quantity: this.feeAmount.toString() }])
      .changeAddress(this.wallet.getChangeAddress());

    const unsignedTxHex = await txBuilder.complete();

    txBuilder.reset();

    return unsignedTxHex;
  }

  public static getObjectDatum(
    protocolVersion: number,
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
