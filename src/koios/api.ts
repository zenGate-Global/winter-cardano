import type { ScriptInfo, UtxoInfo } from '../models';

export class Koios {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/[\\/]+$/, '');
  }

  async scriptInfo(scriptHashes: string[]): Promise<ScriptInfo[]> {
    const url = `${this.baseUrl}/script_info`;
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const body = JSON.stringify({ _script_hashes: scriptHashes });

    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }

  async assetUtxos(assets: string[]): Promise<UtxoInfo[]> {
    const url = `${this.baseUrl}/asset_utxos`;
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
    const assetList = assets.map((asset) => {
      const policyId = asset.slice(0, 56);
      const nameHex = asset.slice(56);
      return [policyId, nameHex];
    });

    const body = JSON.stringify({ _asset_list: assetList, _extended: true });

    // eslint-disable-next-line no-useless-catch
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  }
}
