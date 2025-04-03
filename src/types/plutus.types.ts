import blueprint from './plutus.copy.json';

import { ConStr0, ByteString, ConStr1, Integer, PubKeyHash, List } from '@meshsdk/core';

const version = 'V2';
const networkId = 0; // 0 for testnet; 1 for mainnet

export type Credential = VerificationKeyCredential | ScriptCredential;

export type VerificationKeyCredential = ConStr0<[ByteString]>;

export type ScriptCredential = ConStr1<[ByteString]>;

export type Event = RecreateEvent | SpendEvent;

export type RecreateEvent = ConStr0<[]>;

export type SpendEvent = ConStr1<[]>;

export type ObjectDatum = ConStr0<[Integer, ByteString, ByteString, List<PubKeyHash>]>;

export type OutputReference = ConStr0<[ConStr0<[ByteString]>, Integer]>;

export type TransactionId = ConStr0<[ByteString]>;

export type Action = Mint | Burn;

export type Mint = ConStr0<[]>;

export type Burn = ConStr1<[]>;

interface Fields {
  $ref: string;
  title?: string;
}

interface AnyOf {
  title: string;
  dataType: string;
  index: number;
  fields?: Fields[]; // Made the fields optional to prevent error when fields are absent
}

interface DataTypeDefinitions {
  dataType: string;
  items?: {
    $ref: string;
  };
}

interface AnyOfDefinitions {
  title: string;
  description?: string;
  anyOf?: AnyOf[];
}

interface Parameter {
  title: string;
  schema: Fields;
}

interface Validators {
  title: string;
  datum?: {
    title: string;
    schema: Fields;
  };
  redeemer: {
    title: string;
    schema: Fields;
  };
  parameters: Parameter[];
  compiledCode: string;
  hash: string;
}

export interface PlutusJson {
  preamble: {
    title: string;
    description: string;
    version: string;
    plutusVersion: string;
    compiler: {
      name: string;
      version: string;
    };
    license: string;
  };
  validators: Validators[];
  definitions: {
    ByteArray: DataTypeDefinitions;
    Int: DataTypeDefinitions;
    List$ByteArray: DataTypeDefinitions;
    'aiken/transaction/OutputReference': AnyOfDefinitions;
    'aiken/transaction/TransactionId': AnyOfDefinitions;
    'aiken/transaction/credential/Credential': AnyOfDefinitions;
    'object_event/Event': AnyOfDefinitions;
    'singleton/Action': AnyOfDefinitions;
    'winter_protocol/datums/ObjectDatum': AnyOfDefinitions;
  };
}
