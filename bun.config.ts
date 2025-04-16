import dts from "bun-plugin-dts";

await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	format: "esm",
	target: "node",
	sourcemap: "none",
	minify: false,
	splitting: false,
	external: undefined,
	plugins: [dts()],
});
