// import { Data as TData } from '../data';

import { ByteString, Integer, List, PubKeyHash } from '@meshsdk/core';

// export const ObjectDatum = TData.Object({
//   protocol_version: TData.Integer(),
//   data_reference: TData.Bytes(),
//   event_creation_info: TData.Bytes(),
//   signers: TData.Array(TData.Bytes())
// });

// export type ObjectDatum = TData.Static<typeof ObjectDatum>;

export type ObjectDatum = {
  protocol_version: Integer;
  data_reference_hex: ByteString;
  event_creation_info_tx_hash: ByteString;
  signers_pk_hash: List<PubKeyHash>;
};
