"""Writes build/site/bot.json: a compact copy of the data for the Discord bot (worker/discord-bot.js).
Runs after build_data.py, so the bot is always as up to date as the site."""
import datetime, json, os
OUT = os.environ.get('OUT', 'build')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cfg = json.load(open(os.path.join(ROOT, 'site.json'), encoding='utf-8'))
src = open(OUT + '/data.js', encoding='utf-8').read()
DB = json.loads(src[src.index('=') + 1:src.rindex(';')])

MAPS = {'dam': 'Dam Battlegrounds', 'buried': 'Buried City', 'space': 'The Spaceport', 'gate': 'The Blue Gate',
        'stella': 'Stella Montis', 'riven': 'Riven Tides', 'pendola': 'Pendola Pass'}
BENCH = {'weapon_bench': 'Gunsmith', 'equipment_bench': 'Gear Bench', 'explosives_bench': 'Explosives Station', 'med_station': 'Medical Lab',
         'refiner': 'Refiner', 'utility_bench': 'Utility Station', 'workbench': 'Workbench', 'in_raid': 'In-raid crafting', 'scrappy': 'Scrappy'}
items = DB.get('items', [])
NAME = {i['id']: i['n'] for i in items}
for k, m in (DB.get('mods') or {}).items(): NAME.setdefault(k, m.get('n', k))
for w in DB.get('weapons', []): NAME.setdefault(w['id'], w['n'])
nm = lambda k: NAME.get(k, k.replace('_', ' ').title())

# where each item is needed: station upgrades, crafting recipes, quest hand-ins
need, craft = {}, {}
for st in DB.get('stations', []):
    for lv, reqs in enumerate(st.get('lv', [])):
        for r in reqs:
            need.setdefault(r['i'], []).append([st['n'] + ' ' + str(lv + 1), r['q']])
def add_craft(out, rec):
    for k in (rec or {}): craft.setdefault(k, []).append(out)
for i in items: add_craft(i['n'], i.get('rp'))
for w in DB.get('weapons', []): add_craft(w['n'], w.get('rec'))
for k, m in (DB.get('mods') or {}).items(): add_craft(m.get('n', k), m.get('rec'))
qneed = {k: [q['n'] for q in v] for k, v in (DB.get('qr') or {}).items()}
guide = DB.get('guide') or {}
bpfind = {b['b']: b.get('f') for b in (DB.get('bp') or {}).get('list', []) if b.get('b') and b.get('f')}

out_items = []
for i in items:
    o = {'id': i['id'], 'n': i['n'], 't': i.get('t'), 'r': i.get('r'), 'v': i.get('v')}
    for k in ('w', 's', 'f'):
        if i.get(k) not in (None, ''): o[k] = i[k]
    if i.get('d'): o['d'] = i['d'][:300]
    if os.path.exists(OUT + '/site/i/' + i['id'] + '.webp'): o['ic'] = 1   # icon at <site>/i/<id>.webp
    if i.get('rc'): o['rc'] = [[nm(k), q] for k, q in i['rc'].items()]
    if i.get('cb'):
        o['cb'] = ', '.join(BENCH.get(b, b) + (' L' + str(i['sl']) if i.get('sl') else '') for b in i['cb'])
        if i.get('rp'): o['rp'] = [[nm(k), q] for k, q in i['rp'].items()]
    if need.get(i['id']): o['ws'] = need[i['id']]
    if craft.get(i['id']):
        c = set(craft[i['id']]); o['cr'] = sorted(x for x in c if x + ' I' not in c)   # "Ferro" and "Ferro I" are the same craft
    if qneed.get(i['id']): o['qs'] = qneed[i['id']]
    g = guide.get(i['id'])
    if g and g.get('w'): o['g'] = g['w']; o['gm'] = [MAPS.get(m, m) for m in g.get('m', [])]
    elif bpfind.get(i['id']): o['g'] = bpfind[i['id']]
    out_items.append(o)

keys = []
for k in DB.get('keys', []):
    o = {'id': k['id'], 'n': nm(k['id']), 'm': MAPS.get(k.get('m'), k.get('m') or ''), 'door': k.get('door') or ''}
    if k.get('get'): o['get'] = k['get']
    if k.get('loot'): o['loot'] = k['loot']
    keys.append(o)

# recommended skill builds, with a link that opens them in the site's planner
SK = DB.get('skills') or {}
SKA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
skids, branch_of = [], {}
for b in SK.get('br', []):
    ids = [b['start']] + [x for p in b['early'] for x in p] + list(b['choice']) + [x for p in b['late'] for x in p] + list(b['end'])
    for x in ids: skids.append(x); branch_of[x] = b
