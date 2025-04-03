import {
  applyCborEncoding,
  applyParamsToScript,
  Asset,
  byteString,
  conStr0,
  deserializeAddress,
  deserializeDatum,
  IEvaluator,
  IFetcher,
  integer,
  ISubmitter,
  list,
  MeshTxBuilder,
  MeshWallet,
  Network,
  PlutusData,
  PlutusScript,
  pubKeyAddress,
  pubKeyHash,
  resolveScriptHash,
  serializePlutusScript,
  stringToHex,
  tokenName,
  txOutRef,
  UTxO
} from '@meshsdk/core';
import { WINTER_FEE, WINTER_FEE_ADDRESS_MAINNET, WINTER_FEE_ADDRESS_TESTNET } from './utils/fee';
import { Koios } from './koios';
import type {
  ObjectDatum,
  ObjectDatumFields,
  ObjectDatumParameters,
  PlutusJson,
  EventFactoryValidators
} from './types';
import { PLUTUSJSON } from './utils/plutus';
import { getAddressPublicKeyHash, getWallet, isValidNetwork, networkToId } from './utils/wallet';

export class EventFactory {
  // Winter protocol fee information.
  public readonly feeAddress: string;
  public readonly feeAmount: number;

  // Winter protocol raw Plutus scripts.
  public readonly plutusJson: PlutusJson;
  public readonly validators: EventFactoryValidators;

  // Winter protocol contracts with applied parameters,
  // specific to this instance of the EventFactory.
  public singletonContract: PlutusScript;
  public objectEventContract: PlutusScript;
  public objectEventContractAddress: string;
  public objectDatum: ObjectDatum;

  public readonly recreateRedeemer: PlutusData;
  public readonly spendRedeemer: PlutusData;
  public readonly mintRedeemer: PlutusData;
  public readonly burnRedeemer: PlutusData;

  private objectContractSetup: boolean = false;

  // Required EventFactory constructor information.
  public readonly wallet: MeshWallet;
  public readonly fetcher: IFetcher;
  public readonly submitter: ISubmitter;
  public readonly evaluator?: IEvaluator;
  public readonly network: Network;
  public readonly networkId: number;

  constructor(
    network: string,
    mnemonic: string | string[],
    fetcher: IFetcher,
    submitter: ISubmitter,
    evaluator?: IEvaluator
  ) {
    // Validate inputs
    this.validateInputs(network);
    this.network = network.toLowerCase() as Network;
    // Store wallet information.
    this.wallet = getWallet(this.network, mnemonic, fetcher, submitter);
    this.fetcher = fetcher;
    this.submitter = submitter;
    this.evaluator = evaluator;
    this.networkId = networkToId(this.network);

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
    //const outputRef = outputReference(utxos[0].input.txHash, utxos[0].input.outputIndex);
    const outputRef = txOutRef(utxos[0].input.txHash, utxos[0].input.outputIndex);
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
      evaluator: this.evaluator,
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
  }

