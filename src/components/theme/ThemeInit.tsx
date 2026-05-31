/**
 * Evita flash de tema claro antes do hydration.
 */
export function ThemeInitScript() {
  const script = `(function(){try{var t=localStorage.getItem('quantum5g-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'quantum-dark');}catch(e){document.documentElement.setAttribute('data-theme','quantum-dark');}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
