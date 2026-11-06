"""Puts the page together: template + styles + data + images -> build/site/index.html"""
import datetime, hashlib, html, json, os, re, shutil, subprocess, sys
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
t = rd('template/template.html')
site_url = (cfg.get('siteUrl') or '').rstrip('/') + '/'
t = t.replace('{{SITEURL}}', html.escape(site_url))
data = open(OUT + '/data.js', encoding='utf-8').read()
for name, f in (('ICONS', 'icons.json'), ('TILES', 'tiles_meta.json'), ('MAPIMG', 'maps_img.json'), ('ICONS_BIG', 'icons_big.json')):
    data += '\nvar ' + name + '=' + open(OUT + '/' + f, encoding='utf-8').read() + ';'
t = t.replace('/*CSS2*/', rd('template/base.css')).replace('/*DATA*/', data).replace('/*SCENE*/', rd('template/scene.js')).replace('/*DATAINFO*/', json.dumps(info)).replace('/*ADMINHASH*/', json.dumps(admin_hash))
assert '/*' + 'DATA*/' not in t
os.makedirs(OUT + '/site', exist_ok=True)
open(OUT + '/site/index.html', 'w', encoding='utf-8').write(t)
shutil.copy(os.path.join(ROOT, 'template/og.png'), OUT + '/site/og.png')
icons = os.path.join(ROOT, 'template/icons')
for f in os.listdir(icons): shutil.copy(os.path.join(icons, f), OUT + '/site/' + f)
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
