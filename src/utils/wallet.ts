import { deserializeAddress, IFetcher, ISubmitter, MeshWallet, Network } from '@meshsdk/core';

export function getWallet(
  network: string,
  mnemonic: string | string[],
  fetcher: IFetcher,
  submitter: ISubmitter
): MeshWallet {
  if (isValidNetwork(network)) {
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
  } else {
    throw new Error('Invalid network type.');
  }
}

function isValidNetwork(network: string): network is Network {
  const validNetworks: Network[] = ['mainnet', 'testnet', 'preview', 'preprod'];
  return validNetworks.includes(network as Network);
}

export function networkToId(network: Network): 0 | 1 {
  switch (network) {
    case 'mainnet':
      return 1;
    default:
      return 0;
  }
}

export function getAddressPublicKeyHash(address: string): string {
  return deserializeAddress(address).pubKeyHash;
}
