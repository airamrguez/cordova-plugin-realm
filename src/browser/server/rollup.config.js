const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');

module.exports = {
  entry: 'src/index.js',
  format: 'cjs',
  external: ['express', 'body-parser', 'realm', 'cors'],
  banner: '#!/usr/bin/env node',
  plugins: [
    babel(),
    resolve({
      jail: '../../../src',
      main: true,
    }),
    commonjs()
  ],
  dest: 'bin/cdv-realm'
};
