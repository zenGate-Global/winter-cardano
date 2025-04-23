import dts from "bun-plugin-dts";

try {
	const ecmascript = await Bun.build({
		entrypoints: ["./src/index.ts"],
		outdir: "./dist",
		naming: {
			entry: "index.mjs",
		},
		format: "esm",
		target: "node",
		sourcemap: "none",
		minify: false,
		splitting: false,
		external: ["@meshsd/core"],
		plugins: [dts()],
	});

	const commonjs = await Bun.build({
		entrypoints: ["./src/index.ts"],
		outdir: "./dist",
		naming: {
			entry: "index.cjs",
		},
		format: "cjs",
		target: "node",
		sourcemap: "none",
		minify: false,
		splitting: false,
		external: ["@meshsdk/core"],
	});

	if (ecmascript.success) {
		console.log("ECMAScript build complete.");
	}

	if (commonjs.success) {
		console.log("CommonJS build complete.");
	}
} catch (e) {
	const error = e as AggregateError;
	console.error("Build Failed:", error);
}
