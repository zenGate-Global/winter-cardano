type ScriptInfo = {
  script_hash: string;
  creation_tx_hash: string;
  type: string;
  value: any;
  bytes: string;
  size: number;
};

export class Koios {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async scriptInfo(scriptHashes: string[]): Promise<ScriptInfo[]> {
    const url = `${this.baseUrl}script_info`;
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    const body = JSON.stringify({ _script_hashes: scriptHashes });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return response.json() as Promise<ScriptInfo[]>;
    } catch (error) {
      throw error;
    }
  }
}
