export type ScriptInfo = {
	script_hash: string;
	creation_tx_hash: string;
	type: string;
	value: never;
	bytes: string;
	size: number;
};

export interface UtxoInfo {
	tx_hash: string;
	tx_index: number;
	address: string;
	value: string;
	stake_address: string | null;
	payment_cred: string | null;
	epoch_no: number;
	block_height: number | null;
	block_time: number;
	datum_hash: string | null;
	inline_datum: {
		bytes: string;
		value: any | null;
	};
	reference_script: {
		hash: string;
		size: number;
		type: string;
		bytes: string;
		value: any | null;
	} | null;
	asset_list:
		| {
				decimals: number;
				quantity: string;
				policy_id: string;
				asset_name: string | null;
				fingerprint: string;
		  }[]
		| null;
	is_spent: boolean;
}
