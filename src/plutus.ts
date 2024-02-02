import type { PlutusJson } from './models';

export const PLUTUSJSON: PlutusJson = {
  preamble: {
    title: 'zengate/winter_protocol',
    description: "Aiken contracts for project 'zengate/winter_protocol'",
    version: '0.0.2',
    plutusVersion: 'v2',
    compiler: {
      name: 'Aiken',
      version: 'v1.0.24-alpha+982eff4'
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
        '5906f10100003232323232323232322232222323232533300c323232533300f3370e90010008991919191919191919191919191919191919191919191919299981399b874800005854ccc09cc94ccc0a0cdc3a4000604e002264646464a66605866e1d2000302b0011323232533302f3370e90011817000899191919299981999b8748000c0c80044c8c8c8c94ccc0dc00854ccc0dc0044c94ccc0e0cdc3a4008606e0022646464a66607666e1cdd69813181c81a9bad302630390011533303b33303b3371e6eb8c0bcc0e40d4dd71817981c800a504a22a666076a66607666e3cdd71811981c81aa4410013371e6eb8c08cc0e4004dd71813181c9813181c9813181c809099b8f375c604660720026eb8c08cc0e40d44cdd7980a981c81a980a981c8008a5014a02940c8008c0c4004c0f8004c0d800458c07cc0d400c5280a503370e60326030602e6eacc0a8c0d0009200233712602a6eacc0a4c0ccc0a4c0cc030c054dd598149819800981c80098188008b180c9980e000919808980a9bab30273031001006323301c0012323253330353370e9001000899b8f005375c607460660042940c0cc004c078c0c4c078c0c4004dd6180c9817980e18178149bae3035001302d001163019302c3019302c3022302c005375c606400260540022c600c601a00260166eacc078c0a0c078c0a0004c0b8004c09800458cc00cdd6180918129809181280f80b8a999813998021809181280f9bac30013025021133300601f02402214a0294054ccc09cc8c8c8c8c8c8c8c8c94ccc0c0cdc3a4000605e002264646464a66606866e1d20003033001132323232533303b303e00213253330393370e6038603600e9001099b87001480045281bad303a00116303c00132323253330393370e90010008a5eb7bdb1804dd5981f181b801181b800998118008011980f80424500375c607400260640022c601c602a00260266eacc098c0c0c098c0c0004c0d8004c0b800458cc02cdd6180d1816980d181681380f9bab303300130330013032001303100130300013027001302d001302501f1533302733300601f0240221330043012302501f37586002604a042294052811816181698169816800929998148008a60103d87a800013374a9000198151815800a5eb8088c8cc00400400c894ccc0ac0045300103d87a800013232533302a3375e602a605000400a266e9520003302e0024bd7009980200200098178011816800911919198008008019129998158008a5013232533302a3300800500214a2266008008002605e0046eb8c0b4004dd618151815981598159815981598159815981598118011119198008008019129998148008a501323253330283371e00400a29444cc010010004c0b4008dd718158009111919299981319b8748000c0940044c8c94ccc0a0cdc39806802240042a66605066e1cc02cc028c024dd5980e1813000a4000266e24014c020dd5980e18130008a5014a0605800260480022c6018002646601e002466ebcc044c090c044c090004010dd618061811180798110019191919299981219b8748008004520001375a60526044004604400264a66604666e1d200200114c103d87a8000132323300100100222533302900114c103d87a8000132323232533302a3371e9110000213374a9000198171ba80014bd700998030030019bad302b003375c6052004605a00460560026eacc0a0c084008c084004cc034005220100233009001489002300c00130010012253330210011480004cdc024004660040046048002600200244a66603e00229000099b8048008cc008008c08800494ccc0740045300103d87a800013374a90001980f180f800a5eb808c078c07cc07c00488c8cc00400400c894ccc07800452f5bded8c0264646464a66603e66e3c01c008400c4cc08ccdd81ba9002374c0026600c00c0066eacc08000cdd7180f0011811001181000091191980080080191299980e8008a5eb804c8c94ccc070c0140084cc080008cc0100100044cc010010004c084008c07c0048c06c00488c8cc00400400c894ccc06c0045300103d87a8000132323232533301c3371e00e004266e95200033020374c00297ae01330060060033756603a0066eb8c06c008c07c008c074004c004004894ccc05c00452f5c0266030602a60320026600400460340026020014602a002601a0042940c034004c004c02c0148c048c04c0045261365632533300c3370e90000008a99980798050028a4c2c2a66601866e1d20020011533300f300a00514985858c028010c0040108c94ccc02ccdc3a400000226464646464646464a66602c603200426493191980080080111299980c0008a4c2646600600660380046eb8c06800458dd6180b800980b8011bae30150013015002375c602600260260046eb4c044004c02400858c024004dd6800918029baa001230033754002ae6955ceaab9e5573eae815d0aba201',
      hash: 'bb6c9914e0352a1770659aedbafd69c148c6ecf0e1a0835e6f3cd820'
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
        '5901d901000032323232323232323223222232533300932323232533300d3370e9000180600089919191919191919191919299980d980f0010991919299980d99b874800000454ccc06cc8cc004004030894ccc08000452809919299980f99baf3024301d00201a14a2266008008002604800460440022a66603666e1c009200213371e00602e29405854ccc06ccdc380124002266e3c00c05c528180c80a1bad301b002375c60320022c6038002646464a66603266e1d200200114bd6f7b63009bab301e30170023017001323300100100222533301c00114c103d87a8000132323232533301d3371e01e004266e95200033021374c00297ae01330060060033756603c0066eb8c070008c080008c078004c8cc004004008894ccc06c00452f5bded8c0264646464a66603866e3d221000021003133020337606ea4008dd3000998030030019bab301d003375c6036004603e004603a0026eacc068004c068004c064004c060004c05c008dd6180a80098068029bae3013001300b0011630110013011002300f001300700214984d958c94ccc024cdc3a40000022a666018600e0062930b0a99980499b874800800454ccc030c01c00c52616163007002375c0024600a6ea80048c00cdd5000ab9a5573aaae7955cfaba05742ae89',
      hash: '81cbb6417e3213bc9006a2647a82a45fad19bd379a8a44121587faca'
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
