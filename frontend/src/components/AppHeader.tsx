import { AppearancePicker, type Palette } from './AppearancePicker';
import { Icon } from './Icon';
interface Props { onHome: () => void; onOpen: () => void; onSample: () => void; theme: 'light' | 'dark'; onTheme: () => void; palette: Palette; onPalette: (palette: Palette) => void; onHelp: () => void; busy: boolean; }
export function AppHeader({ onHome, onOpen, onSample, theme, onTheme, onHelp, busy, palette, onPalette }: Props) {
  return <header className="app-header">
    <button className="brand" onClick={onHome} disabled={busy} aria-label="TemplateCraft Studio — return to home" title="Return to home"><span className="brand-mark"><Icon name="document" size={23}/></span><div><strong>TemplateCraft <em>Studio</em></strong><span>PDF WORKSPACE</span></div></button>
    <div className="header-actions"><span className="ready-badge"><Icon name="check" size={13}/> Signzy ready</span>
      <button className="button icon-button" onClick={onHelp} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts"><Icon name="keyboard"/></button>
      <AppearancePicker palette={palette} onPalette={onPalette} theme={theme} onTheme={onTheme}/>
      <button className="button icon-button" onClick={onTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}><Icon name={theme === 'dark' ? 'sun' : 'moon'}/></button>
      <a className="source-link" href="https://github.com/girendra003/templatecraft-studio" target="_blank" rel="noreferrer" aria-label="View project source on GitHub">Source ↗</a><span className="header-divider"/><button className="button sample-button" onClick={onSample} disabled={busy}>Try sample</button>
      <button className="button primary" onClick={onOpen} disabled={busy}><Icon name="upload" size={15}/> Open PDF</button>
    </div>
  </header>;
}
