#!/usr/bin/env node
'use strict';
const { makePlanCli } = require('../../../lib/plan-cli');
const { generatePlanDesign } = require('../../../lib/plan-engine');
const main = makePlanCli({ name: 'plan-design', generate: generatePlanDesign });
process.exit(main());
