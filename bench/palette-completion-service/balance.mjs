// Free account balance only; retains numerical usage, never credentials.
import fs from 'node:fs';
import {api} from '../palette-service-research/api-common.mjs';
const stage=process.argv[2];if(!['before','after'].includes(stage))throw Error('Use before or after');
const response=await api('/balance');
const result={at:new Date().toISOString(),status:response.status,credits:response.result.credits,subscriptionGenerations:response.result.subscription?.generations};
fs.writeFileSync(`${import.meta.dirname}/balance-${stage}.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
