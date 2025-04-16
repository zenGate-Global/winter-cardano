import {
  applyCborEncoding,
  applyParamsToScript,
  byteString,
  conStr0,
  deserializeAddress,
  deserializeDatum,
  integer,
  list,
  MeshTxBuilder,
  MeshWallet,
  pubKeyAddress,
  pubKeyHash,
  resolveScriptHash,
  serializePlutusScript,
  stringToHex,
  tokenName,
  txOutRef,
} from "@meshsdk/core";

import type {
  Asset,
  IEvaluator,
  IFetcher,
  ISubmitter,
  Network,
  PlutusData,
  PlutusScript,
  UTxO,
} from "@meshsdk/core";

import {
  WINTER_FEE,
  WINTER_FEE_ADDRESS_MAINNET,
  WINTER_FEE_ADDRESS_TESTNET,
} from "./utils/fee";

import type {
  ObjectDatum,
  ObjectDatumFields,
  ObjectDatumParameters,
  PlutusJson,
  EventFactoryValidators,
} from "./types";

import { VALIDATORS } from "./utils/plutus";

import {
  getAddressPublicKeyHash,
  getWallet,
  isValidNetwork,
  networkToId,
} from "./utils/wallet";

export class EventFactory {
  // Winter protocol fee information.
  public readonly feeAddress: string;
  public readonly feeAmount: number;

  // Winter protocol contracts with applied parameters,
  // specific to this instance of the EventFactory.
  public objectEventContract: PlutusScript;
  public objectEventContractAddress: string;

