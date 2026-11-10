"""Writes ui/legal/THIRD-PARTY-NOTICES.txt: every Rust crate the Windows app is built from, with its licence,
plus the full licence texts. Run from companion/: python3 scripts/notices.py (needs cargo and the crates downloaded)."""
import glob, json, os, subprocess
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
meta = json.loads(subprocess.check_output(['cargo', 'metadata', '--format-version', '1', '--filter-platform', 'x86_64-pc-windows-msvc'], cwd=os.path.join(HERE, 'src-tauri')))
nodes = {n['id']: n for n in meta['resolve']['nodes']}; pk = {p['id']: p for p in meta['packages']}
root = meta['resolve']['root']; seen = set(); st = [root]
while st:
    i = st.pop()
    if i in seen: continue
    seen.add(i)
    st += [d['pkg'] for d in nodes[i]['deps'] if any(k.get('kind') in (None, 'normal') for k in d['dep_kinds'])]
seen.discard(root)
rows = sorted((pk[i]['name'], pk[i]['version'], pk[i].get('license') or 'see its repository', pk[i].get('repository') or '') for i in seen)
REG = glob.glob(os.path.expanduser('~/.cargo/registry/src/*/'))[0]
def text(crate_glob, names):
    for d in sorted(glob.glob(REG + crate_glob)):
        for n in names:
            f = os.path.join(d, n)
            if os.path.exists(f): return open(f, encoding='utf-8', errors='replace').read().strip()
    return None
LIC = [('MIT', text('serde-1*', ['LICENSE-MIT'])), ('Apache-2.0', text('serde-1*', ['LICENSE-APACHE'])),
       ('MPL-2.0', text('cssparser-0*', ['LICENSE'])), ('Unicode-3.0', text('icu_collections-*', ['LICENSE'])),
       ('BSD-3-Clause', text('alloc-no-stdlib-*', ['LICENSE'])), ('Zlib', text('zlib-rs-*', ['LICENSE'])),
       ('Zlib (foldhash)', text('foldhash-*', ['LICENSE'])), ('ISC', text('untrusted-0*', ['LICENSE.txt'])), ('ISC (rustls-webpki)', text('rustls-webpki-*', ['LICENSE']))]
out = ['RAIDER TOOLKIT COMPANION', 'THIRD-PARTY NOTICES', '',
       'The app is built from software made by others. Thank you to all of them. Their licences are below.', '',
       'APP FRAMEWORK', 'Tauri (https://tauri.app) and its plugins: MIT or Apache-2.0. Copyright (c) the Tauri Programme within The Commons Conservancy.', '',
       'FONTS', 'Barlow, Urbanist and JetBrains Mono, from Fontsource (https://fontsource.org): SIL Open Font License 1.1. The licence text is in the app\'s fonts folder (ui/fonts/LICENSE.txt in the source code).', '',
       'DATA', 'Item, quest, key, map and condition data comes from Raider Toolkit (raidkits.com), which compiles it from the community game data set by RaidTheory (github.com/RaidTheory/arcraiders-data), MetaForge (metaforge.app) and community guides. The raidkits.com Info page lists every source.',
       'ARC Raiders, its names, item names and artwork belong to Embark Studios AB. The app is not affiliated with or endorsed by Embark Studios.', '',
       'MICROSOFT EDGE WEBVIEW2', 'The app draws its windows with Microsoft Edge WebView2, which is part of Windows and covered by Microsoft\'s own terms.', '',
       'RUST CRATES (%d, built into the Windows app)' % len(rows), 'name  version  licence  source', '']
out += ['%s %s  %s  %s' % r for r in rows]
out += ['', 'LICENCE TEXTS', '']
for name, t in LIC:
    if t: out += ['=' * 72, name, '=' * 72, t, '']
open(os.path.join(HERE, 'ui', 'legal', 'THIRD-PARTY-NOTICES.txt'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(len(rows), 'crates;', ', '.join(n for n, t in LIC if t), 'texts included;', ', '.join(n for n, t in LIC if not t) or 'none', 'missing')