  public async recreate(
    signerAddress: string,
    walletUtxos: UTxO[],
    events: UTxO[],
    newDataReferences: string[]
  ): Promise<string> {
    // We create a transaction builder to build our recreate transaction.
    const txBuilder = new MeshTxBuilder({
      fetcher: this.fetcher,
      submitter: this.submitter,
      verbose: true
    });

    txBuilder.selectUtxosFrom(walletUtxos);

    // 1. Check that the event utxos have an object datum
    //    and that the data reference is different.
    // 2. Recreate ObjectDatum.
    // 3. Add recreated event to transaction.
    events.forEach((utxo, index) => {
      let objectDatum: ObjectDatumFields;
      try {
        if (!utxo.output.plutusData) {
          throw new Error('No Plutus data in event utxo.');
        }
        objectDatum = EventFactory.getObjectDatumFieldsFromPlutusCbor(utxo.output.plutusData);
      } catch (e) {
        throw new Error('Issue building ObjectDatum from CBOR string.');
      }
      console.log('test_recreate_datum: ', objectDatum);

      if (objectDatum.data_reference_hex.bytes === newDataReferences[index]) {
        throw new Error('Data references cannot be the same.');
      }

      // Construct the new object datum.
      // All paremeters are recreated other than the data reference.
      const params: ObjectDatumParameters = {
        protocolVersion: objectDatum!.protocol_version.int as number,
        dataReferenceHex: newDataReferences[index],
        eventCreationInfoTxHash:
          objectDatum!.event_creation_info_tx_hash.bytes === ''
            ? utxo.input.txHash
            : objectDatum!.event_creation_info_tx_hash.bytes,
        signersPkHash: objectDatum!.signers_pk_hash.list.map((pkh) => pkh.bytes)
      };
      const newObjectDatum = EventFactory.getObjectDatumFromParams(params);

      // Make sure the event token is transferred to the new utxo.
      const outAmount: Asset[] = [
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

    // Use the wallet utxos as collateral for the transaction.
    walletUtxos.forEach((u) =>
      txBuilder.txInCollateral(
        u.input.txHash,
        u.input.outputIndex,
        u.output.amount,
        u.output.address
      )
    );

    // Add the WINTER fee as an output.
    txBuilder
      .txOut(this.feeAddress, [{ unit: 'lovelace', quantity: this.feeAmount.toString() }])
      .changeAddress(this.wallet.getChangeAddress());

    const unsignedTx = await txBuilder.complete();

    txBuilder.reset();

    return unsignedTx;
  }

  public async spend(
    recipientAddress: string, // This should be the WINTER fee address in the future.
    signerAddress: string,
    walletUtxos: UTxO[],
    events: UTxO[],
    KOIOS_URL?: string,
    singletonContracts?: PlutusScript[]
  ): Promise<string> {
    if (!KOIOS_URL && !singletonContracts)
      throw new Error('Either KOIOS_URL or singletonContracts must be provided.');

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

    for (let index = 0; index < events.length; index++) {
      // This just checks for valid datum structure, it does not actually use the value.
      try {
        if (!events[index].output.plutusData) {
          throw new Error('No Plutus datum in utxo.');
        }
        deserializeDatum<ObjectDatum>(events[index].output.plutusData!);
      } catch (e) {
        throw new Error('Issue building ObjectDatum from CBOR string.');
      }

      const tokenId = events[index].output.amount.filter((k) => k.unit !== 'lovelace')[0].unit;
      const policyId = tokenId.substring(0, 56);
      const tokenName = tokenId.substring(56);

      // We get the minting script because
      // only the script that minted the token
      // can burn the token.
      const scriptBytes = cardanoKoiosClient
        ? (await cardanoKoiosClient.scriptInfo([policyId]))[0].bytes
        : singletonContracts?.at(index)?.code;

      // Script requires double CBOR encoding.
      const mintingScript: PlutusScript = {
        version: 'V2',
        code: applyCborEncoding(scriptBytes as string)
      };

      txBuilder
        .spendingPlutusScriptV2()
        .txIn(events[index].input.txHash, events[index].input.outputIndex) // validator input which contains token
        .txInInlineDatumPresent()
        .txInRedeemerValue(this.spendRedeemer, 'JSON')
        .txInScript(this.objectEventContract.code)
        .mintPlutusScriptV2()
        .mint('-1', policyId, tokenName)
        .mintingScript(mintingScript.code)
        .mintRedeemerValue(this.mintRedeemer, 'JSON')
        .txOut(recipientAddress, []);
    }

    // Use the wallet utxos as collateral for the transaction.
    walletUtxos.forEach((u) =>
      txBuilder.txInCollateral(
        u.input.txHash,
        u.input.outputIndex,
        u.output.amount,
        u.output.address
      )
    );

    // Add the WINTER fee as an output.
    txBuilder
      .txOut(this.feeAddress, [{ unit: 'lovelace', quantity: this.feeAmount.toString() }])
      .changeAddress(this.wallet.getChangeAddress());

    const unsignedTxHex = await txBuilder.complete();

    txBuilder.reset();

    return unsignedTxHex;
  }

  public static getObjectDatumFromParams(params: ObjectDatumParameters): ObjectDatum {
    return conStr0([
      integer(params.protocolVersion),
      byteString(params.dataReferenceHex),
      byteString(params.eventCreationInfoTxHash), // Note this does not check for the length of the transaction id hash from the blake2b_256 function (32 bytes).
      list(params.signersPkHash.map((key) => pubKeyHash(key)))
    ]);
  }

  public static getObjectDatumFieldsFromObjectDatum(datum: ObjectDatum): ObjectDatumFields {
    return {
      protocol_version: datum.fields[0],
      data_reference_hex: datum.fields[1],
      event_creation_info_tx_hash: datum.fields[2],
      signers_pk_hash: datum.fields[3]
    };
  }

  public static getObjectDatumFieldsFromPlutusCbor(plutusCbor: string): ObjectDatumFields {
    const datum = deserializeDatum<ObjectDatum>(plutusCbor);
    return EventFactory.getObjectDatumFieldsFromObjectDatum(datum);
  }

  public setObjectContract(objectDatumParameters: ObjectDatumParameters): this {
    this.objectDatum = EventFactory.getObjectDatumFromParams(objectDatumParameters);
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

  static async waitForTx(txHash: string): Promise<boolean> {
    return true;
  }

  public async signTx(unsignedTx: string): Promise<string> {
    return await this.wallet.signTx(unsignedTx);
  }

  public async submitTx(tx: string): Promise<string> {
    return await this.wallet.submitTx(tx);
  }

  private validateInputs(network: string): void {
    if (!isValidNetwork(network)) {
      throw new Error('EventFactory Error: Cannot create instance, invalid network.');
    }
  }
}
