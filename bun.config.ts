import dts from "bun-plugin-dts";

const ecmascript = await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist/esm",
	format: "esm",
	target: "node",
	sourcemap: "none",
	minify: false,
	splitting: false,
	external: undefined,
	plugins: [dts()],
});

if (ecmascript.success) {
	console.log("ECMAScript build complete.");
}

const commonjs = await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist/cjs",
	format: "cjs",
	target: "node",
	sourcemap: "none",
	minify: false,
	splitting: false,
	external: undefined,
});

if (commonjs.success) {
	console.log("CommonJS build complete.");
}
