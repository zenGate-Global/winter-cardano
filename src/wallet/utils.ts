import { UTxO } from '@meshsdk/core';
import { UTxO as TransUtxo } from 'translucent-cardano';
export const meshUtxoToTransUtxo = (utxo: UTxO): TransUtxo => {
  return {
    txHash: utxo.input.txHash,
    outputIndex: utxo.input.outputIndex,
    assets: utxo.output.amount.reduce((acc, curr) => {
      // @ts-ignore
      acc[curr.unit] = BigInt(curr.quantity);
      return acc;
    }, {}),
    address: utxo.output.address,
    datumHash: undefined,
    datum: utxo.output.plutusData,
    scriptRef: undefined
  };
};
