"""Builds every image the site uses from the community data set:
item icons, large weapon art, the map overviews and the full-resolution map tiles.
Usage: python scripts/images.py <path-to-arcraiders-data>   (writes to ./build)"""
import base64, io, json, math, os, re, sys
from multiprocessing import Pool
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
SRC = sys.argv[1].rstrip('/') + '/'
OUT = os.environ.get('OUT', 'build')
IMG = SRC + 'images/'

def b64(im, q):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=4)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()

MF_ICONS = json.load(open(OUT + '/mf_icons.json')) if os.path.exists(OUT + '/mf_icons.json') else {}
MF_DIR = os.path.join(os.environ.get('MF_CACHE', os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'mf-cache')), 'icons')

def find(i):
    for d in ('items', 'items_upscaled', 'items_ingame'):
        p = IMG + d + '/' + i + '.png'
        if os.path.exists(p): return p
    return mf_icon(i)

def mf_icon(i):
    # items the community data set has no picture for: MetaForge's icon, downloaded once and cached
    url = MF_ICONS.get(i)
    if not url: return None
    p = os.path.join(MF_DIR, i + '.png')
    if not os.path.exists(p):
        try:
            import urllib.request
            os.makedirs(MF_DIR, exist_ok=True)
            req = urllib.request.Request(url, headers={'User-Agent': 'raidkits-build (+https://raidkits.com)'})
            raw = urllib.request.urlopen(req, timeout=30).read()
            Image.open(io.BytesIO(raw)).verify()
            open(p, 'wb').write(raw)
        except Exception:
            return None
    return p

SKT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'skill_tree.json')

def skill_icon(job):
    # skill tree icons from MetaForge's skill builder, downloaded once and cached; the page draws its own glyph if one is missing
    sid, name, url = job
    slug = re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', name.lower().replace("'", ""))).strip('-')
    p = os.path.join(MF_DIR, 'skills', slug + '.png')
    if not os.path.exists(p):
        try:
            import urllib.request
            os.makedirs(os.path.dirname(p), exist_ok=True)
            req = urllib.request.Request(url.replace('{slug}', slug), headers={'User-Agent': 'raidkits-build (+https://raidkits.com)'})
            raw = urllib.request.urlopen(req, timeout=30).read()
            Image.open(io.BytesIO(raw)).verify()
            open(p, 'wb').write(raw)
        except Exception:
            return 'sk_' + sid, None
    im = Image.open(p).convert('RGBA'); bb = im.getbbox()
    if bb: im = im.crop(bb)
    w, h = im.size; s = 96 / max(w, h)
    return 'sk_' + sid, b64(im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS), 82)

def icon(i):
    p = find(i)
    if not p: return i, None
    im = Image.open(p).convert('RGBA'); bb = im.getbbox()
    if bb: im = im.crop(bb)
    w, h = im.size; s = 116 / max(w, h)
    return i, b64(im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS), 80)

def bigicon(fam):
    for c in (fam, fam + '_i'):
        p = find(c)
        if p: break
    else: return fam, None
    im = Image.open(p).convert('RGBA'); bb = im.getbbox()
    if bb: im = im.crop(bb)
    w, h = im.size; s = 420 / max(w, h); im = im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    return fam, {'u': b64(im, 82), 'w': im.size[0], 'h': im.size[1]}

def stitch(d):
    xs = sorted(int(x) for x in os.listdir(d)); ys = sorted(int(f.split('.')[0]) for f in os.listdir(d + '/0'))
    t = {(x, y): Image.open(f'{d}/{x}/{y}.webp').convert('RGB') for x in xs for y in ys}
    W = sum(t[(x, 0)].size[0] for x in xs); H = sum(t[(0, y)].size[1] for y in ys)
    im = Image.new('RGB', (W, H)); px = 0
    for x in xs:
        py = 0
        for y in ys: im.paste(t[(x, y)], (px, py)); py += t[(x, y)].size[1]
        px += t[(x, 0)].size[0]
    return im

M = IMG + 'maps/'
MAPS = {'dam': M + 'legacy/dam_battlegrounds.png', 'buried': M + 'legacy/buried_city.png', 'space': M + 'legacy/the_spaceport.png',
        'gate': M + 'legacy/the_blue_gate.png', 'stella_u': M + 'stella_montis_upper.png', 'stella_l': M + 'stella_montis_lower.png',
        'riven': M + 'riven-tides/v2/high/2', 'pendola': M + 'pendola-pass/v2/high/2'}
T = 1024
# map images kept in the repo (template/maps/<key>.webp) are used instead of the data set's
LOCAL = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'template', 'maps')
def mapjob(key):
    src = MAPS[key]
    if os.path.exists(os.path.join(LOCAL, key + '.webp')): src = os.path.join(LOCAL, key + '.webp')   # our own copy wins
    if os.path.isdir(src): im = stitch(src)
    elif os.path.exists(src): im = Image.open(src).convert('RGB')
    else: return key, None, None
    W, H = im.size
    s = min(1.0, 1800 / max(W, H)); ov = im.resize((int(W * s), int(H * s)), Image.LANCZOS)
    overview = {'u': b64(ov, 72), 'w': ov.size[0], 'h': ov.size[1]}
    levels = []; k = 0; cur = im
    while True:
        w, h = cur.size
        if k > 0 and w <= 1800: break
        nx, ny = math.ceil(w / T), math.ceil(h / T); d = f'{OUT}/site/mt/{key}/{k}'; os.makedirs(d, exist_ok=True)
        for x in range(nx):
            for y in range(ny):
                cur.crop((x * T, y * T, min(w, (x + 1) * T), min(h, (y + 1) * T))).save(f'{d}/{x}_{y}.webp', 'WEBP', quality=82, method=4)
        levels.append({'w': w, 'h': h, 'nx': nx, 'ny': ny}); k += 1
        cur = im.resize((max(1, W >> k), max(1, H >> k)), Image.LANCZOS)
    return key, overview, {'W': W, 'H': H, 'L': levels}

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    data = json.loads(open(OUT + '/data.js').read().split('=', 1)[1].rstrip().rstrip(';'))
    ids = [i['id'] for i in data['items']]
    fams = [w['id'] for w in data['weapons']]
    with Pool(4) as pool:
        icons = {i: d for i, d in pool.map(icon, ids, chunksize=8) if d}
        big = {f: d for f, d in pool.map(bigicon, fams) if d}
        maps = pool.map(mapjob, list(MAPS))
        skt = json.load(open(SKT_PATH)) if os.path.exists(SKT_PATH) else None
        sk = pool.map(skill_icon, [(k, v['n'], skt['icon_url']) for k, v in skt['skills'].items()]) if skt else []
    icons.update({k: d for k, d in sk if d})
    json.dump(icons, open(OUT + '/icons.json', 'w'), separators=(',', ':'))
    json.dump(big, open(OUT + '/icons_big.json', 'w'), separators=(',', ':'))
    json.dump({k: o for k, o, _ in maps if o}, open(OUT + '/maps_img.json', 'w'), separators=(',', ':'))
    json.dump({k: m for k, _, m in maps if m}, open(OUT + '/tiles_meta.json', 'w'), separators=(',', ':'))
    print(len(icons), 'icons,', len(big), 'weapon images,', sum(1 for _, o, _ in maps if o), 'maps,', sum(1 for _, d in sk if d), 'of', len(sk), 'skill icons')
