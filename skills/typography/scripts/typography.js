#!/usr/bin/env node
'use strict';
const { makeTokenCli } = require('../../../lib/token-cli');
const { generateTypeScale } = require('../../../lib/token-applier');
const main = makeTokenCli({ name: 'typography', generate: generateTypeScale });
process.exit(main());
