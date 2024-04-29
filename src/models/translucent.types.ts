export type Network = 'Mainnet' | 'Preview' | 'Preprod' | 'Custom';
export type ScriptType = 'Native' | PlutusVersion;
export type PlutusVersion = 'PlutusV1' | 'PlutusV2';
export type Assets = Record<string | 'lovelace', bigint>;
export type Script = { type: ScriptType; script: string };
export type PaymentKeyHash = string;
export type StakeKeyHash = string;
export type KeyHash = string | PaymentKeyHash | StakeKeyHash;

export type Datum = string;
export type Exact<T> = T extends infer U ? U : never;
export type Json = any;
export type Redeemer = string; // Plutus Data (same as Datum)

export declare type Data =
  | string
  | number
  | bigint
  | Array<Data>
  | Map<Data, Data>
  | {
      alternative: number;
      fields: Array<Data>;
    };

export type Credential = {
  type: 'Key' | 'Script';
  hash: KeyHash | string;
};

export type Delegation = {
  poolId: string | null;
  rewards: bigint;
};

export type AddressType = 'Base' | 'Enterprise' | 'Pointer' | 'Reward' | 'Byron';

export type UTxO = {
  txHash: string;
  outputIndex: number;
  assets: Assets;
  address: string;
  datumHash?: string | null;
  datum?: string | null;
  scriptRef?: Script | null;
};

export type AddressDetails = {
  type: AddressType;
  networkId: number;
  address: { bech32: string; hex: string };
  paymentCredential?: Credential;
  stakeCredential?: Credential;
};

export declare type BuilderData =
  | {
      type: 'Mesh';
      content: Data;
    }
  | {
      type: 'JSON';
      content: string;
    }
  | {
      type: 'CBOR';
      content: string;
    };
