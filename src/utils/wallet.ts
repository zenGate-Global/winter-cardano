import { IFetcher, ISubmitter, MaestroProvider, MeshWallet, Network } from '@meshsdk/core';

export function getWallet(
  network: Network,
  fetcher: IFetcher,
  submitter: ISubmitter,
  mnemonic: string
): MeshWallet {
  const networkId = networkToId(network);
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

export function networkToId(network: Network): 0 | 1 {
  switch (network) {
    case 'mainnet':
      return 1;
    default:
      return 0;
  }
}
