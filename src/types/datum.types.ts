import { ByteString, Integer, List, PubKeyHash } from '@meshsdk/core';

// Use this for deserializing the datum,
// since structural typing will let us use
// field names. We are forced to keep the
// Plutus Data JSON type however.
export type ObjectDatumFields = {
  protocol_version: Integer;
  data_reference_hex: ByteString;
  event_creation_info_tx_hash: ByteString;
  signers_pk_hash: List<PubKeyHash>;
};

// This object represents the ObjectDatum
// with TypeScript primitive types, which
// we use to initially create the datum.
export type ObjectDatumParameters = {
  protocolVersion: number;
  dataReferenceHex: string;
  eventCreationInfoTxHash: string;
  signersPkHash: string[];
};
