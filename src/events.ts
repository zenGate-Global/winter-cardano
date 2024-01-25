import {
  applyDoubleCborEncoding,
  applyParamsToScript,
  Constr,
  Data,
  fromText,
  Lucid,
  Network, OutRef,
  PrivateKey,
  Provider,
  SpendingValidator,
  TxComplete,
  UTxO
} from "lucid-cardano";
import {
  WINTER_FEE,
  WINTER_FEE_ADDRESS_MAINNET,
  WINTER_FEE_ADDRESS_TESTNET,
} from './fee';
import { Koios } from './koios/api';
import { ObjectDatumParameters, Seed, Validators } from "./models/event.types";
import { PlutusJson } from './models/plutus.types';
import { PLUTUSJSON } from './plutus';

const ObjectDatum = Data.Object({
  protocol_version: Data.Integer(),
  data_reference: Data.Bytes(),
  event_creation_info: Data.Bytes(),
  signers: Data.Array(Data.Bytes()),
});

type ObjectDatum = Data.Static<typeof ObjectDatum>;
export class EventFactory {
  public readonly feeAddress: string;
  public readonly feeAmount: bigint;
  public readonly isMainnet: boolean;
  public readonly network: Network;
  public readonly plutusJson: PlutusJson;
  public readonly validators: Validators;
  public objectEventContract: SpendingValidator;
  public objectEventContractAddress: string;
  public objectDatum: string;
  public readonly recreateRedeemer: string;
  public readonly spendRedeemer: string;
  public readonly mintRedeemer: string;
  public readonly burnRedeemer: string;
  private lucid: Lucid;
  private providerSetup: boolean = false;
  private objectContractSetup: boolean = false;

  constructor(network: Network) {
    this.network = network;
    this.isMainnet = network === 'Mainnet';
    this.feeAddress = this.isMainnet
      ? WINTER_FEE_ADDRESS_MAINNET
      : WINTER_FEE_ADDRESS_TESTNET;
    this.feeAmount = WINTER_FEE;
    this.plutusJson = PLUTUSJSON;
    this.validators = {
      objectEvent: {
        type: 'PlutusV2',
        script: this.plutusJson.validators[0].compiledCode,
      },
      singleton: {
        type: 'PlutusV2',
        script: this.plutusJson.validators[1].compiledCode,
      },
    };
    this.recreateRedeemer = Data.to(new Constr(0, []));
    this.mintRedeemer = Data.to(new Constr(0, []));
    this.spendRedeemer = Data.to(new Constr(1, []));
    this.burnRedeemer = Data.to(new Constr(1, []));
  }

  public async setProvider(
    provider: Provider,
    seed?: Seed,
    privateKey?: PrivateKey
  ): Promise<this> {
    if (!seed && !privateKey)
      throw new Error('either seed or privateKey must be set');
    this.lucid = await Lucid.new(provider, this.network);
    if (seed) {
      this.lucid.selectWalletFromSeed(seed.seed, seed.options);
    } else if (privateKey) {
      this.lucid.selectWalletFromPrivateKey(privateKey);
    }
    this.providerSetup = true;
    return this;
  }

  public async setObjectContract(
    objectDatumParameters: ObjectDatumParameters
  ): Promise<this> {
    if (!this.providerSetup)
      throw new Error('setProvider must be called before setObjectContract');

    const serializedPaymentCredential = new Constr(0, [
      this.lucid.utils.getAddressDetails(this.feeAddress).paymentCredential!
        .hash,
    ]);
    const objectEventBytes = applyParamsToScript(
      this.validators.objectEvent.script,
      [serializedPaymentCredential, this.feeAmount]
    );
    this.objectEventContract = {
      type: 'PlutusV2',
      script: objectEventBytes,
    }
    this.objectEventContractAddress = this.lucid.utils.validatorToAddress(this.objectEventContract);
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
    if (!this.providerSetup)
      throw new Error('setProvider must be called before getWalletUtxos');
    return this.lucid.wallet.getUtxos();
  }

  public async getWalletAddress(): Promise<string> {
    if (!this.providerSetup)
      throw new Error('setProvider must be called before getWalletAddress');
    return this.lucid.wallet.address();
  }

  public async getUtxosByOutRef(outRefs: OutRef[]): Promise<UTxO[]> {
    if (!this.providerSetup)
      throw new Error('setProvider must be called before getUtxosByOutRef');
    return this.lucid.utxosByOutRef(outRefs);
  }

  public getAddressPK(address: string): string {
    if (!this.providerSetup)
      throw new Error('setProvider must be called before getAddressPK');
    return this.lucid.utils.getAddressDetails(address).paymentCredential!.hash;
  }

