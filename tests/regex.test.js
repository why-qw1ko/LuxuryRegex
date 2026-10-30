import test from 'node:test'
import assert from 'node:assert/strict'
import { generate, generateWithFixed, splitSegments } from '../src/regex.js'

test('merges adjacent character types', () => {
  assert.deepEqual(splitSegments('UAY123').map(x => x.text), ['UAY', '123'])
  assert.ok(generate('UAY123').some(x => x.pattern === '^[A-Z]{3}\\d{3}$'))
})
test('all generated expressions fully match their targets', () => {
  for (const value of ['U', 'a', '7', '中', ' ', '\n', '.', '😀', 'UAY123', '你好，世界', 'a+b', 'hello@example.com', '13812345678']) {
    for (const candidate of generate(value)) assert.ok(new RegExp(`^(?:${candidate.pattern})$`, 'u').test(value), `${value}: ${candidate.pattern}`)
  }
})
test('recognizes common structures and escapes literals', () => {
  assert.ok(generate('hello@example.com').some(x => x.label === '邮箱结构'))
  assert.ok(generate('13812345678').some(x => x.label === '手机号结构'))
  assert.equal(generate('a+b')[0].pattern, 'a\\+b')
  assert.ok(!generate('\n').some(x => x.pattern === '.'))
})
test('strict and loose order differs while remaining valid', () => {
  assert.notDeepEqual(generate('UAY123', 'strict').map(x => x.pattern), generate('UAY123', 'loose').map(x => x.pattern))
})

test('classifies non-ASCII letters and numbers correctly', () => {
  for (const value of ['é', 'Ω', '𝔄']) {
    const candidates = generate(value)
    assert.ok(candidates.some(x => x.pattern === '\\p{L}' && x.label === 'Unicode 字母'))
    assert.ok(!candidates.some(x => x.label === '符号'))
  }
  for (const value of ['١', 'Ⅻ']) {
    const candidates = generate(value)
    assert.ok(candidates.some(x => x.pattern === '\\p{N}' && x.label === 'Unicode 数字'))
    assert.ok(!candidates.some(x => x.label === '符号'))
  }
})

test('Unicode number segments retain their own class alongside ASCII digits', () => {
  assert.deepEqual(splitSegments('12١Ⅻ3').map(({ type, base, text }) => [type, base, text]), [
    ['digit', '\\d', '12'], ['digit', '\\p{N}', '١Ⅻ'], ['digit', '\\d', '3']
  ])
  assert.ok(generate('١Ⅻ').some(candidate => candidate.pattern === '\\p{N}{2}'))
  const fixed = generateWithFixed('ID١Ⅻ', [{ start: 0, end: 2 }])
  assert.equal(fixed[0].pattern, '^ID\\p{N}{2}$')
  assert.ok(new RegExp(fixed[0].pattern, 'u').test('ID２٣'))
  for (const candidate of [...generate('12١Ⅻ3'), ...fixed]) {
    assert.ok(new RegExp(candidate.pattern, 'u').test(candidate.pattern.startsWith('^ID') ? 'ID١Ⅻ' : '12١Ⅻ3'))
  }
})

test('fixed ranges produce whole-text patterns with fixed and variable lengths', () => {
  const candidates = generateWithFixed('LuxuryRegex666', [{ start: 0, end: 6 }])
  assert.equal(candidates[0].pattern, '^Luxury[A-Z][a-z]{4}\\d{3}$')
  assert.equal(candidates[1].pattern, '^Luxury[A-Za-z]{5}\\d{3}$')
  assert.equal(candidates[2].pattern, '^Luxury[A-Z]+[a-z]+\\d+$')
  assert.ok(new RegExp(candidates[0].pattern, 'u').test('LuxuryRegex666'))
  assert.ok(!new RegExp(candidates[0].pattern, 'u').test('LuxuryRegex66'))
  assert.ok(new RegExp(candidates[2].pattern, 'u').test('LuxuryRegex66'))
  assert.ok(!new RegExp(candidates[2].pattern, 'u').test('luxuryRegex666'))
})

test('fixed ranges use positions, escape literals, and support Unicode and multiple ranges', () => {
  const text = '😀a+b-a+b42'
  const candidates = generateWithFixed(text, [{ start: 2, end: 5 }, { start: 9, end: 11 }])
  for (const candidate of candidates) assert.ok(new RegExp(candidate.pattern, 'u').test(text))
  assert.match(candidates[0].pattern, /a\\\+b/)
  assert.ok(!new RegExp(candidates[1].pattern, 'u').test('😀axb-a+b42'))
  assert.deepEqual(generateWithFixed('abc', [{ start: 0, end: 2 }, { start: 1, end: 3 }]), [])
})
