/**
 * Aplica la clase `.dark` antes del primer pintado según la preferencia
 * guardada o la del sistema, para evitar parpadeo.
 */
const script = `(function(){try{var t=localStorage.getItem("kk-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
