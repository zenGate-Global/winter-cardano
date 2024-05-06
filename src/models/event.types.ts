export interface ObjectDatumParameters {
  protocolVersion: bigint;
  dataReference: string;
  eventCreationInfo: string;
  signers: Array<string>;
}

export type Validators = {
  objectEvent: {
    script: string;
    version: string;
  };
  singleton: {
    script: string;
    version: string;
  };
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
