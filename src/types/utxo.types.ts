export interface UtxoReference {
	txHash: string;
	outputIndex: number;
}

export interface UtxoScriptReferences {
	singletonScriptRef: UtxoReference;
	objectEventScriptRef: UtxoReference;
}

export type UtxoRefMap = Map<string, UtxoScriptReferences>;
