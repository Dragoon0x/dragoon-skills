#!/usr/bin/env node
'use strict';
const { makeTokenCli } = require('../../../lib/token-cli');
const { generateColorPalette } = require('../../../lib/token-applier');
const main = makeTokenCli({ name: 'color', generate: generateColorPalette });
process.exit(main());
