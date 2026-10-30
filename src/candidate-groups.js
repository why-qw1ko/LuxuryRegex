export function groupCandidates(candidates, names, limit = 4, mode = 'strict') {
  const orderedNames = mode === 'loose' ? [...names].sort((a, b) => {
    const rank = { '精确': 0, '泛化': 1, '类别': 2 }
    return rank[a] - rank[b]
  }) : names
  return orderedNames.map(name => {
    const items = candidates.filter(item => item.group === name)
    return { name, initial: items.slice(0, limit), additional: items.slice(limit) }
  }).filter(group => group.initial.length)
}
