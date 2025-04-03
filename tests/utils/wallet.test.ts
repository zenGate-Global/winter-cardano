require('dotenv').config();
import { describe, test, it, expect, expectTypeOf } from 'vitest';
import {
  getAddressPublicKeyHash,
  getWallet,
  isValidNetwork,
  networkToId
} from '../../src/utils/wallet';
import { MaestroProvider, MeshWallet, Network } from '@meshsdk/core';

describe('Converting network type to id', () => {
  const testnets = ['testnet', 'preview', 'preprod'];
  const mainnet = 'mainnet';
  it('Should convert mainnet to 1', () => {
    expect(networkToId(mainnet as Network)).toEqual(1);
  });

  it('Should convert testnets to 0', () => {
    const applied = testnets.map((x) => networkToId(x as Network));
    const expected = [0, 0, 0];
    expect(applied).toEqual(expected);
  });
});

test('Valid networs sholuld be accepted', () => {
  const validNetworks = ['mainnet', 'testnet', 'preview', 'preprod'];
  const invalidNetworks = ['invalidnet', 'testnet2'];

  validNetworks.forEach((network) => {
    expect(isValidNetwork(network)).toBe(true);
  });

  invalidNetworks.forEach((network) => {
    expect(isValidNetwork(network)).toBe(false);
  });
});

test('Creating MeshWallet should work', () => {
  const provider = new MaestroProvider({
    network: 'Preview',
    apiKey: process.env.MAESTRO_KEY as string,
    turboSubmit: false
  });
  const network = 'preview';
  const mnemonic = MeshWallet.brew();
  const wallet = getWallet(network, mnemonic, provider, provider);
  expectTypeOf(wallet).toEqualTypeOf<MeshWallet>();
  expect(wallet).toBeDefined();
});

test('Getting address public key hash should work', () => {
  const provider = new MaestroProvider({
    network: 'Preview',
    apiKey: process.env.MAESTRO_KEY as string,
    turboSubmit: false
  });
  const network = 'preview';
  const mnemonic = MeshWallet.brew();
  const wallet = getWallet(network, mnemonic, provider, provider);
  const address = wallet.getChangeAddress();
  const pkHash = getAddressPublicKeyHash(address);
  expect(pkHash).toBeDefined();
  expectTypeOf(pkHash).toEqualTypeOf<string>();
});