  public async mintSingleton(name: string, utxos: UTxO[]): Promise<TxComplete> {
    if (!this.providerSetup || !this.objectContractSetup)
      throw new Error(
        'setProvider and setObjectContract must be called before mintSingleton'
      );

    const outRef = new Constr(0, [
      new Constr(0, [utxos[0].txHash]),
      BigInt(utxos[0].outputIndex),
    ]);

    const singletonBytes = applyParamsToScript(this.validators.singleton.script, [
      fromText(name),
      outRef,
    ]);

    const singletonContract = { type: 'PlutusV2', script: applyDoubleCborEncoding(singletonBytes) }

    const policyId = this.lucid.utils.validatorToScriptHash({
      type: 'PlutusV2',
      script: singletonBytes,
    });

    return this.lucid.newTx()
      .collectFrom(utxos)
      .attachMintingPolicy(singletonContract as never)
      .mintAssets(
        { [`${policyId}${fromText(name)}`]: BigInt(1) },
        this.mintRedeemer
      )
      .payToContract(
        this.objectEventContractAddress,
        {
          inline: this.objectDatum,
        },
        { lovelace: BigInt(3000000), [`${policyId}${fromText(name)}`]: BigInt(1) }
      )
      .complete();
  }

  public static getObjectDatum(
    protocolVersion: bigint,
    dataReference: string,
    eventCreationInfo: string,
    signers: string[]
  ): string {
    return Data.to<ObjectDatum>(
      {
        protocol_version: protocolVersion,
        data_reference: dataReference,
        event_creation_info: eventCreationInfo,
        signers: signers,
      },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      ObjectDatum
    );
  }

  public async recreate(
    signerAddress: string,
    utxos: UTxO[]
  ): Promise<TxComplete> {
    if (!this.providerSetup || !this.objectContractSetup)
      throw new Error(
        'setProvider and setObjectContract must be called before recreate'
      );

    const tx = await this.lucid
      .newTx()
      .collectFrom(utxos, this.recreateRedeemer)
      .addSigner(signerAddress);

    utxos.forEach((utxo) => {
      let objectDatum;
      try {
        objectDatum = Data.from<ObjectDatum>(
          utxo.datum!,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          ObjectDatum
        );
      } catch (e) {
        throw new Error('issue with datum');
      }
      const newObjectDatum = Data.to<ObjectDatum>(
        {
          protocol_version: objectDatum!.protocol_version,
          data_reference: objectDatum!.data_reference,
          event_creation_info:
            objectDatum!.event_creation_info === ''
              ? utxo.txHash
              : objectDatum!.event_creation_info,
          signers: objectDatum!.signers,
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        ObjectDatum
      );
      tx.payToContract(
        utxo.address,
        {
          inline: newObjectDatum,
        },
        utxo.assets
      );
    });

    return tx
      .payToAddress(
        this.isMainnet
          ? WINTER_FEE_ADDRESS_MAINNET
          : WINTER_FEE_ADDRESS_TESTNET,
        { lovelace: WINTER_FEE }
      )
      .attachSpendingValidator(this.objectEventContract)
      .complete();
  }

  public async spend(
    recipientAddress: string,
    KOIOS_URL: string,
    signerAddress: string,
    utxos: UTxO[]
  ) {
    if (!this.providerSetup || !this.objectContractSetup)
      throw new Error(
        'setProvider and setObjectContract must be called before spend'
      );

    const cardanoKoiosClient = new Koios(KOIOS_URL);

    const tx = await this.lucid.newTx().collectFrom(utxos, this.spendRedeemer);

    for (const utxo of utxos) {
      try {
        Data.from<ObjectDatum>(
          utxo.datum!,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          ObjectDatum
        );
      } catch (e) {
        throw new Error('issue with datum');
      }

      const tokenId = Object.keys(utxo.assets).filter(
        (k) => k !== 'lovelace'
      )[0];
      // const tokenName = tokenId.substring(56);
      const policyId = tokenId.substring(0, 56);

      const scriptBytes = (await cardanoKoiosClient.scriptInfo([policyId]))[0]
        .bytes;

      const validator = {
        type: 'PlutusV2',
        script: scriptBytes,
      };

      tx.payToAddress(recipientAddress, { lovelace: utxo.assets.lovelace })
        .attachMintingPolicy(validator as never)
        .mintAssets({ [tokenId]: BigInt(-1) }, this.burnRedeemer);
    }

    return tx
      .addSigner(signerAddress)
      .payToAddress(
        this.isMainnet
          ? WINTER_FEE_ADDRESS_MAINNET
          : WINTER_FEE_ADDRESS_TESTNET,
        { lovelace: WINTER_FEE }
      )
      .attachSpendingValidator(this.objectEventContract)
      .complete();
  }
}
