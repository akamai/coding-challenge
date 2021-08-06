import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import execute from 'rollup-plugin-execute'

export default {
  input: "src/main.ts",
  // input: "package.json",
  output: {
    dir: "built",
    format: "es",
  },
  plugins: [typescript(), commonjs(), resolve(),execute(["yarn local"])],
  watch: { include: ['package.json'] },

};
