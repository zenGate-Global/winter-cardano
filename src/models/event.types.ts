import { PlutusScript } from '@meshsdk/core';

export interface ObjectDatumParameters {
  protocolVersion: bigint;
  dataReference: string;
  eventCreationInfo: string;
  signers: Array<string>;
}

export type Validators = {
  objectEvent: PlutusScript;
  singleton: PlutusScript;
};

export interface Seed {
  seed: string;
  options?:
    | {
        addressType?: 'Base' | 'Enterprise' | undefined;
        accountIndex?: number | undefined;
        password?: string | undefined;
      }
    | undefined;
}

export type ContractType = { type: 'V1' | 'V2'; script: string };
