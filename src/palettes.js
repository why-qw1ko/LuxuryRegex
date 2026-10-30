export const categoryKeys = ['letter', 'digit', 'han', 'symbol']
export const categoryLabels = { letter: '字母', digit: '数字', han: '汉字', symbol: '符号' }
export const paletteTemplates = [
  { id: 'default', name: '默认', colors: {
    light: { letter: '#2174ff', digit: '#087a53', han: '#995300', symbol: '#ad3152' },
    dark: { letter: '#a3caff', digit: '#65e6ad', han: '#ffc36c', symbol: '#ff9fb7' }
  } },
  { id: 'ocean', name: '海洋', colors: {
    light: { letter: '#006b77', digit: '#3159a6', han: '#007c5e', symbol: '#694a9e' },
    dark: { letter: '#72dce2', digit: '#a9c5ff', han: '#80e4bb', symbol: '#d3b8ff' }
  } },
  { id: 'vivid', name: '落日', colors: {
    light: { letter: '#a13345', digit: '#9b500d', han: '#835c00', symbol: '#813f88' },
    dark: { letter: '#ffacb6', digit: '#ffc08b', han: '#f4d77a', symbol: '#e9b5eb' }
  } }
]
export const defaultPalette = () => structuredClone(paletteTemplates[0].colors)
export function validPalette(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== 2) return false
  return ['light', 'dark'].every(theme => {
    const colors = value[theme]
    return colors && typeof colors === 'object' && !Array.isArray(colors) && Object.keys(colors).length === categoryKeys.length &&
      categoryKeys.every(key => typeof colors[key] === 'string' && /^#[0-9a-f]{6}$/i.test(colors[key]))
  })
}
