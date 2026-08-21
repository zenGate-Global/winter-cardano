import { Cbor, CborArray, CborBytes, CborMap, CborTag, CborUInt } from "@harmoniclabs/cbor";
import { BlockfrostProvider, core, fromUTF8 } from "@meshsdk/core";
import { describe, expect, it } from "vitest";
import { EventFactory } from "../src/events";

const EVENT_TX_HASH = "073aac1259a6633629e5de923b16d82e652b88ac7925ab20a11ec053a56b01cc";
const TEST_WALLET_KEY_HASH = "efd0266310ab9f3db1a2436a86d71fd7a4a068cd1a1344d72e64e2ef";

function requiredSignersFromRawCbor(unsignedTx: string): string[] {
	const transaction = Cbor.parse(unsignedTx);
	expect(transaction).toBeInstanceOf(CborArray);

	const body = (transaction as CborArray).array[0];
	expect(body).toBeInstanceOf(CborMap);

	const requiredSigners = (body as CborMap).map.find(
		({ k }) => k instanceof CborUInt && k.num === 14n,
	)?.v;
	expect(requiredSigners).toBeInstanceOf(CborTag);
	expect((requiredSigners as CborTag).tag).toBe(258n);

	const signerSet = (requiredSigners as CborTag).data;
	expect(signerSet).toBeInstanceOf(CborArray);
	return (signerSet as CborArray).array.map((signer) => {
		expect(signer).toBeInstanceOf(CborBytes);
		return Buffer.from((signer as CborBytes).bytes).toString("hex");
	});
}

describe("multi-event transaction regressions", async () => {
	const provider = new BlockfrostProvider(process.env.BLOCKFROST_KEY as string);
	const eventFactory = new EventFactory(
		process.env.NETWORK as string,
		process.env.MNEMONIC as string,
		provider,
		provider,
		provider,
	);
	const signerAddress = await eventFactory.wallet.getChangeAddress();
	const eventRefs = [
		{ txHash: EVENT_TX_HASH, outputIndex: 1 },
		{ txHash: EVENT_TX_HASH, outputIndex: 0 },
	];
	const events = await eventFactory.getUtxosByOutRef(eventRefs);

	it("a two-event recreate encodes exactly one required signer", async () => {
		const unsignedTx = await eventFactory.recreate(
			signerAddress,
			await eventFactory.wallet.getCollateral(),
			events,
			[fromUTF8("Recreated data 1"), fromUTF8("Recreated data 2")],
			new Map(),
		);

		expect(await eventFactory.getAddressPkHash()).toBe(TEST_WALLET_KEY_HASH);
		expect(requiredSignersFromRawCbor(unsignedTx)).toEqual([TEST_WALLET_KEY_HASH]);
	});

	it("getUtxosByOutRef preserves descending caller order", () => {
		expect(events.map(({ input }) => input)).toEqual(eventRefs);
	});

	it("getUtxosByOutRef rejects a missing output index", async () => {
		const missingRef = { txHash: EVENT_TX_HASH, outputIndex: 999 };
		await expect(eventFactory.getUtxosByOutRef([missingRef])).rejects.toThrow(
			`UTxO not found: ${EVENT_TX_HASH}#999`,
		);
	});

	it("recreate rejects a data-reference count that differs from the event count", async () => {
		await expect(
			eventFactory.recreate(
				signerAddress,
				await eventFactory.wallet.getCollateral(),
				events,
				[fromUTF8("Only one reference")],
				new Map(),
			),
		).rejects.toThrow("Data reference count does not match event count. Expected: 2, Received: 1");
	});

	it("recreate rejects an empty data reference", async () => {
		await expect(
			eventFactory.recreate(
				signerAddress,
				await eventFactory.wallet.getCollateral(),
				events,
				["", fromUTF8("Valid reference")],
				new Map(),
			),
		).rejects.toThrow("Data references cannot be empty.");
	});

	it("a two-event spend stays within the protocol execution-memory limit", async () => {
		const unsignedTx = await eventFactory.spend(
			signerAddress,
			await eventFactory.wallet.getCollateral(),
			events,
			new Map(),
		);
		const redeemers =
			core.Transaction.fromCbor(core.TxCBOR(unsignedTx)).witnessSet().redeemers()?.values() ?? [];
		const exUnits = redeemers.map((redeemer) => ({
			memory: redeemer.exUnits().mem(),
			steps: redeemer.exUnits().steps(),
		}));
		const totalMemory = exUnits.reduce((total, { memory }) => total + memory, 0n);

		console.info("two-event spend ex-units", exUnits);
		expect(redeemers).toHaveLength(4);
		expect(totalMemory).toBeLessThanOrEqual(14_000_000n);
	});
});