builds = []
for bd in SK.get('builds', []):
    a = bd.get('a') or {}
    code = ''.join(SKA[n] * a.get(x, 0) for n, x in enumerate(skids))
    pts = sum(a.values()); lv = (SK.get('pts') or {}).get('levels', 76)
    per = [[b['n'], sum(a.get(x, 0) for x in skids if branch_of[x] is b)] for b in SK.get('br', [])]
    picks = [SK['s'][x]['n'] for b in SK.get('br', []) for x in list(b['choice']) + list(b['end']) if a.get(x) and x in SK.get('s', {})]
    builds.append({'id': bd['id'], 'n': bd['n'], 'by': bd.get('by', ''), 'url': bd.get('url', ''), 'tags': bd.get('tags', []), 'note': bd.get('note', ''),
                   'pts': pts, 'per': per, 'picks': picks, 'code': code + ('&p=' + str(pts) if pts > lv else '')})

# weapons (for /weapon build codes) and the attachments they can take
weapons, mods_used = [], set()
for w in DB.get('weapons', []):
    if w.get('wip'): continue
    ste = w.get('ste') or []
    o = {'id': w['id'], 'n': w['n'], 't': w.get('t'), 'r': w.get('r'), 'nt': len(w.get('tiers') or []) or 1,
         'dps': [round(x['damage'] * x['fireRate']) if x and x.get('damage') is not None and x.get('fireRate') is not None else None for x in ste],
         'mag': w.get('mag') or [], 'slots': {k: v for k, v in (w.get('slots') or {}).items()}}
    if os.path.exists(OUT + '/site/w/' + w['id'] + '.webp'): o['img'] = 1   # big picture at <site>/w/<id>.webp
    for v in o['slots'].values(): mods_used.update(v)
    weapons.append(o)
mods = {k: {'n': m.get('n', k), 'r': m.get('r')} for k, m in (DB.get('mods') or {}).items() if k in mods_used}

quests = []
for q in DB.get('quests', []):
    o = {'id': q['id'], 'n': q['n'], 'tr': q.get('tr', ''), 'm': [MAPS.get(m, m) for m in q.get('m', [])], 'o': q.get('o', [])[:8]}
    if q.get('g'): o['g'] = [[nm(k), n] for k, n in q['g']]
    if q.get('r'): o['r'] = [[nm(k), n] for k, n in q['r']]
    quests.append(o)

# the skill tree, so the bot can read shared builds (#skills?b=…): one character per point, in tree order
sk_tree = {'ids': skids, 'n': {x: SK['s'][x]['n'] for x in skids if x in SK.get('s', {})},
           'br': [{'n': b['n'], 'ids': [x for x in skids if branch_of[x] is b], 'pick': list(b['choice']) + list(b['end'])} for b in SK.get('br', [])],
           'lv': (SK.get('pts') or {}).get('levels', 76)}

# small map pictures for the bot's map condition cards
maps_img = {}
try:
    from PIL import Image, ImageEnhance
    os.makedirs(OUT + '/site/bot', exist_ok=True)
    for k in MAPS:
        src = OUT + '/site/m/' + k + '.webp'
        if not os.path.exists(src): src = OUT + '/site/m/' + k + '_l.webp'
        if not os.path.exists(src): continue
        im = Image.open(src).convert('RGB'); im.thumbnail((640, 640))
        im = ImageEnhance.Contrast(ImageEnhance.Brightness(im).enhance(1.7)).enhance(1.15)   # the renders are dark; brighter reads better at Discord's small size
        im.save(OUT + '/site/bot/' + k + '.jpg', quality=82, optimize=True); maps_img[k] = 'bot/' + k + '.jpg'
except ImportError:
    pass

ev = DB.get('ev') or {}
bot = {'v': 1, 'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'), 'patch': cfg.get('patch', ''), 'site': (cfg.get('siteUrl') or '').rstrip('/') + '/',
       'maps': MAPS, 'items': out_items, 'keys': keys, 'builds': builds, 'weapons': weapons, 'mods': mods, 'quests': quests, 'skills': sk_tree, 'mapimg': maps_img,
       'ev': {'t0': ev.get('t0'), 'per': ev.get('per'), 'm': ev.get('m', {})} if ev else None}
os.makedirs(OUT + '/site', exist_ok=True)
raw = json.dumps(bot, separators=(',', ':'), ensure_ascii=False)
open(OUT + '/site/bot.json', 'w', encoding='utf-8').write(raw)
print('bot.json', len(raw) // 1024, 'KB ·', len(out_items), 'items ·', len(keys), 'keys ·', len(builds), 'builds ·', len(weapons), 'weapons ·', len(quests), 'quests')
