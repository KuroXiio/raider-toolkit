"""Pulls item details and map markers from MetaForge (metaforge.app/arc-raiders) and turns them
into data the site can use: extra items, filled-in item details, item spawn hints and map markers.

Usage: python scripts/metaforge.py            (writes $OUT/mf.json and $OUT/markers.json)
The raw replies are cached in ./mf-cache. If MetaForge can't be reached the last cached copy is used,
and if there is none the site is simply built without MetaForge data."""
import json, os, re, sys, time, urllib.request

OUT = os.environ.get('OUT', 'build')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.environ.get('MF_CACHE', os.path.join(ROOT, 'mf-cache'))
API = 'https://metaforge.app/api'
UA = {'User-Agent': 'raidkits-build (+https://raidkits.com)'}
MAPS = {'dam': 'dam', 'buried': 'buried-city', 'space': 'spaceport', 'gate': 'blue-gate',
        'stella': 'stella-montis', 'riven': 'riven-tides', 'pendola': 'pendola-pass'}
# MetaForge map coordinates -> pixels on our 1800px map images: x = s*lng + ox, y = s*lat + oy
FIT = json.load(open(os.path.join(ROOT, 'scripts', 'mf_fit.json')))

def get(url, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.load(r)
        except Exception as e:
            err = e; time.sleep(2 * (k + 1))
    raise err

def cached(name, fetch):
    """Fresh copy when possible, otherwise the last good one."""
    os.makedirs(CACHE, exist_ok=True); p = os.path.join(CACHE, name)
    try:
        if os.environ.get('MF_OFFLINE'): raise RuntimeError('offline mode')
        d = fetch()
        if d: json.dump(d, open(p, 'w'), separators=(',', ':')); return d
    except Exception as e:
        print('MetaForge:', name, 'not reachable (%s), using cache' % e)
    if os.path.exists(p): return json.load(open(p))
    return None

def fetch_items():
    out, page = [], 1
    while True:
        d = get(API + '/arc-raiders/items?limit=100&page=%d' % page)
        out += d['data']
        if not d['pagination']['hasNextPage']: return out
        page += 1

def fetch_quests():
    out, page = [], 1
    while True:
        d = get(API + '/arc-raiders/quests?limit=100&page=%d' % page)
        out += d['data']
        if not d['pagination'].get('hasNextPage'): return out
        page += 1

items = cached('items.json', fetch_items)
mquests = cached('quests.json', fetch_quests) or []
maps = {k: cached('map_%s.json' % v, lambda v=v: get(API + '/game-map-data?tableID=arc_map_data&mapID=' + v).get('allData')) for k, v in MAPS.items()}
if not items:
    print('MetaForge: no data, skipping'); json.dump({}, open(OUT + '/mf.json', 'w')); json.dump({}, open(OUT + '/markers.json', 'w')); sys.exit(0)

# ---------- marker types ----------
LOOT = ["Residential", "Commercial", "Industrial", "Medical", "Electrical", "Mechanical", "Technological", "Security", "Old World", "Exodus", "Raider", "Nature", "ARC"]
def lmask(s):
    m = 0
    for c in re.split(r'\s*,\s*', s or ''):
        if c in LOOT: m |= 1 << LOOT.index(c)
    return m
NICE = {'base_container': 'Container', 'raider_cache': 'Raider cache', 'arc_probe': 'ARC Probe', 'arc_courier': 'ARC Courier', 'player_spawn': 'Player spawn',
        'supply_station': 'Supply station', 'locked_room': 'Locked room', 'field_depot': 'Field depot', 'metro_entrance': 'Metro entrance', 'raider_camp': 'Raider camp',
        'fuel-cell': 'Fuel cell', 'great-mullein': 'Great Mullein', 'prickly-pear': 'Prickly Pear', 'hurricane_cache': 'Hurricane cache', 'frozen_raider_cache': 'Frozen raider cache',
        'dig_spot': 'Dig spot', 'snow_pile': 'Snow pile', 'ship_model': 'Ship model', 'frigate_cargo': 'Frigate cargo', 'emperor_payload': 'Emperor payload', 'wasp_husk': 'Wasp husk',
        'rocketeer_husk': 'Rocketeer husk', 'weapon_case': 'Weapon case', 'ammo_crate': 'Ammo crate', 'med_crate': 'Med crate', 'utility_crate': 'Utility crate',
        'breachable_container': 'Breachable container', 'security_breach': 'Security breach', 'field_crate': 'Field crate', 'gondola_landing': 'Gondola landing', 'mast_lift': 'Mast lift',
        'breach_room': 'Breach room', 'emergency_shelter': 'Emergency shelter', 'mountaineers_detector': "Mountaineer's detector", 'combat_supplies': 'Combat supplies'}
def nice(sub): return NICE.get(sub) or sub.replace('_', ' ').replace('-', ' ').strip().capitalize()
TYPES, TIDX = [], {}
def tid(cat, sub):
    k = cat + ':' + sub
    if k not in TIDX:
        TIDX[k] = len(TYPES)
        lab = nice(sub)
        if cat == 'quests': lab = ' '.join(w.capitalize() for w in sub.split('-'))
        if cat == 'arc': lab = sub.strip().capitalize()
        TYPES.append([cat, sub, lab])
    return TIDX[k]

# ---------- key doors: MetaForge links keys to their locked rooms. Those become key pins, not plain markers ----------
INV = {v: k for k, v in MAPS.items()}
KSTOP = set('key keys room keyroom keycard card door the of no'.split())
def ktoks(x): return {('hotel' if a == 'hotel' else a) for a in re.findall(r'[a-z0-9]+', (x or '').lower().replace('pandola', 'pendola')) if a not in KSTOP}
rows_by_id = {r['id']: r for rows in maps.values() if rows for r in rows}
locked = [r for r in rows_by_id.values() if (r.get('subcategory') or '').strip() == 'locked_room']
key_doors, door_ids = {}, set()
for i in items or []:
    if i.get('item_type') != 'Key': continue
    ids = [l['id'] for l in i.get('locations') or [] if l['id'] in rows_by_id]
    kt = ktoks(i['name']); num = {a for a in kt if a.isdigit()}
    lname = i['name'].lower().replace('pandola', 'pendola')
    kmaps = {rows_by_id[x]['mapID'] for x in ids} or {v for v in MAPS.values() if v.replace('-', ' ') in lname or (v == 'dam' and lname.startswith('dam '))}
    for r in locked:
        mt = ktoks(r.get('instanceName'))
        if kmaps and r['mapID'] not in kmaps: continue
        if num != {a for a in mt if a.isdigit()}: continue
        if kt and mt and ((len(kt & mt) / len(kt) >= 0.75 and len(kt & mt) / len(mt) >= 0.6) or (kmaps and mt <= kt)) and r['id'] not in ids: ids.append(r['id'])
    if ids: key_doors[i['id']] = ids; door_ids.update(ids)
def to_px(r):
    k = INV.get(r.get('mapID'))
    if k == 'stella': k = 'stella_l' if r.get('zlayers') == 2 else 'stella_u'
    if k not in FIT: return None
    s, ox, oy = FIT[k]; return [k, round(s * r['lng'] + ox), round(s * r['lat'] + oy), 1]
key_pins = {kid: [p for p in (to_px(rows_by_id[x]) for x in ids) if p] for kid, ids in key_doors.items()}
def dedupe(ps):
    out = []
    for p in ps:
        if not any(q[0] == p[0] and abs(q[1] - p[1]) + abs(q[2] - p[2]) < 8 for q in out): out.append(p)
    return out
key_pins = {k: dedupe(v) for k, v in key_pins.items() if v}

markers, counts = {}, {}
for key, rows in maps.items():
    if not rows: continue
    fits = {f: FIT[f] for f in (('stella_u', 'stella_l') if key == 'stella' else (key,)) if f in FIT}
    if not fits: continue
    for f, (s, ox, oy) in fits.items():
        lst, names = [], {}
        for r in rows:
            z = r.get('zlayers')
            if f == 'stella_u' and z == 2: continue
            if f == 'stella_l' and z == 1: continue
            cat, sub = (r.get('category') or '').strip(), (r.get('subcategory') or '').strip()
            if r['id'] in door_ids: continue   # shown as a key pin instead
            if not cat or not sub or r.get('lat') is None: continue
            x, y = s * r['lng'] + ox, s * r['lat'] + oy
            if not (-20 < x < 1820 and -20 < y < 1820): continue
            mask = r.get('eventConditionMask')
            flags = (1 if r.get('behindLockedDoor') else 0) | (2 if mask not in (None, 1) and not (mask & 1) else 0)
            rec = [round(x, 1), round(y, 1), tid(cat, sub), flags]
            la = lmask(r.get('lootAreas'))
            if la: rec.append(la)
            nm = (r.get('instanceName') or '').strip()
            if nm and nm.lower() not in ('none', sub.lower(), nice(sub).lower()) and cat in ('locations', 'events', 'quests') or (nm and sub == 'base_container' and len(nm) < 40):
                names[len(lst)] = nm
            lst.append(rec)
        markers[f] = {'m': lst, 'n': names}
        counts[f] = len(lst)

MKT_Q = {i: t[1] for i, t in enumerate(TYPES) if t[0] == 'quests'}
# ---------- items ----------
SKIP_TYPES = {'Furniture', 'Design', 'Stencil', 'Blueprint', 'Research', 'Misc', 'Outfits'}
ALIAS = {'cable-stripper': 'cable_strippers'}
NATURE = {'agave': 'agave', 'apricot': 'apricot', 'candleberries': 'candleberries', 'fertilizer': 'fertilizer', 'lemon': 'lemons', 'mushroom': 'mushroom',
          'olives': 'olive', 'prickly pear': 'prickly-pear', 'roots': 'roots', 'great mullein': 'great-mullein', 'moss': 'moss'}
ARC = sorted({t[1] for t in TYPES if t[0] == 'arc'}, key=len, reverse=True)
def nrm(s): return re.sub(r'[^a-z0-9]+', ' ', (s or '').lower()).strip()

def spawn(i):
    """Which markers show where an item turns up. Only direct links: the plant, the ARC unit that drops it,
    containers MetaForge tagged with the item's loot area, and a few container types that are named for it."""
    t, n = set(), nrm(i['name'])
    la = lmask(i.get('loot_area'))
    def add(cat, sub):
        k = cat + ':' + sub
        if k in TIDX: t.add(TIDX[k])
    if n in NATURE: add('nature', NATURE[n]); la &= ~(1 << LOOT.index('Nature'))
    if n == 'snowball': add('events', 'snow_pile')
    base = re.sub(r'^damaged ', '', n)
    for a in ARC:
        if base.startswith(a + ' '):
            add('arc', a)
            if a in ('wasp', 'rocketeer'): add('containers', a + '_husk')
            la &= ~(1 << LOOT.index('ARC'))
            break
    else:
        boss = i.get('rarity') in ('Legendary', 'Amplified') or re.search(r'frigate|emperor|amplif|queen|matriarch', n)
        if boss:
            # boss loot: the Frigate's cargo and the fallen Emperor, not ordinary ARC wrecks
            if re.search(r'frigate|amplification', n): add('events', 'frigate_cargo')
            if re.search(r'emperor|amplification', n): add('events', 'emperor_payload')
            la &= ~(1 << LOOT.index('ARC'))
        elif la & (1 << LOOT.index('ARC')):
            for c in ('arc_probe', 'arc_courier', 'wasp_husk', 'rocketeer_husk'): add('containers', c)
    if la & (1 << LOOT.index('Raider')):
        add('containers', 'raider_cache'); add('containers', 'frozen_raider_cache')
    if la & (1 << LOOT.index('Medical')): add('containers', 'med_crate')
    if i['item_type'] == 'Ammunition': add('containers', 'ammo_crate')
    if i['item_type'] == 'Weapon' and not n.startswith('amplified'): add('containers', 'weapon_case')
    o = {}
    if t: o['t'] = sorted(t)
    if la: o['la'] = la
    return o

mf_items = {}
for i in items:
    if i.get('cosmetic') or i['item_type'] in SKIP_TYPES: continue
    n = i['name']
    if n.startswith('Amplified ') and '(' in n: continue          # every mod combination is its own entry over there
    if i['id'].startswith('integrated-') or i['id'].endswith('-recipe'): continue   # built into augments / recipe entries, not loot
    sb = i.get('stat_block') or {}
    o = {'mf': i['id'], 'n': n, 't': i['item_type'], 'r': i.get('rarity'), 'v': i.get('value'),
         'w': sb.get('weight') or None, 's': sb.get('stackSize') or None, 'd': (i.get('description') or '').strip() or None,
         'f': (i.get('loot_area') or '').strip() or None, 'icon': i.get('icon'), 'up': (i.get('updated_at') or '')[:10]}
    sp = spawn(i)
    if sp: o['sp'] = sp
    if i.get('locations'): o['loc'] = [l['id'] for l in i['locations']]
    mf_items[i['id']] = {k: v for k, v in o.items() if v not in (None, '')}

# ---------- quests: where to go, and in which order when the quest is a sequence ----------
STOP = set('the a an to of in on at and for from with find search reach get go any near inside into your by up out it its this that or'.split())
ORD = {'1st': 'first', '2nd': 'second', '3rd': 'third', '4th': 'fourth', '5th': 'fifth', '1': 'first', '2': 'second', '3': 'third', '4': 'fourth'}
def toks(x):
    w = [ORD.get(a, a) for a in re.findall(r'[a-z0-9]+', (x or '').lower())]
    return {re.sub(r's$', '', a) for a in w if a not in STOP and len(a) > 1}
def steps_of(q):
    g = {o['id']: o for o in (q.get('manifest') or {}).get('objective_graph') or []}
    kids = {c for o in g.values() for c in o.get('children') or []}
    out, seq = [], False
    def walk(i):
        nonlocal seq
        o = g.get(i)
        if not o: return
        if o['kind'] == 'SEQUENCE' and len(o.get('children') or []) > 1: seq = True
        if o['kind'] == 'ATOMIC' and o.get('description'): out.append(o['description'])
        for c in o.get('children') or []: walk(c)
    for i in g:
        if i not in kids: walk(i)
    return out, seq
KW = [('arc probe', 'containers', 'arc_probe'), ('arc courier', 'containers', 'arc_courier'), ('raider cache', 'containers', 'raider_cache'),
      ('field depot', 'locations', 'field_depot'), ('supply', 'locations', 'supply_station'), ('hatch', 'locations', 'hatch'), ('zipline', 'locations', 'zipline'),
      ('field crate', 'locations', 'field_crate'), ('weapon case', 'containers', 'weapon_case'), ('ammo crate', 'containers', 'ammo_crate')]
mf_quests = {}
for q in mquests:
    st, seq = steps_of(q)
    ts = set()
    k = 'quests:' + q['id']
    if k in TIDX: ts.add(TIDX[k])
    if q.get('marker_category'):
        for j, ty in enumerate(TYPES):
            if ty[1] == q['marker_category']: ts.add(j)
    kw = False
    if not ts:
        txt = ' '.join(st).lower()
        for ph, cat, sub in KW:
            if ph in txt and cat + ':' + sub in TIDX: ts.add(TIDX[cat + ':' + sub]); kw = True
        for a in ARC:
            if re.search(r'\b' + re.escape(a) + r's?\b', txt) and 'arc:' + a in TIDX: ts.add(TIDX['arc:' + a]); kw = True
    if not ts: continue
    stoks = [toks(x) for x in st]
    route, c = False, {}
    for f, mm in markers.items():
        mm.setdefault('s', {}); used = set(); n = 0
        for idx, r in enumerate(mm['m']):
            if r[2] not in ts: continue
            n += 1
            if seq and not kw and MKT_Q.get(r[2]) == q['id']:
                nmt = toks(mm['n'].get(idx))
                best = max(range(len(stoks)), key=lambda j: (len(nmt & stoks[j]), -j)) if stoks and nmt else None
                if best is not None and len(nmt & stoks[best]) >= 1:
                    mm['s'][idx] = best + 1; used.add(best)
        if n: c[f] = n
        if len(used) >= 2: route = True
    if not c: continue
    o = {'t': sorted(ts), 'c': c}
    if route: o['route'] = 1; o['st'] = st
    if kw: o['kw'] = 1
    mf_quests[q['id']] = o
# step numbers only matter for quests drawn as a route
for f, mm in markers.items():
    mm['s'] = {i: v for i, v in mm.get('s', {}).items() if MKT_Q.get(mm['m'][i][2]) in mf_quests and mf_quests[MKT_Q[mm['m'][i][2]]].get('route')}

# same name, different rarity: say which is which
from collections import Counter
dup = Counter(o['n'] for o in mf_items.values())
for o in mf_items.values():
    if dup[o['n']] > 1 and o.get('r'): o['n'] += ' (' + o['r'] + ')'
# how many marked spots each item has on each map image
CONT = {k for k, t in enumerate(TYPES) if t[0] == 'containers'}
for o in mf_items.values():
    sp = o.get('sp')
    if not sp: continue
    ts, la, c = set(sp.get('t', [])), sp.get('la', 0), {}
    for f, mm in markers.items():
        n = sum(1 for r in mm['m'] if r[2] in ts or (la and len(r) > 4 and r[4] & la and r[2] in CONT))
        if n: c[f] = n
    if c: sp['c'] = c
    else: del o['sp']

json.dump({'items': mf_items, 'quests': mf_quests, 'keypins': key_pins, 'alias': ALIAS, 'types': TYPES, 'loot': LOOT, 'fetched': time.strftime('%Y-%m-%d')}, open(OUT + '/mf.json', 'w'), separators=(',', ':'))
json.dump(markers, open(OUT + '/markers.json', 'w'), separators=(',', ':'))
print('MetaForge:', len(mf_items), 'items,', len(mf_quests), 'quests (%d routes),' % sum(1 for q in mf_quests.values() if q.get('route')), sum(counts.values()), 'markers on', len(counts), 'map images,', len(TYPES), 'marker types')
