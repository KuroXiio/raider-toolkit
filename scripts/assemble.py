"""Puts the page together: template + styles + data + images -> build/site/index.html"""
import base64, datetime, hashlib, html, json, os, re, shutil, subprocess, sys
SRC = sys.argv[1].rstrip('/') + '/'
OUT = os.environ.get('OUT', 'build')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
cfg = json.loads(rd('site.json'))
try: base = subprocess.check_output(['git', '-C', SRC, 'log', '-1', '--format=%cs'], text=True).strip()
except Exception: base = ''
fmt = lambda d: datetime.date.fromisoformat(d).strftime('%-d %b %Y') if d else 'unknown'
info = {'patch': cfg['patch'], 'patchDate': cfg['patchDate'], 'baseDate': fmt(base), 'checked': datetime.date.today().strftime('%-d %b %Y'), 'auto': bool(os.environ.get('CI'))}
admin_pw = os.environ.get('ADMIN_PASSWORD') or cfg.get('adminPassword') or ''
admin_hash = hashlib.sha256(admin_pw.encode('utf-8')).hexdigest() if admin_pw else ''
from tmpl import expand
t = expand('template/template.html')
site_url = (cfg.get('siteUrl') or '').rstrip('/') + '/'
t = t.replace('{{SITEURL}}', html.escape(site_url))
data = open(OUT + '/data.js', encoding='utf-8').read()
# Images ship as separate files next to the page (loaded only when shown), not packed into it.
# EMBED_IMAGES=1 packs them in again, for a single-file copy.
EMBED = bool(os.environ.get('EMBED_IMAGES'))
IMGDIR = {'ICONS': 'i', 'ICONS_BIG': 'w', 'MAPIMG': 'm'}
def unpack(name, obj):
    folder = IMGDIR.get(name)
    if EMBED or not folder: return obj
    os.makedirs(OUT + '/site/' + folder, exist_ok=True)
    def save(key, uri):
        if not isinstance(uri, str) or not uri.startswith('data:image/'): return uri
        head, b64 = uri.split(',', 1); ext = head.split('/')[1].split(';')[0]
        raw = base64.b64decode(b64); fn = re.sub(r'[^a-z0-9_-]', '_', key.lower()) + '.' + ext
        with open(OUT + '/site/' + folder + '/' + fn, 'wb') as fh: fh.write(raw)
        return folder + '/' + fn + '?v=' + hashlib.sha1(raw).hexdigest()[:8]
    if name == 'ICONS': return {k: save(k, v) for k, v in obj.items()}
    return {k: (dict(v, u=save(k, v['u'])) if isinstance(v, dict) and 'u' in v else v) for k, v in obj.items()}
for name, f in (('ICONS', 'icons.json'), ('TILES', 'tiles_meta.json'), ('MAPIMG', 'maps_img.json'), ('ICONS_BIG', 'icons_big.json')):
    obj = json.load(open(OUT + '/' + f, encoding='utf-8'))
    data += '\nvar ' + name + '=' + json.dumps(unpack(name, obj), separators=(',', ':')) + ';'
# MetaForge map markers: one small file per map image, fetched when that map is opened
mkp = OUT + '/markers.json'
mk = json.load(open(mkp, encoding='utf-8')) if os.path.exists(mkp) else {}
if EMBED: data += '\nvar MK=' + json.dumps(mk, separators=(',', ':')) + ';var MKF={};'
else:
    os.makedirs(OUT + '/site/mk', exist_ok=True); mkf = {}
    for k, v in mk.items():
        raw = json.dumps(v, separators=(',', ':')).encode()
        open(OUT + '/site/mk/' + k + '.json', 'wb').write(raw)
        mkf[k] = 'mk/' + k + '.json?v=' + hashlib.sha1(raw).hexdigest()[:8]
    data += '\nvar MK={};var MKF=' + json.dumps(mkf) + ';'
t = t.replace('/*CSS2*/', rd('template/base.css')).replace('/*DATA*/', data).replace('/*SCENE*/', rd('template/scene.js')).replace('/*DATAINFO*/', json.dumps(info)).replace('/*ADMINHASH*/', json.dumps(admin_hash)).replace('/*ARCPROXY*/""', json.dumps((cfg.get('arcProxy') or '').strip())).replace('/*SYNCAPI*/""', json.dumps((cfg.get('syncApi') or '').strip().rstrip('/')))
assert '/*' + 'DATA*/' not in t
os.makedirs(OUT + '/site', exist_ok=True)
open(OUT + '/site/index.html', 'w', encoding='utf-8').write(t)
for f in ('og.png', 'og.jpg'):
    if os.path.exists(os.path.join(ROOT, 'template', f)): shutil.copy(os.path.join(ROOT, 'template', f), OUT + '/site/' + f)
icons = os.path.join(ROOT, 'template/icons')
for f in os.listdir(icons): shutil.copy(os.path.join(icons, f), OUT + '/site/' + f)
# fonts are served from the site itself, so visitors' browsers never contact a font host
shutil.copytree(os.path.join(ROOT, 'template/fonts'), OUT + '/site/fonts', dirs_exist_ok=True)
json.dump({'name': 'Raider Toolkit', 'short_name': 'Raider Toolkit', 'description': 'ARC Raiders fan tools', 'start_url': './', 'scope': './',
           'display': 'standalone', 'background_color': '#0c0916', 'theme_color': '#0c0916',
           'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
                     {'src': 'favicon.svg', 'sizes': 'any', 'type': 'image/svg+xml'}]},
          open(OUT + '/site/manifest.webmanifest', 'w', encoding='utf-8'), indent=1)
if cfg.get('siteUrl'):
    open(OUT + '/site/robots.txt', 'w').write('User-agent: *\nAllow: /\nSitemap: ' + site_url + 'sitemap.xml\n')
    open(OUT + '/site/sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + html.escape(site_url) + '</loc><lastmod>' + datetime.date.today().isoformat() + '</lastmod></url></urlset>\n')
open(OUT + '/check.js', 'w', encoding='utf-8').write(re.search(r'<script>(.*)</script>', t, re.S).group(1))
print('index.html', len(t) // 1024, 'KB · data set', info['baseDate'], '· patch', info['patch'])