  public readonly recreateRedeemer: PlutusData;
  public readonly spendRedeemer: PlutusData;
  public readonly mintRedeemer: PlutusData;
  public readonly burnRedeemer: PlutusData;

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
      this.networkId === 1
        ? WINTER_FEE_ADDRESS_MAINNET
        : WINTER_FEE_ADDRESS_TESTNET;
    this.feeAmount = WINTER_FEE;

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
      VALIDATORS.objectEvent.code,
      [paymentCredential, feeAmount],
      "JSON"
    );

    // We save the contract in the EventFactory as a PlutusScript
    this.objectEventContract = {
      version: VALIDATORS.objectEvent.version,
      code: objectEventContractWithParamsScriptBytes,
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

  public async mintSingleton(
    name: string,
    utxos: UTxO[],
    objectDatum: ObjectDatum
  ): Promise<string> {
    try {
      // Apply parameters to the singleton script.
      // a. The first parameter is the token name of the singleton.
      // b. The second parameter is the output reference used for the one-shot minting policy.
      const hexName = stringToHex(name);
      const tName = tokenName(hexName);
      //const outputRef = outputReference(utxos[0].input.txHash, utxos[0].input.outputIndex);
      const outputRef = txOutRef(
        utxos[0]!.input.txHash, // TODO: Check these things.
        utxos[0]!.input.outputIndex
      );
      const singletonContractWithParamsScriptBytes = applyParamsToScript(
        VALIDATORS.singletonMint.code,
        [tName, outputRef],
        "JSON"
      );

      // We save the contract in the EventFactory as a PlutusScript.
      const singletonContract = {
        version: VALIDATORS.singletonMint.version,
        code: singletonContractWithParamsScriptBytes,
      };

      // We generate the policy id from the parameterized script.
      const policyId = resolveScriptHash(
        singletonContract.code,
        singletonContract.version
      );

      // We create a transaction builder to build our minting transaction.
      const txBuilder = new MeshTxBuilder({
        fetcher: this.fetcher,
        submitter: this.submitter,
        evaluator: this.evaluator,
        verbose: true,
      });

      // The singleton script does not require any redeemer.
      txBuilder
        .selectUtxosFrom(utxos)
        .mintPlutusScriptV2()
        .mint("1", policyId, hexName)
        .mintingScript(singletonContract.code)
        .mintRedeemerValue(this.mintRedeemer, "JSON")
        .txOut(this.objectEventContractAddress, [
          {
            unit: policyId + hexName,
            quantity: "1",
          },
        ])
        .txOutInlineDatumValue(objectDatum, "JSON")
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
    } catch (error) {
      console.log("Error minting singleton: ", error);
      throw error;
    }
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
      verbose: true,
    });

    // 1. Check that the event utxos have an object datum
    //    and that the data reference is different.
    // 2. Recreate ObjectDatum.
    // 3. Add recreated event to transaction.
    events.forEach((utxo, index) => {
      try {
        if (!utxo.output.plutusData) {
          throw new Error("No Plutus data in event utxo.");
        }

        let objectDatum: ObjectDatumFields =
          EventFactory.getObjectDatumFieldsFromPlutusCbor(
            utxo.output.plutusData
          );

        console.log("test_recreate_datum: ", objectDatum);

        if (!objectDatum) {
          throw new Error("Issue building ObjectDatum from CBOR string.");
        }

        if (objectDatum.data_reference_hex.bytes === newDataReferences[index]) {
          throw new Error("Data references cannot be the same.");
        }

        // Construct the new object datum.
        // All paremeters are recreated other than the data reference.
        const params: ObjectDatumParameters = {
          protocolVersion: objectDatum!.protocol_version.int as number,
          dataReferenceHex: newDataReferences[index]!, // TODO: Check these things.
          eventCreationInfoTxHash:
            objectDatum!.event_creation_info_tx_hash.bytes === ""
              ? utxo.input.txHash
              : objectDatum!.event_creation_info_tx_hash.bytes,
          signersPkHash: objectDatum!.signers_pk_hash.list.map(
            (pkh) => pkh.bytes
          ),
        };
        const newObjectDatum = EventFactory.getObjectDatumFromParams(params);

        // Make sure the event token is transferred to the new utxo.
        const tokenFilter = utxo.output.amount.filter(
          (t) => t.unit !== "lovelace"
        );

        if (!tokenFilter || tokenFilter.length == 0) {
          throw new Error("No event token found.");
        }
        const asset = tokenFilter.at(0)!;

        const outAmount: Asset[] = [asset];

        txBuilder
          .spendingPlutusScriptV2()
          .txIn(utxo.input.txHash, utxo.input.outputIndex)
          .txInInlineDatumPresent()
          .txInRedeemerValue(this.recreateRedeemer, "JSON")
          .txInScript(this.objectEventContract.code)
          .requiredSignerHash(getAddressPublicKeyHash(signerAddress))
          .txOut(utxo.output.address, outAmount)
          .txOutInlineDatumValue(newObjectDatum, "JSON");
      } catch (error) {
        console.log("Error building recreate transaction: ", error);
        throw error;
      }
    });

    try {
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
        .txOut(this.feeAddress, [
          { unit: "lovelace", quantity: this.feeAmount.toString() },
        ])
        .changeAddress(this.wallet.getChangeAddress())
        .selectUtxosFrom(walletUtxos);

      const unsignedTx = await txBuilder.complete();

      txBuilder.reset();

      return unsignedTx;
    } catch (error) {
      console.log("Error building recreate transaction: ", error);
      throw error;
    }
  }

  public async spend(
    recipientAddress: string, // This should be the WINTER fee address in the future.
    signerAddress: string,
    walletUtxos: UTxO[],
    events: UTxO[]
  ): Promise<string> {
    // We create a transaction builder to build our spend transaction.
    const txBuilder = new MeshTxBuilder({
      fetcher: this.fetcher,
      submitter: this.submitter,
      verbose: true,
    });

    txBuilder
      .selectUtxosFrom(walletUtxos)
      .requiredSignerHash(getAddressPublicKeyHash(signerAddress));

    for (let index = 0; index < events.length; index++) {
      // This just checks for valid datum structure, it does not actually use the value.
      try {
        const event = events[index];
        if (!event?.output.plutusData) {
          // TODO: Check this.
          throw new Error("No Plutus datum in utxo.");
        }
        deserializeDatum<ObjectDatum>(event?.output.plutusData); // TODO: Check this.
      } catch (e) {
        console.log(e);
        throw new Error("Issue building ObjectDatum from CBOR string.");
      }

      const tokenId = events[index]!.output.amount.filter(
        (k) => k.unit !== "lovelace"
      )[0]!.unit; // TODO: Check this.
      const policyId = tokenId.substring(0, 56);
      const tokenName = tokenId.substring(56);

      // We get the minting script because
      // only the script that minted the token
      // can burn the token.
      const scriptBytes = await this.getScriptInfo(policyId);

      // Script requires double CBOR encoding.
      const mintingScript: PlutusScript = {
        version: "V2",
        code: applyCborEncoding(scriptBytes),
      };

      txBuilder
        .spendingPlutusScriptV2()
        .txIn(events[index]!.input.txHash, events[index]!.input.outputIndex) // TODO: Check this. validator input which contains token
        .txInInlineDatumPresent()
        .txInRedeemerValue(this.spendRedeemer, "JSON")
        .txInScript(this.objectEventContract.code)
        .mintPlutusScriptV2()
        .mint("-1", policyId, tokenName)
        .mintingScript(mintingScript.code)
        .mintRedeemerValue(this.mintRedeemer, "JSON")
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
      .txOut(this.feeAddress, [
        { unit: "lovelace", quantity: this.feeAmount.toString() },
      ])
      .changeAddress(this.wallet.getChangeAddress());

    const unsignedTxHex = await txBuilder.complete();

    txBuilder.reset();

    return unsignedTxHex;
  }

  public async getScriptInfo(scriptHash: string): Promise<string> {
    const url = `https://cardano-${this.network}.blockfrost.io/api/v0/scripts/${scriptHash}/cbor`;
    const response = await this.fetcher.get(url);
    console.log("getScriptInfo: ", response);
    return response.cbor as string;
  }

  public static getObjectDatumFromParams(
    params: ObjectDatumParameters
  ): ObjectDatum {
    return conStr0([
      integer(params.protocolVersion),
      byteString(params.dataReferenceHex),
      byteString(params.eventCreationInfoTxHash), // Note this does not check for the length of the transaction id hash from the blake2b_256 function (32 bytes).
      list(params.signersPkHash.map((key) => pubKeyHash(key))),
    ]);
  }

  public static getObjectDatumFieldsFromObjectDatum(
    datum: ObjectDatum
  ): ObjectDatumFields {
    return {
      protocol_version: datum.fields[0],
      data_reference_hex: datum.fields[1],
      event_creation_info_tx_hash: datum.fields[2],
      signers_pk_hash: datum.fields[3],
    };
  }

  public static getObjectDatumFieldsFromPlutusCbor(
    plutusCbor: string
  ): ObjectDatumFields {
    const datum = deserializeDatum<ObjectDatum>(plutusCbor);
    return EventFactory.getObjectDatumFieldsFromObjectDatum(datum);
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
        groupedOutRefs[ref.txHash]!.push(ref.outputIndex); // TODO: Check this.
      } else {
        groupedOutRefs[ref.txHash] = [ref.outputIndex];
      }
    });

    const promises = Object.entries(groupedOutRefs).map(
      async ([txHash, outputIndexes]) => {
        const utxos = await this.fetcher.fetchUTxOs(txHash);
        return utxos.filter((utxo) =>
          outputIndexes.includes(utxo.input.outputIndex)
        );
      }
    );

    const utxos = await Promise.all(promises);
    return utxos.flat();
  }

  public async signTx(unsignedTx: string): Promise<string> {
    return await this.wallet.signTx(unsignedTx);
  }

  public async submitTx(tx: string): Promise<string> {
    return await this.wallet.submitTx(tx);
  }

  private validateInputs(network: string): void {
    if (!isValidNetwork(network)) {
      throw new Error(
        "EventFactory Error: Cannot create instance, invalid network."
      );
    }
  }
}
