import { Assets, generateSeedPhrase, Lucid } from 'lucid-cardano';

export async function generateAccount(assets: Assets) {
  const seedPhrase = generateSeedPhrase();
  return {
    seedPhrase,
    address: await (await Lucid.new(undefined, 'Preprod'))
      .selectWalletFromSeed(seedPhrase)
      .wallet.address(),
    assets
  };
}
