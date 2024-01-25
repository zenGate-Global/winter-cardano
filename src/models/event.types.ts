import { MintingPolicy, SpendingValidator } from 'lucid-cardano';

export interface ObjectDatumParameters {
  protocolVersion: bigint;
  dataReference: string;
  eventCreationInfo: string;
  signers: Array<string>;
}

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

export type Validators = {
  objectEvent: SpendingValidator;
  singleton: MintingPolicy;
};
