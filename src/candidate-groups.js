export function groupCandidates(candidates, names, limit = 4) {
  return names.map(name => {
    const items = candidates.filter(item => item.group === name)
    return { name, initial: items.slice(0, limit), additional: items.slice(limit) }
  }).filter(group => group.initial.length)
}
