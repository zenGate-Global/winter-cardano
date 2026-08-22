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
		external: undefined,
		packages: "external",
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
		external: undefined,
		packages: "external",
	});

	for (const [label, result] of [
		["ECMAScript", ecmascript],
		["CommonJS", commonjs],
	] as const) {
		if (!result.success) {
			console.error(`${label} build failed:`, result.logs);
			process.exit(1);
		}
		console.log(`${label} build complete.`);
	}
} catch (e) {
	console.error("Build Failed:", e);
	process.exit(1);
}
