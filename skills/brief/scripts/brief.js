#!/usr/bin/env node
'use strict';
const { makePlanCli } = require('../../../lib/plan-cli');
const { generateBrief } = require('../../../lib/plan-engine');
const main = makePlanCli({ name: 'brief', generate: generateBrief });
process.exit(main());
