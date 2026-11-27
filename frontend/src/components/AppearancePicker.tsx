import { Icon } from './Icon';
export const palettes = [
  { id: 'forest', name: 'Forest', color: '#147d64', companion: '#d9ecdf' },
  { id: 'ocean', name: 'Ocean', color: '#2467b4', companion: '#cfe8f5' },
  { id: 'lavender', name: 'Lavender', color: '#7850ba', companion: '#e9dcfa' },
  { id: 'rose', name: 'Rose', color: '#ad4769', companion: '#f9dce5' },
  { id: 'sunset', name: 'Sunset', color: '#ac522a', companion: '#f9e2c1' },
  { id: 'graphite', name: 'Graphite', color: '#526276', companion: '#dee5ef' },
  { id: 'obsidian', name: 'Obsidian', color: '#070a0e', companion: '#22d3ee' },
] as const;
export type Palette = typeof palettes[number]['id'];
export function AppearancePicker({ palette, onPalette, theme, onTheme }: { palette: Palette; onPalette: (value: Palette) => void; theme: 'light' | 'dark'; onTheme: () => void }) {
  return <>
    <button className="button icon-button" popoverTarget="appearance-picker" aria-label="Choose theme colors" title="Appearance · colors and mode"><Icon name="palette"/></button>
    <section id="appearance-picker" className="appearance-picker" popover="auto" aria-label="Appearance">
      <div className="appearance-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Appearance</h2></div><button className="button icon-button" popoverTarget="appearance-picker" popoverTargetAction="hide" aria-label="Close appearance">×</button></div>
      <p>A little color for your workspace.</p>
      <fieldset className="palette-options"><legend>Color palette</legend><div>{palettes.map((item) => <label key={item.id} className={`palette-option${palette === item.id ? ' selected' : ''}`}>
        <input type="radio" name="workspace-palette" value={item.id} checked={palette === item.id} onChange={() => onPalette(item.id)}/>
        <span className="palette-swatch" style={{ background: `linear-gradient(135deg, ${item.color} 0% 55%, ${item.companion} 55% 80%, #ffffff 80%)` }}>{palette === item.id && <Icon name="check" size={17}/>}</span><span>{item.name}</span>
      </label>)}</div></fieldset>
      <div className="appearance-mode"><div><b>Dark mode</b><small>Every palette, day or night.</small></div><button className="button" role="switch" aria-checked={theme === 'dark'} aria-label="Dark mode" onClick={onTheme}><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={15}/>{theme === 'dark' ? 'On' : 'Off'}</button></div>
      <small className="appearance-note">{palette === 'obsidian' && theme === 'light' ? 'Turn on dark mode for the black + cyan look.' : 'Your preferences are saved on this browser.'}</small>
    </section>
  </>;
}
