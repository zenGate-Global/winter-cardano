import {
	MeshTxBuilder,
	MeshWallet,
	applyCborEncoding,
	applyParamsToScript,
	byteString,
	conStr0,
	conStr1,
	deserializeDatum,
	integer,
	list,
	pubKeyHash,
	resolvePaymentKeyHash,
	resolveScriptHash,
	serializePlutusScript,
	stringToHex,
	tokenName,
	txOutRef,
} from "@meshsdk/core";

import type {
	Asset,
	Data,
	IEvaluator,
	IFetcher,
	ISubmitter,
	Network,
	PlutusData,
	PlutusScript,
	UTxO,
} from "@meshsdk/core";

import { WINTER_FEE, WINTER_FEE_ADDRESS_MAINNET, WINTER_FEE_ADDRESS_TESTNET } from "./utils/fee";

import type { ObjectDatum, ObjectDatumFields, ObjectDatumParameters, UtxoRefMap } from "./types";

import { VALIDATORS } from "./utils/plutus";

import { getAddressPublicKeyHash, getWallet, isValidNetwork, networkToId } from "./utils/wallet";

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
		evaluator?: IEvaluator,
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

		// Store empty redeemers.
		this.recreateRedeemer = conStr0([]);
		this.mintRedeemer = conStr0([]);
		this.spendRedeemer = conStr1([]) as PlutusData;
		this.burnRedeemer = conStr1([]) as PlutusData;

		// Apply parameters to the object event script.
		// a. The first parameter is the payment credential of the Winter fee address.
		// b. The second parameter is the fee amount.

		const vfk = resolvePaymentKeyHash(this.feeAddress);

		const serializedPaymentCredential: Data = {
			alternative: 0,
			fields: [vfk],
		};

		const objectEventContractWithParamsScriptBytes = applyParamsToScript(
			VALIDATORS.objectEvent.code,
			[serializedPaymentCredential, this.feeAmount],
			"Mesh",
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
			undefined,
			this.networkId,
			undefined,
		).address;
	}

	public async mintSingleton(
		name: string,
		utxos: UTxO[],
		objectDatum: ObjectDatum,
	): Promise<string> {
		if (utxos.length === 0) {
			throw new Error("No UTxOs provided.");
		}
		EventFactory.validateObjectDatum(objectDatum);
		try {
			// Apply parameters to the singleton script.
			// a. The first parameter is the token name of the singleton.
			// b. The second parameter is the output reference used for the one-shot minting policy.
			const hexName = stringToHex(name);
			const tName = tokenName(hexName);
			//const outputRef = outputReference(utxos[0].input.txHash, utxos[0].input.outputIndex);
			const outputRef = txOutRef(
				utxos[0]!.input.txHash, // TODO: Check these things.
				utxos[0]!.input.outputIndex,
			);
			const singletonContractWithParamsScriptBytes = applyParamsToScript(
				VALIDATORS.singletonMint.code,
				[tName, outputRef],
				"JSON",
			);

			// We save the contract in the EventFactory as a PlutusScript.
			const singletonContract = {
				version: VALIDATORS.singletonMint.version,
				code: singletonContractWithParamsScriptBytes,
			};

			// We generate the policy id from the parameterized script.
			const policyId = resolveScriptHash(singletonContract.code, singletonContract.version);

			// We create a transaction builder to build our minting transaction.
			const txBuilder = new MeshTxBuilder({
				fetcher: this.fetcher,
				submitter: this.submitter,
				evaluator: this.evaluator,
				verbose: true,
			});

			// The singleton script does not require any redeemer.
			txBuilder
				.selectUtxosFrom(utxos.slice(1))
				.txIn(
					utxos[0]!.input.txHash,
					utxos[0]!.input.outputIndex,
					utxos[0]!.output.amount,
					utxos[0]!.output.address,
					utxos[0]!.output.scriptRef ? utxos[0]!.output.scriptRef.length / 2 : 0,
				)
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
				.changeAddress(await this.wallet.getChangeAddress());

			// All inputs to the transaction will count as collateral utxos.
			const collateralUtxos = this.getCollateralUTxOs(utxos);
			collateralUtxos.forEach((u) =>
				txBuilder.txInCollateral(
					u.input.txHash,
					u.input.outputIndex,
					u.output.amount,
					u.output.address,
				),
			);

			// Complete the transaction building and obtain the unsigned transaction.
			const unsignedTxHex = await txBuilder.complete();
			txBuilder.reset();

			return unsignedTxHex;
		} catch (error) {
			throw error;
		}
	}

	public async deployReference(
		deploymentAddress: string,
		singletonName: string,
		utxoRef: {
			txHash: string;
			outputIndex: number;
		},
		utxos: UTxO[],
		deploySingleton = false,
	): Promise<string> {
		try {
			const hexName = stringToHex(singletonName);
			const tName = tokenName(hexName);
			const outputRef = txOutRef(utxoRef.txHash, utxoRef.outputIndex);
			const singletonContractWithParamsScriptBytes = applyParamsToScript(
				VALIDATORS.singletonMint.code,
				[tName, outputRef],
				"JSON",
			);

			const singletonContract = {
				version: VALIDATORS.singletonMint.version,
				code: singletonContractWithParamsScriptBytes,
			};

			const txBuilder = new MeshTxBuilder({
				fetcher: this.fetcher,
				submitter: this.submitter,
				evaluator: this.evaluator,
				verbose: true,
			});

			txBuilder.selectUtxosFrom(utxos);

			if (deploySingleton) {
				txBuilder
					.txOut(deploymentAddress, [])
					.txOutReferenceScript(singletonContract.code, singletonContract.version);
			}

			txBuilder
				.txOut(deploymentAddress, [])
				.txOutReferenceScript(this.objectEventContract.code, this.objectEventContract.version)
				.changeAddress(await this.wallet.getChangeAddress());

			// All inputs to the transaction will count as collateral utxos.
			const collateralUtxos = this.getCollateralUTxOs(utxos);
			collateralUtxos.forEach((u) =>
				txBuilder.txInCollateral(
					u.input.txHash,
					u.input.outputIndex,
					u.output.amount,
					u.output.address,
				),
			);

			// Complete the transaction building and obtain the unsigned transaction.
			const unsignedTxHex = await txBuilder.complete();
			txBuilder.reset();

			return unsignedTxHex;
		} catch (error) {
			throw error;
		}
	}

	public async recreate(
		signerAddress: string,
		walletUtxos: UTxO[],
		events: UTxO[],
		newDataReferences: string[],
		utxoRefMap: UtxoRefMap,
	): Promise<string> {
		if (walletUtxos.length === 0) {
			throw new Error("No wallet UTxOs provided.");
		}
		if (events.length === 0) {
			throw new Error("No event UTxOs provided.");
		}
		if (newDataReferences.length !== events.length) {
			throw new Error(
				`Data reference count does not match event count. Expected: ${events.length}, Received: ${newDataReferences.length}`,
			);
		}
		if (newDataReferences.some((reference) => reference.length === 0)) {
			throw new Error("Data references cannot be empty.");
		}
		// We create a transaction builder to build our recreate transaction.
		const txBuilder = new MeshTxBuilder({
			fetcher: this.fetcher,
			submitter: this.submitter,
			evaluator: this.evaluator,
			verbose: true,
		});

		// 1. Check that the event utxos have an object datum
		//    and that the data reference is different.
		// 2. Recreate ObjectDatum.
		// 3. Add recreated event to transaction.
		const addedUtxos = new Set<string>();

		for (let index = 0; index < events.length; index++) {
			const utxo = events[index]!;
			try {
				if (!utxo.output.plutusData) {
					throw new Error("No Plutus data in event utxo.");
				}

				let objectDatum: ObjectDatumFields = EventFactory.getObjectDatumFieldsFromPlutusCbor(
					utxo.output.plutusData,
				);

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
					signersPkHash: objectDatum!.signers_pk_hash.list.map((pkh) => pkh.bytes),
				};
				const newObjectDatum = EventFactory.getObjectDatumFromParams(params);

				// Make sure the event token is transferred to the new utxo.
				const tokenFilter = utxo.output.amount.filter((t) => t.unit !== "lovelace");

				if (tokenFilter.length !== 1) {
					throw new Error("Event UTxO must contain exactly one event token.");
				}
				const asset = tokenFilter.at(0)!;

				const outAmount: Asset[] = [asset];

				txBuilder
					.spendingPlutusScriptV2()
					.txIn(utxo.input.txHash, utxo.input.outputIndex)
					.txInInlineDatumPresent()
					.txInRedeemerValue(this.recreateRedeemer, "JSON")
					.txOut(utxo.output.address, outAmount)
					.txOutInlineDatumValue(newObjectDatum, "JSON");

				const utxoRef = utxoRefMap.get(asset.unit);

				if (utxoRef && utxoRef.objectEventScriptRef) {
					txBuilder.spendingTxInReference(
						utxoRef.objectEventScriptRef.txHash,
						utxoRef.objectEventScriptRef.outputIndex,
						(this.objectEventContract.code.length / 2).toString(),
					);
				} else {
					txBuilder.txInScript(this.objectEventContract.code);
				}

				addedUtxos.add(`${utxo.input.txHash}:${utxo.input.outputIndex}`);
			} catch (error) {
				throw error;
			}
		}

		if (addedUtxos.size !== events.length) {
			throw new Error(
				`Not all event UTxOs were included as inputs. Expected: ${events.length}, Added: ${addedUtxos.size}`,
			);
		}

		try {
			// Use the wallet utxos as collateral for the transaction.
			const collateralUtxos = this.getCollateralUTxOs(walletUtxos);
			collateralUtxos.forEach((u) =>
				txBuilder.txInCollateral(
					u.input.txHash,
					u.input.outputIndex,
					u.output.amount,
					u.output.address,
				),
			);

			// Add the WINTER fee as an output.
			txBuilder
				.txOut(this.feeAddress, [{ unit: "lovelace", quantity: this.feeAmount.toString() }])
				.changeAddress(await this.wallet.getChangeAddress())
				.selectUtxosFrom(walletUtxos)
				.requiredSignerHash(getAddressPublicKeyHash(signerAddress));

			const unsignedTx = await txBuilder.complete();

			txBuilder.reset();

			return unsignedTx;
		} catch (error) {
			throw error;
		}
	}

	public async spend(
		signerAddress: string,
		walletUtxos: UTxO[],
		events: UTxO[],
		utxoRefMap: UtxoRefMap,
	): Promise<string> {
		if (walletUtxos.length === 0) {
			throw new Error("No wallet UTxOs provided.");
		}
		if (events.length === 0) {
			throw new Error("No event UTxOs provided.");
		}
		// We create a transaction builder to build our spend transaction.
		const txBuilder = new MeshTxBuilder({
			fetcher: this.fetcher,
			submitter: this.submitter,
			evaluator: this.evaluator,
			verbose: true,
		});

		const addedUtxos = new Set<string>();

		for (let index = 0; index < events.length; index++) {
			const utxo = events[index]!;
			if (!utxo.output.plutusData) {
				throw new Error("No Plutus datum in event utxo.");
			}

			try {
				deserializeDatum<ObjectDatum>(utxo.output.plutusData!);
			} catch (error) {
				throw new Error("Issue building ObjectDatum from CBOR string.");
			}

			try {
				const tokenFilter = utxo.output.amount.filter((t) => t.unit !== "lovelace");

				if (tokenFilter.length !== 1) {
					throw new Error("Event UTxO must contain exactly one event token.");
				}

				const tokenId = tokenFilter.at(0)!.unit;
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

				const utxoRef = utxoRefMap.get(tokenId);

				txBuilder
					.spendingPlutusScriptV2()
					.txIn(
						utxo.input.txHash,
						utxo.input.outputIndex,
						utxo.output.amount,
						utxo.output.address,
						utxo.output.scriptRef ? utxo.output.scriptRef.length / 2 : 0,
					) // TODO: Check this. validator input which contains token

					.txInInlineDatumPresent()
					.txInRedeemerValue(this.spendRedeemer, "JSON");

				if (utxoRef && utxoRef.objectEventScriptRef) {
					txBuilder.spendingTxInReference(
						utxoRef.objectEventScriptRef.txHash,
						utxoRef.objectEventScriptRef.outputIndex,
						(this.objectEventContract.code.length / 2).toString(),
					);
				} else {
					txBuilder.txInScript(this.objectEventContract.code);
				}
				txBuilder.mintPlutusScriptV2().mint("-1", policyId, tokenName);

				if (utxoRef && utxoRef.singletonScriptRef) {
					txBuilder.mintTxInReference(
						utxoRef.singletonScriptRef.txHash,
						utxoRef.singletonScriptRef.outputIndex,
						(mintingScript.code.length / 2).toString(),
					);
				} else {
					txBuilder.mintingScript(mintingScript.code);
				}

				txBuilder.mintRedeemerValue(this.burnRedeemer, "JSON");

				addedUtxos.add(`${utxo.input.txHash}:${utxo.input.outputIndex}`);
			} catch (error) {
				throw error;
			}
		}

		if (addedUtxos.size !== events.length) {
			throw new Error(
				`Not all event UTxOs were included as inputs. Expected: ${events.length}, Added: ${addedUtxos.size}`,
			);
		}

		try {
			// Use the wallet utxos as collateral for the transaction.
			const collateralUtxos = this.getCollateralUTxOs(walletUtxos);
			collateralUtxos.forEach((u) =>
				txBuilder.txInCollateral(
					u.input.txHash,
					u.input.outputIndex,
					u.output.amount,
					u.output.address,
				),
			);

			// Add the WINTER fee as an output.
			txBuilder
				.txOut(this.feeAddress, [{ unit: "lovelace", quantity: this.feeAmount.toString() }])
				.changeAddress(await this.wallet.getChangeAddress())
				.selectUtxosFrom(walletUtxos)
				.requiredSignerHash(getAddressPublicKeyHash(signerAddress));

			const unsignedTxHex = await txBuilder.complete();

			txBuilder.reset();

			return unsignedTxHex;
		} catch (error) {
			throw error;
		}
	}

	public async getScriptInfo(scriptHash: string): Promise<string> {
		const response = await this.fetcher.get(`scripts/${scriptHash}/cbor`);
		return response.cbor as string;
	}

	private static validateObjectDatumValues(
		protocolVersion: unknown,
		dataReferenceHex: unknown,
		eventCreationInfoTxHash: unknown,
		signersPkHash: unknown,
	): void {
		if (
			typeof protocolVersion !== "bigint" &&
			(typeof protocolVersion !== "number" || !Number.isInteger(protocolVersion))
		) {
			throw new Error("Invalid protocol_version: expected an integer.");
		}
		if (typeof dataReferenceHex !== "string" || !/^(?:[0-9a-fA-F]{2})+$/.test(dataReferenceHex)) {
			throw new Error("Invalid data_reference: expected non-empty hexadecimal bytes.");
		}
		if (
			typeof eventCreationInfoTxHash !== "string" ||
			(eventCreationInfoTxHash !== "" && !/^[0-9a-fA-F]{64}$/.test(eventCreationInfoTxHash))
		) {
			throw new Error(
				"Invalid event_creation_info_tx_hash: expected empty bytes or a 32-byte hexadecimal hash.",
			);
		}
		if (!Array.isArray(signersPkHash) || signersPkHash.length === 0) {
			throw new Error("Invalid signers_pk_hash: expected at least one signer.");
		}
		if (
			!signersPkHash.every(
				(signer) => typeof signer === "string" && /^[0-9a-fA-F]{56}$/.test(signer),
			)
		) {
			throw new Error("Invalid signers_pk_hash: each signer must be a 28-byte hexadecimal hash.");
		}
	}

	private static validateObjectDatum(objectDatum: ObjectDatum): void {
		if (
			objectDatum?.constructor !== 0 ||
			!Array.isArray(objectDatum.fields) ||
			objectDatum.fields.length !== 4
		) {
			throw new Error("Invalid object datum: expected an ObjectDatum constructor.");
		}
		const [protocolVersion, dataReference, eventCreationInfo, signers] = objectDatum.fields;
		const signerList = signers?.list;
		EventFactory.validateObjectDatumValues(
			protocolVersion?.int,
			dataReference?.bytes,
			eventCreationInfo?.bytes,
			Array.isArray(signerList) ? signerList.map((signer) => signer?.bytes) : signerList,
		);
	}

	public static getObjectDatumFromParams(params: ObjectDatumParameters): ObjectDatum {
		EventFactory.validateObjectDatumValues(
			params.protocolVersion,
			params.dataReferenceHex,
			params.eventCreationInfoTxHash,
			params.signersPkHash,
		);
		return conStr0([
			integer(params.protocolVersion),
			byteString(params.dataReferenceHex),
			byteString(params.eventCreationInfoTxHash), // Note this does not check for the length of the transaction id hash from the blake2b_256 function (32 bytes).
			list(params.signersPkHash.map((key) => pubKeyHash(key))),
		]);
	}

	public static getObjectDatumFieldsFromObjectDatum(datum: ObjectDatum): ObjectDatumFields {
		return {
			protocol_version: datum.fields[0],
			data_reference_hex: datum.fields[1],
			event_creation_info_tx_hash: datum.fields[2],
			signers_pk_hash: datum.fields[3],
		};
	}

	public static getObjectDatumFieldsFromPlutusCbor(plutusCbor: string): ObjectDatumFields {
		const datum = deserializeDatum<ObjectDatum>(plutusCbor);
		return EventFactory.getObjectDatumFieldsFromObjectDatum(datum);
	}

	public async getWalletUtxos(): Promise<UTxO[]> {
		return await this.wallet.getUtxos();
	}

	public getWalletAddress(): Promise<string> {
		return this.wallet.getChangeAddress();
	}

	public async getAddressPkHash(): Promise<string> {
		return getAddressPublicKeyHash(await this.wallet.getChangeAddress());
	}

	public async getUtxosByOutRef(
		outRefs: { txHash: string; outputIndex: number }[],
	): Promise<UTxO[]> {
		const transactionHashes = [...new Set(outRefs.map((ref) => ref.txHash))];
		const fetchedUtxos = await Promise.all(
			transactionHashes.map((txHash) => this.fetcher.fetchUTxOs(txHash)),
		);
		const utxosByOutRef = new Map(
			fetchedUtxos.flat().map((utxo) => [`${utxo.input.txHash}#${utxo.input.outputIndex}`, utxo]),
		);
		return outRefs.map((ref) => {
			const key = `${ref.txHash}#${ref.outputIndex}`;
			const utxo = utxosByOutRef.get(key);
			if (!utxo) {
				throw new Error(`UTxO not found: ${key}`);
			}
			return utxo;
		});
	}

	public async signTx(unsignedTx: string): Promise<string> {
		return await this.wallet.signTx(unsignedTx);
	}

	public async submitTx(tx: string): Promise<string> {
		return await this.wallet.submitTx(tx);
	}

	public getCollateralUTxOs(
		utxos: UTxO[],
		requiredLovelaceAmount: bigint = BigInt(5_000_000),
	): UTxO[] {
		const pureAdaUtxos = utxos.filter((utxo) => {
			return utxo.output.amount.filter((a) => a.unit !== "lovelace").length === 0;
		});
		// Sort UTxOs by lovelace amount in descending order.
		pureAdaUtxos.sort((a, b) => {
			const aLovelace = BigInt(
				a.output.amount.find((asset) => asset.unit === "lovelace")!.quantity,
			);
			const bLovelace = BigInt(
				b.output.amount.find((asset) => asset.unit === "lovelace")!.quantity,
			);
			return aLovelace === bLovelace ? 0 : aLovelace > bLovelace ? -1 : 1;
		});
		let totalLovelace = BigInt(0);
		const selectedUtxos: UTxO[] = [];
		for (const utxo of pureAdaUtxos.slice(0, 3)) {
			const lovelaceAmount = BigInt(
				utxo.output.amount.find((asset) => asset.unit === "lovelace")!.quantity,
			);
			totalLovelace += lovelaceAmount;
			selectedUtxos.push(utxo);
			if (totalLovelace >= requiredLovelaceAmount) {
				break;
			}
		}
		if (totalLovelace < requiredLovelaceAmount) {
			throw new Error(
				`Insufficient collateral: required ${requiredLovelaceAmount} lovelace, selected ${totalLovelace} lovelace from at most 3 inputs.`,
			);
		}
		return selectedUtxos;
	}

	private validateInputs(network: string): void {
		if (!isValidNetwork(network)) {
			throw new Error("EventFactory Error: Cannot create instance, invalid network.");
		}
	}
}
