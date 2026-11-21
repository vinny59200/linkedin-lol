import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchesTitle, normalize } from '../search.mjs';

test('partial filename match', () => {
  assert.equal(matchesTitle('Jensen Huang', 'Jensen'), true);
  assert.equal(matchesTitle('Jensen Huang', 'huang'), true);
  assert.equal(matchesTitle('Jensen Huang', 'jens'), true);
  assert.equal(matchesTitle('GTA six release', 'GTA six'), true);
  assert.equal(matchesTitle('GTA six release', 'GTA 6'), true);
  assert.equal(matchesTitle('GTA six release', 'si'), true);
  assert.equal(matchesTitle('GTA 6 release', 'six'), true);
});
test('accent and punctuation insensitive', () => {
  assert.equal(matchesTitle('Développeur - été_2026', 'developpeur ete'), true);
  assert.equal(matchesTitle('Java - Kotlin meme', 'kotlin JAVA'), true);
  assert.equal(matchesTitle('Jensen Huang', 'jens hu'), true);
  assert.equal(matchesTitle('Jensen Huang', 'Jensen Musk'), false);
  assert.equal(matchesTitle('Anything', ''), true);
  assert.equal(normalize('Ça  VA !'), 'ca va');
});
