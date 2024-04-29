import { UTxO } from '@meshsdk/core';
import { C } from '../core';
import { AddressDetails, Assets, Credential, Script, UTxO as TransUtxo } from '../models';
export const meshUtxoToTransUtxo = (utxo: UTxO): TransUtxo => {
  return {
    txHash: utxo.input.txHash,
    outputIndex: utxo.input.outputIndex,
    assets: utxo.output.amount.reduce((acc, curr) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      acc[curr.unit] = BigInt(curr.quantity);
      return acc;
    }, {}),
    address: utxo.output.address,
    datumHash: undefined,
    datum: utxo.output.plutusData,
    scriptRef: undefined
  };
};

export function applyDoubleCborEncoding(script: string): string {
  try {
    C.PlutusV2Script.from_bytes(
      C.PlutusV2Script.from_bytes(fromHex(script)).bytes(),
    );
    return script;
  } catch (_e) {
    return toHex(C.PlutusV2Script.new(fromHex(script)).to_bytes());
  }
}

export function assetsToValue(assets: Assets): C.Value {
  const multiAsset = C.MultiAsset.new();
  const lovelace = assets["lovelace"];
  const units = Object.keys(assets);
  const policies = Array.from(
    new Set(
      units
        .filter((unit) => unit !== "lovelace")
        .map((unit) => unit.slice(0, 56)),
    ),
  );
  policies.forEach((policy) => {
    const policyUnits = units.filter((unit) => unit.slice(0, 56) === policy);
    const assetsValue = C.Assets.new();
    policyUnits.forEach((unit) => {
      assetsValue.insert(
        C.AssetName.new(fromHex(unit.slice(56))),
        C.BigNum.from_str(assets[unit].toString()),
      );
    });
    multiAsset.insert(C.ScriptHash.from_bytes(fromHex(policy)), assetsValue);
  });
  const value = C.Value.new(
    C.BigNum.from_str(lovelace ? lovelace.toString() : "0"),
  );
  if (units.length > 1 || !lovelace) value.set_multiasset(multiAsset);
  return value;
}

export function toScriptRef(script: Script): C.ScriptRef {
  switch (script.type) {
    case "Native":
      return C.ScriptRef.new(
        C.Script.new_native(C.NativeScript.from_bytes(fromHex(script.script))),
      );
    case "PlutusV1":
      return C.ScriptRef.new(
        C.Script.new_plutus_v1(
          C.PlutusV1Script.from_bytes(
            fromHex(applyDoubleCborEncoding(script.script)),
          ),
        ),
      );
    case "PlutusV2":
      return C.ScriptRef.new(
        C.Script.new_plutus_v2(
          C.PlutusV2Script.from_bytes(
            fromHex(applyDoubleCborEncoding(script.script)),
          ),
        ),
      );
    default:
      throw new Error("No variant matched.");
  }
}

