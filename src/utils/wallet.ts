import { IFetcher, ISubmitter, MeshWallet, Network } from '@meshsdk/core';

export function getWallet(
  network: Network,
  mnemonic: string | string[],
  fetcher: IFetcher,
  submitter: ISubmitter
): MeshWallet {
  const networkId = networkToId(network);
  return new MeshWallet({
    networkId,
    fetcher,
    submitter,
    key: {
      type: 'mnemonic',
      words: typeof mnemonic === 'string' ? mnemonic.split(' ') : mnemonic
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
