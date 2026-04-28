#!/usr/bin/env node
'use strict';
const { makeTokenCli } = require('../../../lib/token-cli');
const { generateMotionTokens } = require('../../../lib/token-applier');
const main = makeTokenCli({ name: 'motion', generate: generateMotionTokens });
process.exit(main());
