import esbuild from "esbuild";
import process from "process";

const prod = process.argv[2] === "production";

const buildOptions = {
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/state", "@codemirror/view", "child_process"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
};

if (prod) {
  await esbuild.build(buildOptions);
} else {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
}
