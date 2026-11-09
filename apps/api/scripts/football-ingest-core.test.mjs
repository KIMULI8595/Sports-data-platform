import test from 'node:test';
import assert from 'node:assert/strict';
import {slug,normalizeStatus,quotaAllowed,fixtureWindow} from './football-ingest-core.mjs';
test('slug normalization',()=>assert.equal(slug('São Paulo FC'),'sao-paulo-fc'));
test('status normalization',()=>{assert.equal(normalizeStatus('FT'),'finished');assert.equal(normalizeStatus('1H'),'live');});
test('quota safety',()=>{assert.equal(quotaAllowed(19,20),true);assert.equal(quotaAllowed(20,20),false);assert.equal(quotaAllowed(100,100),false);});
test('UTC fixture window',()=>assert.deepEqual(fixtureWindow(new Date('2026-11-09T12:00:00Z')),['2026-11-09','2026-11-10']));
