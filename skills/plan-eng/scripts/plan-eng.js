#!/usr/bin/env node
'use strict';
const { makePlanCli } = require('../../../lib/plan-cli');
const { generatePlanEng } = require('../../../lib/plan-engine');
const main = makePlanCli({ name: 'plan-eng', generate: generatePlanEng });
process.exit(main());