export function fromHex(hex: string): Uint8Array {
  const matched = hex.match(/.{1,2}/g);
  return new Uint8Array(matched ? matched.map((byte) => parseInt(byte, 16)) : []);
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function addressFromHexOrBech32(address: string): C.Address {
  try {
    return C.Address.from_bytes(fromHex(address));
  } catch (_e) {
    try {
      return C.Address.from_bech32(address);
    } catch (_e) {
      throw new Error('Could not deserialize address.');
    }
  }
}

export function getAddressDetails(address: string): AddressDetails {
  // Base Address
  try {
    const parsedAddress = C.BaseAddress.from_address(addressFromHexOrBech32(address))!;
    const paymentCredential: Credential =
      parsedAddress.payment_cred().kind() === 0
        ? {
            type: 'Key',
            hash: toHex(parsedAddress.payment_cred().to_keyhash()!.to_bytes())
          }
        : {
            type: 'Script',
            hash: toHex(parsedAddress.payment_cred().to_scripthash()!.to_bytes())
          };
    const stakeCredential: Credential =
      parsedAddress.stake_cred().kind() === 0
        ? {
            type: 'Key',
            hash: toHex(parsedAddress.stake_cred().to_keyhash()!.to_bytes())
          }
        : {
            type: 'Script',
            hash: toHex(parsedAddress.stake_cred().to_scripthash()!.to_bytes())
          };
    return {
      type: 'Base',
      networkId: parsedAddress.to_address().network_id(),
      address: {
        bech32: parsedAddress.to_address().to_bech32(undefined),
        hex: toHex(parsedAddress.to_address().to_bytes())
      },
      paymentCredential,
      stakeCredential
    };
  } catch (_e) {
    /* pass */
  }

  // Enterprise Address
  try {
    const parsedAddress = C.EnterpriseAddress.from_address(addressFromHexOrBech32(address))!;
    const paymentCredential: Credential =
      parsedAddress.payment_cred().kind() === 0
        ? {
            type: 'Key',
            hash: toHex(parsedAddress.payment_cred().to_keyhash()!.to_bytes())
          }
        : {
            type: 'Script',
            hash: toHex(parsedAddress.payment_cred().to_scripthash()!.to_bytes())
          };
    return {
      type: 'Enterprise',
      networkId: parsedAddress.to_address().network_id(),
      address: {
        bech32: parsedAddress.to_address().to_bech32(undefined),
        hex: toHex(parsedAddress.to_address().to_bytes())
      },
      paymentCredential
    };
  } catch (_e) {
    /* pass */
  }

  // Pointer Address
  try {
    const parsedAddress = C.PointerAddress.from_address(addressFromHexOrBech32(address))!;
    const paymentCredential: Credential =
      parsedAddress.payment_cred().kind() === 0
        ? {
            type: 'Key',
            hash: toHex(parsedAddress.payment_cred().to_keyhash()!.to_bytes())
          }
        : {
            type: 'Script',
            hash: toHex(parsedAddress.payment_cred().to_scripthash()!.to_bytes())
          };
    return {
      type: 'Pointer',
      networkId: parsedAddress.to_address().network_id(),
      address: {
        bech32: parsedAddress.to_address().to_bech32(undefined),
        hex: toHex(parsedAddress.to_address().to_bytes())
      },
      paymentCredential
    };
  } catch (_e) {
    /* pass */
  }

  // Reward Address
  try {
    const parsedAddress = C.RewardAddress.from_address(addressFromHexOrBech32(address))!;
    const stakeCredential: Credential =
      parsedAddress.payment_cred().kind() === 0
        ? {
            type: 'Key',
            hash: toHex(parsedAddress.payment_cred().to_keyhash()!.to_bytes())
          }
        : {
            type: 'Script',
            hash: toHex(parsedAddress.payment_cred().to_scripthash()!.to_bytes())
          };
    return {
      type: 'Reward',
      networkId: parsedAddress.to_address().network_id(),
      address: {
        bech32: parsedAddress.to_address().to_bech32(undefined),
        hex: toHex(parsedAddress.to_address().to_bytes())
      },
      stakeCredential
    };
  } catch (_e) {
    /* pass */
  }

  // Limited support for Byron addresses
  try {
    const parsedAddress = ((address: string): C.ByronAddress => {
      try {
        return C.ByronAddress.from_bytes(fromHex(address));
      } catch (_e) {
        try {
          return C.ByronAddress.from_base58(address);
        } catch (_e) {
          throw new Error('Could not deserialize address.');
        }
      }
    })(address);

    return {
      type: 'Byron',
      networkId: parsedAddress.to_address().network_id(),
      address: {
        bech32: '',
        hex: toHex(parsedAddress.to_address().to_bytes())
      }
    };
  } catch (_e) {
    /* pass */
  }

  throw new Error('No address type matched for: ' + address);
}

export function utxoToCore(utxo: TransUtxo): C.TransactionUnspentOutput {
  const address: C.Address = (() => {
    try {
      return C.Address.from_bech32(utxo.address);
    } catch (_e) {
      return C.ByronAddress.from_base58(utxo.address).to_address();
    }
  })();
  const output = C.TransactionOutput.new(address, assetsToValue(utxo.assets));
  if (utxo.datumHash) {
    output.set_datum(C.Datum.new_data_hash(C.DataHash.from_bytes(fromHex(utxo.datumHash))));
  }
  // inline datum
  if (!utxo.datumHash && utxo.datum) {
    output.set_datum(C.Datum.new_data(C.PlutusData.from_bytes(fromHex(utxo.datum))));
  }

  if (utxo.scriptRef) {
    output.set_script_ref(toScriptRef(utxo.scriptRef));
  }

  return C.TransactionUnspentOutput.new(
    C.TransactionInput.new(
      C.TransactionHash.from_bytes(fromHex(utxo.txHash)),
      C.BigNum.from_str(utxo.outputIndex.toString())
    ),
    output
  );
}
export function fromText(text: string): string {
  return toHex(new TextEncoder().encode(text));
}
