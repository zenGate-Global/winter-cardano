export interface UtxoReference {
	txHash: string;
	outputIndex: number;
}

export interface UtxoScriptReferences {
	singletonScriptRef: UtxoReference | undefined;
	objectEventScriptRef: UtxoReference | undefined;
}

export type UtxoRefMap = Map<string, UtxoScriptReferences>;
