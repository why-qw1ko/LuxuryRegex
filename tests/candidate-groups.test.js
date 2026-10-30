import test from 'node:test'
import assert from 'node:assert/strict'
import { groupCandidates } from '../src/candidate-groups.js'

test('each group independently displays its first four candidates', () => {
  const candidates = [
    ...Array.from({ length: 2 }, (_, i) => ({ group: '精确', id: `exact-${i}` })),
    ...Array.from({ length: 6 }, (_, i) => ({ group: '类别', id: `category-${i}` })),
    ...Array.from({ length: 3 }, (_, i) => ({ group: '泛化', id: `broad-${i}` }))
  ]
  const groups = groupCandidates(candidates, ['精确', '类别', '泛化'])
  assert.deepEqual(groups.map(group => [group.initial.length, group.additional.length]), [[2, 0], [4, 2], [3, 0]])
  assert.deepEqual(groups[1].additional.map(item => item.id), ['category-4', 'category-5'])
  assert.deepEqual(groups[2].initial.map(item => item.id), ['broad-0', 'broad-1', 'broad-2'])
})
