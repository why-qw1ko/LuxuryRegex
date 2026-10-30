import test from 'node:test'
import assert from 'node:assert/strict'
import { groupCandidates } from '../src/candidate-groups.js'
import { generate, generateWithFixed } from '../src/regex.js'

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

test('loose mode promotes broad groups without losing candidates or mutating names', () => {
  const names = ['精确', '类别', '泛化']
  for (const candidates of [generate('UAY123', 'loose'), generateWithFixed('IDabc123', [{ start: 0, end: 2 }])]) {
    const strict = groupCandidates(candidates, names)
    const loose = groupCandidates(candidates, names, 4, 'loose')
    assert.ok(loose.findIndex(group => group.name === '泛化') < loose.findIndex(group => group.name === '类别'))
    assert.deepEqual(loose.flatMap(group => [...group.initial, ...group.additional]).map(item => item.pattern).sort(),
      strict.flatMap(group => [...group.initial, ...group.additional]).map(item => item.pattern).sort())
  }
  assert.deepEqual(names, ['精确', '类别', '泛化'])
})
