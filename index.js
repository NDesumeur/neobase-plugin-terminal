// Terminal : ton appli d'origine (HTML et code inchangés), livrée en plugin.
// Ses données sont dans le dossier du plugin, que NeoBase sauvegarde (synchro cloud et sauvegardes) ; à la première ouverture elle reprend ce que tu avais dans NeoBase.
// Elle demande l'accès complet pour utiliser les outils d'interface de NeoBase. NeoBase ne l'ouvre que si elle est signée.
const HTML = "<div class=\"ptBar\"><span class=\"ptName\">Terminal · PowerShell</span><button class=\"btn px\" id=\"tmClear\">Effacer</button><button class=\"btn px\" id=\"tmRestart\" title=\"Arrête aussi une commande qui ne finit pas\">Redémarrer</button></div>\n      <pre id=\"tmOut\"></pre>\n      <div class=\"tmLine\"><span id=\"tmPrompt\">PS&gt;</span><input id=\"tmIn\" spellcheck=\"false\" autocomplete=\"off\"></div>";
/*CSS-MOVED*/ const CSS = `#tmOut{flex:1;margin:0;padding:14px 18px;overflow:auto;background:#05010b;color:#d9c6ff;font:14px/1.45 Consolas,'Cascadia Mono',monospace;white-space:pre-wrap;word-break:break-word;user-select:text}
#tmOut .err{color:#ff7a90}
#tmOut .cmd{color:#8ee8a0}
#tmOut .hint{color:var(--muted)}
.tmLine{display:flex;gap:8px;align-items:center;padding:8px 14px;background:#0b031c;border-top:3px solid var(--line);font:14px Consolas,monospace}
#tmPrompt{color:#8ee8a0;white-space:nowrap}
#tmIn{all:unset;flex:1;color:#fff;font:14px Consolas,monospace}
.ptName{color:#fff;font-size:15px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-right:8px}
`;  // le style de ce plugin (il utilise les variables du thème de NeoBase)
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoBase pour s'ouvrir."; return; }
  const host = ctx.host, { el, toast, sfx, ask, newTab, pixIcon, PIX, WX } = host;
  const folder = ctx.folder, legacy = ctx.legacy || {};
  ctx.host.addStyle(CSS);
  view.innerHTML = HTML;
  view.classList.add("ptView");
  const $ = id => id === "termApp" ? view : (view.querySelector('#' + id) || document.getElementById(id));  // les identifiants de ta vue d'abord, puis ceux de la page (fenêtres, menus)
  const doc = async n => { try { return await folder.read(n); } catch { return null; } };
  const __icon = () => ctx.icon;  // l'icône de ce plugin
  // ---- ton code d'origine ----
/* ---------- Terminal app: PowerShell line by line; the "<<<NEO:dir>>>" marker after each command gives the prompt's folder ---------- */
let tmCwd = '', tmHist = [], tmHi = -1, tmStarted = false;
const tmPrint = (text, cls = '') => { const o = $('tmOut'); o.append(el('span', cls, text)); if (o.childNodes.length > 4000) o.firstChild.remove(); o.scrollTop = o.scrollHeight; };
function tmData({kind, data}) {
  if (kind === 'exit') { tmPrint('\n[PowerShell s\'est arrêté. Clique sur « Redémarrer ».]\n', 'err'); tmStarted = false; return; }
  const clean = data.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '').replace(/<<<NEO:(.*?)>>>\r?\n?/g, (_, d) => { tmCwd = d; return ''; });
  if (clean) tmPrint(clean, kind === 'err' ? 'err' : '');
  $('tmPrompt').textContent = 'PS ' + (tmCwd || '') + '>';
}
async function tmOpen() {
  if (!tmStarted) { tmStarted = true; $('tmOut').replaceChildren(); tmPrint('PowerShell dans NeoBase · tape une commande puis Entrée (↑ ↓ : historique). Les programmes plein écran (vim, ssh interactif…) ne marchent pas ici.\n', 'hint'); await neo.termStart(); }
  setTimeout(() => $('tmIn').focus());
}
$('tmIn').onkeydown = e => {
  if (e.key === 'Enter') {
    const line = $('tmIn').value; $('tmIn').value = ''; tmHi = -1;
    tmPrint('PS ' + tmCwd + '> ' + line + '\n', 'cmd');
    if (line.trim()) { tmHist.unshift(line); tmHist = tmHist.slice(0, 100); }
    if (/^\s*(cls|clear)\s*$/i.test(line)) { $('tmOut').replaceChildren(); return; }
    neo.termRun(line).catch(err => tmPrint(err.message + '\n', 'err'));
  } else if (e.key === 'ArrowUp' && tmHist.length) { e.preventDefault(); tmHi = Math.min(tmHist.length - 1, tmHi + 1); $('tmIn').value = tmHist[tmHi]; }
  else if (e.key === 'ArrowDown') { e.preventDefault(); tmHi = Math.max(-1, tmHi - 1); $('tmIn').value = tmHi < 0 ? '' : tmHist[tmHi]; }
};
$('tmClear').onclick = () => $('tmOut').replaceChildren();
$('tmRestart').onclick = async () => { tmStarted = false; await neo.termStop(); tmOpen(); };
$('tmOut').onclick = () => { if (!getSelection().toString()) $('tmIn').focus(); };
if (window.neo) neo.onTermData(tmData);  // (non indenté : les textes sur plusieurs lignes restent exactement les tiens)
  // ---- fin ----
  ctx.onOpen(() => { tmOpen(); });
}
