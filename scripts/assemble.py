"""Puts the page together: template + styles + data + images -> build/site/index.html"""
import datetime, json, os, re, subprocess, sys
SRC = sys.argv[1].rstrip('/') + '/'
OUT = os.environ.get('OUT', 'build')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
cfg = json.loads(rd('site.json'))
try: base = subprocess.check_output(['git', '-C', SRC, 'log', '-1', '--format=%cs'], text=True).strip()
except Exception: base = ''
fmt = lambda d: datetime.date.fromisoformat(d).strftime('%-d %b %Y') if d else 'unknown'
info = {'patch': cfg['patch'], 'patchDate': cfg['patchDate'], 'baseDate': fmt(base), 'checked': datetime.date.today().strftime('%-d %b %Y'), 'auto': bool(os.environ.get('CI'))}
t = rd('template/template.html')
data = open(OUT + '/data.js', encoding='utf-8').read()
for name, f in (('ICONS', 'icons.json'), ('TILES', 'tiles_meta.json'), ('MAPIMG', 'maps_img.json'), ('ICONS_BIG', 'icons_big.json')):
    data += '\nvar ' + name + '=' + open(OUT + '/' + f, encoding='utf-8').read() + ';'
t = t.replace('/*CSS2*/', rd('template/base.css')).replace('/*DATA*/', data).replace('/*SCENE*/', rd('template/scene.js')).replace('/*DATAINFO*/', json.dumps(info))
assert '/*' + 'DATA*/' not in t
os.makedirs(OUT + '/site', exist_ok=True)
open(OUT + '/site/index.html', 'w', encoding='utf-8').write(t)
open(OUT + '/check.js', 'w', encoding='utf-8').write(re.search(r'<script>(.*)</script>', t, re.S).group(1))
print('index.html', len(t) // 1024, 'KB · data set', info['baseDate'], '· patch', info['patch'])
