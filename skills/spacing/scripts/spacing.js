#!/usr/bin/env node
'use strict';
const { makeTokenCli } = require('../../../lib/token-cli');
const { generateSpacingScale } = require('../../../lib/token-applier');
const main = makeTokenCli({ name: 'spacing', generate: generateSpacingScale });
process.exit(main());
