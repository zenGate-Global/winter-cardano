import { IFetcher, ISubmitter, UTxO as MeshUTxO } from '@meshsdk/core';
import {
  AbstractWallet,
  Address,
  C,
  Delegation,
  KeyHash,
  Network,
  Payload,
  RewardAddress,
  SignedMessage,
  Transaction,
  TxHash,
  UTxO,
  utxoToCore
} from 'translucent-cardano';
import { meshUtxoToTransUtxo } from './utils';
import { discoverOwnUsedTxKeyHashes, walletFromSeed } from './wallet';

export class SeedWallet implements AbstractWallet {
  private address_: string;
  private rewardAddress_: string | null;
  private provider: IFetcher & ISubmitter;
  private paymentKeyHash: string;
  private stakeKeyHash: string;
  private privKeyHashMap: Record<string, string | null>;
  constructor(
    seed: string,
    network: Network,
    provider: IFetcher & ISubmitter,
    options?: {
      addressType?: 'Base' | 'Enterprise';
      accountIndex?: number;
      password?: string;
    }
  ) {
    const { address, rewardAddress, paymentKey, stakeKey } = walletFromSeed(seed, {
      addressType: options?.addressType || 'Base',
      accountIndex: options?.accountIndex || 0,
      password: options?.password,
      network: network
    });
    this.address_ = address;
    this.rewardAddress_ = rewardAddress;
    this.provider = provider;
    const paymentKeyHash = C.PrivateKey.from_bech32(paymentKey).to_public().hash().to_hex();
    this.paymentKeyHash = paymentKeyHash;
    const stakeKeyHash = stakeKey
      ? C.PrivateKey.from_bech32(stakeKey).to_public().hash().to_hex()
      : '';
    this.stakeKeyHash = stakeKeyHash;
    this.privKeyHashMap = {
      [paymentKeyHash]: paymentKey,
      [stakeKeyHash]: stakeKey
    };
  }

  async address(): Promise<Address> {
    return this.address_;
  }
  // deno-lint-ignore require-await
  async rewardAddress(): Promise<RewardAddress | null> {
    return this.rewardAddress_ || null;
  }
  // deno-lint-ignore require-await
  async getUtxos(): Promise<UTxO[]> {
    return (await this.provider.fetchAddressUTxOs(this.address_)).map(meshUtxoToTransUtxo);
  }
  async getUtxosCore(): Promise<C.TransactionUnspentOutputs> {
    const coreUtxos = C.TransactionUnspentOutputs.new();
    (await this.provider.fetchAddressUTxOs(this.address_)).forEach((utxo: MeshUTxO) => {
      coreUtxos.add(utxoToCore(meshUtxoToTransUtxo(utxo)));
    });
    return coreUtxos;
  }
  async getDelegation(): Promise<Delegation> {
    throw new Error('not implemented');
  }
  async signTx(tx: C.Transaction): Promise<C.TransactionWitnessSet> {
    const utxos = await this.getUtxos();
    const ownKeyHashes: Array<KeyHash> = [this.paymentKeyHash, this.stakeKeyHash];
    const usedKeyHashes = discoverOwnUsedTxKeyHashes(tx, ownKeyHashes, utxos);
    const txWitnessSetBuilder = C.TransactionWitnessSetBuilder.new();
    usedKeyHashes.forEach((keyHash) => {
      const witness = C.make_vkey_witness(
        C.hash_transaction(tx.body()),
        C.PrivateKey.from_bech32(this.privKeyHashMap[keyHash]!)
      );
      txWitnessSetBuilder.add_vkey(witness);
    });
    return txWitnessSetBuilder.build();
  }

  async submitTx(tx: Transaction): Promise<TxHash> {
    return await this.provider.submitTx(tx);
  }

  signMessage(address: Address | RewardAddress, payload: Payload): Promise<SignedMessage> {
    throw new Error('unimplemented');
  }
}
