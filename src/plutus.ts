import type { PlutusJson } from './models';

export const PLUTUSJSON: PlutusJson = {
  preamble: {
    title: 'zengate/winter_protocol',
    description: "Aiken contracts for project 'zengate/winter_protocol'",
    version: '0.0.0',
    plutusVersion: 'v2',
    compiler: {
      name: 'Aiken',
      version: 'v1.0.26-alpha+075668b'
    },
    license: 'Apache-2.0'
  },
  validators: [
    {
      title: 'object_event.object_event',
      datum: {
        title: 'datum',
        schema: {
          $ref: '#/definitions/winter_protocol~1datums~1ObjectDatum'
        }
      },
      redeemer: {
        title: 'redeemer',
        schema: {
          $ref: '#/definitions/object_event~1Event'
        }
      },
      parameters: [
        {
          title: 'payment_credential',
          schema: {
            $ref: '#/definitions/aiken~1transaction~1credential~1Credential'
          }
        },
        {
          title: 'fee_value_lovelace',
          schema: {
            $ref: '#/definitions/Int'
          }
        }
      ],
      compiledCode:
        '5906e40100003232323232323222322323232232322533300c3232533300e3005300f375400226464646464646464646464646464646464646464646464a66604a6040604c6ea807454ccc094c94ccc098c084c09cdd5000899192999814181198149baa00113232533302a3021302b3754002264a666056604c60586ea80044c8c94ccc0b4cdc4a410112f4601e6eacc084c0bcdd50010a999816800899299981719b8748010c0bcdd5000899299981799b87375a603860626ea80acdd6980e18189baa0011533302f33302f3371e6eb8c08cc0c4dd50159bae302330313754002941288a999817a99981799b8f375c603260626ea80ad2210013371e6eb8c064c0c4dd50009bae301c30313754603860626ea8c070c0c4dd5004899b8f375c603260626ea8004dd7180c98189baa02b13375e601660626ea80acc02cc0c4dd50008a5014a02940c8c8008c0a4004c0ccc0c0dd50008b180b98179baa00214a02940c08cc044c040c03cdd5981018171baa0013030302d37540022c60266602c664466030004464a66605c604a605e6ea80044cdc78019bae3033303037540022940c068c0bcdd5180d18179baa0013758602860586ea8c05cc0b0dd500f9bae302f302c3754002466016601e6eacc07cc0b4dd50008018b180b18159baa3016302b3754603a60566ea800cdd7181698151baa001163004300b300a3756603660526ea8c06cc0a4dd5000981598141baa001163300337586024604e6ea8c048c09cdd500d00b8a99981299802180918139baa01a37586002604e6ea80844ccc0180680900885280a50153330253232533302730223028375400226464a666052604860546ea80044c8c94ccc0b8c0c40084c94ccc0b0c08cc044c0400144cdc3800a40022940dd698168008b1817800992999815181098159baa00114bd6f7b63009bab302f302c37540026602e66028008910100375c605c60566ea800458c014c030004c028dd5980d98149baa301b30293754605860526ea800458cc010dd6180998141baa3013302837540360306eacc0a8c0acc0acc0acc0acc09cdd5181518139baa01a1533302533300601a0240221330043012302737540346eb0c004c09cdd50108a5014a0460546056605660560024a66604e0022980103d87a8000130133302830290014bd701119198008008019129998148008a60103d87a80001323253330283375e602a60546ea80080144c05ccc0b00092f5c0266008008002605a00460560024464646600200200644a66605200229404c94ccc09ccc01c010dd718160010a51133003003001302c0013758605060526052605260526052605260526052604a6ea800888c8cc00400400c894ccc09c004528099299981299b8f375c605400400829444cc00c00c004c0a8004888c8c94ccc090c07cc094dd50008992999812980e18060018a99981298101805180498041bab301930273754002266e24010c01cdd5980c98139baa00114a02940c0a4c098dd50008b1806000998071bac300c30243754601e60486ea800c8cdd7980818129baa301030253754002006464a666040602e60426ea8004520001375a604a60446ea8004c94ccc080c05cc084dd50008a6103d87a8000132330010013756604c60466ea8008894ccc094004530103d87a8000132323253330253371e91100375c604c00626028660526ea00052f5c026600a00a0046eb4c098008c0a4008c09c004cc034005220100233009001489002300d001300100122533301f0011480004cdc024004660040046044002600200244a66603a00229000099b8048008cc008008c08000494ccc06c0045300103d87a8000130073301c301d0014bd701180e180e980e80091191980080080191299980e0008a5eb7bdb1804c8c8c8c94ccc074cdc7803801080189981099bb037520046e98004cc01801800cdd5980f0019bae301c0023020002301e00122323300100100322533301b00114bd7009919299980d180280109980f00119802002000899802002000980f801180e8009180c80091191980080080191299980c8008a60103d87a8000132323253330193371e00c6eb8c06800c4c020cc074dd3000a5eb804cc014014008dd5980d001180e801180d8009ba548000c004004894ccc05000452f5c026602a6024602c00266004004602e002602660206ea8004528180098079baa00223012301300114984d958c94ccc02cc01800454ccc038c034dd50018a4c2c2a66601660040022a66601c601a6ea800c5261616300b37540046e1d200230010032533300730023008375400226464646464646464a666024602a00426493191980080080111299980a0008a4c2646600600660300046eb8c05800458dd6180980098098011bae30110013011002375c601e002601e0046eb4c034004c024dd50008b1b8748000dd6800ab9a5573aaae7955cfaba05742ae89',
      hash: '194b693a61ff0de6f07d8b47016f9c368793de6e7ad53584c1deafce'
    },
    {
      title: 'singleton.singleton_mint_and_burn',
      redeemer: {
        title: 'rdmr',
        schema: {
          $ref: '#/definitions/singleton~1Action'
        }
      },
      parameters: [
        {
          title: 'token_name',
          schema: {
            $ref: '#/definitions/ByteArray'
          }
        },
        {
          title: 'utxo_ref',
          schema: {
            $ref: '#/definitions/aiken~1transaction~1OutputReference'
          }
        }
      ],
      compiledCode:
        '5901bf010000323232323232322322232323225333009323232533300c3007300d3754002264646464a666026602c00426464a666024601a60266ea803854ccc048c8cc004004018894ccc05c004528099299980a99baf301a30173754603400402429444cc00c00c004c06800454ccc048c0300044cdc78010080a5016153330123370e0029000899b8f00201014a06eb4c04c008dd718088008b180a0009991192999808980598091baa00114bd6f7b63009bab301630133754002646600200200644a66602a0022980103d87a8000132323253330153371e00c6eb8c05800c4cdd2a4000660326e980052f5c026600a00a0046eacc058008c064008c05c004c8cc004004dd5980a180a980a980a980a8019129998098008a5eb7bdb1804c8c8c8c94ccc050cdc7a45000021003133018337606ea4008dd3000998030030019bab3015003375c6026004602e004602a0026eb8c04cc040dd50019bac3012001300e37540042c60206022004601e00260166ea80045261365632533300830030011533300b300a37540082930b0a99980418010008a99980598051baa00414985858c020dd50019b8748008dc3a40006eb80055cd2ab9d5573caae7d5d02ba15745',
      hash: '4cae53530b56cbc892093253603dbd30ceee7c8ed3855408d5448b75'
    }
  ],
  definitions: {
    ByteArray: {
      dataType: 'bytes'
    },
    Int: {
      dataType: 'integer'
    },
    List$ByteArray: {
      dataType: 'list',
      items: {
        $ref: '#/definitions/ByteArray'
      }
    },
    'aiken/transaction/OutputReference': {
      title: 'OutputReference',
      description:
        'An `OutputReference` is a unique reference to an output on-chain. The `output_index`\n corresponds to the position in the output list of the transaction (identified by its id)\n that produced that output',
      anyOf: [
        {
          title: 'OutputReference',
          dataType: 'constructor',
          index: 0,
          fields: [
            {
              title: 'transaction_id',
              $ref: '#/definitions/aiken~1transaction~1TransactionId'
            },
            {
              title: 'output_index',
              $ref: '#/definitions/Int'
            }
          ]
        }
      ]
    },
    'aiken/transaction/TransactionId': {
      title: 'TransactionId',
      description:
        "A unique transaction identifier, as the hash of a transaction body. Note that the transaction id\n isn't a direct hash of the `Transaction` as visible on-chain. Rather, they correspond to hash\n digests of transaction body as they are serialized on the network.",
      anyOf: [
        {
          title: 'TransactionId',
          dataType: 'constructor',
          index: 0,
          fields: [
            {
              title: 'hash',
              $ref: '#/definitions/ByteArray'
            }
          ]
        }
      ]
    },
    'aiken/transaction/credential/Credential': {
      title: 'Credential',
      description:
        'A general structure for representing an on-chain `Credential`.\n\n Credentials are always one of two kinds: a direct public/private key\n pair, or a script (native or Plutus).',
      anyOf: [
        {
          title: 'VerificationKeyCredential',
          dataType: 'constructor',
          index: 0,
          fields: [
            {
              $ref: '#/definitions/ByteArray'
            }
          ]
        },
        {
          title: 'ScriptCredential',
          dataType: 'constructor',
          index: 1,
          fields: [
            {
              $ref: '#/definitions/ByteArray'
            }
          ]
        }
      ]
    },
    'object_event/Event': {
      title: 'Event',
      anyOf: [
        {
          title: 'RecreateEvent',
          dataType: 'constructor',
          index: 0,
          fields: []
        },
        {
          title: 'SpendEvent',
          dataType: 'constructor',
          index: 1,
          fields: []
        }
      ]
    },
    'singleton/Action': {
      title: 'Action',
      anyOf: [
        {
          title: 'Mint',
          dataType: 'constructor',
          index: 0,
          fields: []
        },
        {
          title: 'Burn',
          dataType: 'constructor',
          index: 1,
          fields: []
        }
      ]
    },
    'winter_protocol/datums/ObjectDatum': {
      title: 'ObjectDatum',
      anyOf: [
        {
          title: 'ObjectDatum',
          dataType: 'constructor',
          index: 0,
          fields: [
            {
              title: 'protocol_version',
              $ref: '#/definitions/Int'
            },
            {
              title: 'data_reference',
              $ref: '#/definitions/ByteArray'
            },
            {
              title: 'event_creation_info',
              $ref: '#/definitions/ByteArray'
            },
            {
              title: 'signers',
              $ref: '#/definitions/List$ByteArray'
            }
          ]
        }
      ]
    }
  }
};
