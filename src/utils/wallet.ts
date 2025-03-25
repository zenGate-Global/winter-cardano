import { IFetcher, ISubmitter, MaestroProvider, MeshWallet, Network } from '@meshsdk/core';

export function getWallet(
  networkId: 0 | 1,
  fetcher: IFetcher,
  submitter: ISubmitter,
  mnemonic: string
): MeshWallet {
  return new MeshWallet({
    networkId,
    fetcher,
    submitter,
    key: {
      type: 'mnemonic',
      words: mnemonic.split(' ')
    }
  });
}
