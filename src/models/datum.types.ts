import { Data as TData } from '../data';

export const ObjectDatum = TData.Object({
  protocol_version: TData.Integer(),
  data_reference: TData.Bytes(),
  event_creation_info: TData.Bytes(),
  signers: TData.Array(TData.Bytes())
});

export type ObjectDatum = TData.Static<typeof ObjectDatum>;
