import json, os, re, sys
R=(sys.argv[1].rstrip('/')+'/') if len(sys.argv)>1 else 'src/repo/'
items=[json.load(open(R+'items/'+f)) for f in sorted(os.listdir(R+'items'))]
def en(x): return x['en'] if isinstance(x,dict) else x
by={i['id']:i for i in items}
byname={en(i['name']).lower():i['id'] for i in items}
out=[]
for i in items:
    o={'id':i['id'],'n':en(i['name']),'t':i['type'],'r':i['rarity'],'v':i['value']}
    if i.get('description'): o['d']=en(i['description'])
    for k,s in (('weightKg','w'),('stackSize','s'),('foundIn','f'),('stationLevelRequired','sl'),('craftQuantity','cq'),('addedIn','ad'),('updatedAt','up')):
        if i.get(k) is not None: o[s]=i[k]
    if i.get('recyclesInto'): o['rc']=i['recyclesInto']
    if i.get('recipe') and isinstance(i['recipe'],dict): o['rp']=i['recipe']
    cb=i.get('craftBench')
    if cb: o['cb']=cb if isinstance(cb,list) else [cb]
    if i.get('blueprintLocked'): o['bp']=1
    if i.get('questItem'): o['q']=1
    if i.get('vendors'):
        o['ve']=[{'tr':v.get('trader'),'c':v.get('cost'),'lim':v.get('limit'),'lv':v.get('requiredLevel')} for v in i['vendors']]
    out.append(o)

SN={'equipment_bench':'Gear Bench','explosives_bench':'Explosives Station','med_station':'Medical Lab','refiner':'Refiner','utility_bench':'Utility Station','weapon_bench':'Gunsmith','scrappy':'Scrappy'}
stations=[]
for sid in ('explosives_bench','equipment_bench','weapon_bench','med_station','refiner','utility_bench','scrappy'):
    d=json.load(open(R+'hideout/%s.json'%sid))
    levels=[[{'i':r['itemId'],'q':r['quantity']} for r in l.get('requirementItemIds',[])] for l in d['levels']]
    unl=[]
    for lv in range(1,d['maxLevel']+1):
        unl.append(sorted(en(i['name']) for i in items if sid in (i.get('craftBench') if isinstance(i.get('craftBench'),list) else [i.get('craftBench')]) and i.get('stationLevelRequired')==lv))
    stations.append({'id':sid,'n':en(d['name']),'max':d['maxLevel'],'lv':levels,'un':unl})
for s in stations:
    for l in s['lv']:
        for r in l: assert r['i'] in by, r['i']

ev=json.load(open(R+'map-events/map-events.json'))['eventTypes']
events=[{'id':k,'n':v['displayName'],'cat':v.get('category')} for k,v in ev.items()]

# Community guide notes (location text and map tags); source labelled in page
ALL=['dam','buried','space','gate']
ACER='Acer Corner workshop guide'
G=[
("Metal Parts","Very common in industrial interiors: garages, tool rooms, storage shelves.",ALL),
("Rubber Parts","Common in residential and industrial interiors. Also from recycling household items.",ALL),
("Plastic Parts","Kitchens, storage rooms, offices and utility closets.",ALL),
("Fabric","Residential zones, clothing areas and abandoned apartments.",ALL),
("Chemicals","Cleaning closets, industrial storerooms, garages and utility rooms.",ALL),
("ARC Alloy","Dropped by nearly every ARC unit. Farm high-density ARC areas.",ALL),
("ARC Powercell","Dropped by every ARC unit.",ALL),
("Toaster","Residential and apartment interiors: fridges, kitchen shelves, cabinets. Pattern House is a top spot.",['dam']),
("Fireball Burner","Dropped by Fireballs, mostly inside buildings in Buried City.",['buried','dam','space']),
("ARC Motion Core","Larger ARC units, ARC Probes and ARC Couriers.",ALL),
("Motor","Large industrial buildings such as the Primary Facility. Also under the hoods of cars.",['dam']),
("Bombardier Cell","Dropped by Bombardiers: Water Treatment to Loading Bay (Dam), Marana Park, Santa Maria Houses and Plaza Rosa (Buried City).",['dam','buried']),
("ARC Circuitry","Surveyors, Rocketeers and Bombardiers. Craftable at the Refiner from level 2.",ALL),
("Rusted Tools","Toolboxes, garages and workshops. Dam has the most. Also in broken-down buses.",['dam']),
("Mechanical Components","Mechanical workshops and industrial interiors. Craftable at Refiner level 1.",ALL),
("Wasp Driver","Dropped by Wasps, common on rooftops and in open areas. Good on the outskirts of Buried City.",ALL),
("Rusted Gear","Heavy machinery rooms and industrial shelves. Best on Dam and Spaceport.",['dam','space']),
("Advanced Mechanical Components","Bombardiers, Surveyors and Bastions. Craftable at Refiner level 2.",ALL),
("Sentinel Firing Core","Dropped by Sentinels on rooftops and ledges: Research & Administration (Dam), Buried City rooftops.",['dam','buried']),
("Tick Pod","Dropped by Ticks in basements, dark indoor corners and Buried City interiors.",['buried','dam']),
("Cracked Bioscanner","Medical buildings, especially the Hospital in Buried City, and clinic rooms.",['buried']),
("Durable Cloth","Refine Fabric at the Refiner, or rarely in residential interiors.",ALL),
("Surveyor Vault","Dropped by Surveyors: Dam swamp, open roads, Buried City and Blue Gate patrol paths.",['dam','buried','gate']),
("Rusted Shut Medical Kit","Medical interiors only. The Hospital in Buried City is the most reliable.",['buried']),
("Antiseptic","Pharmacies and medical storerooms. Best at the Pharmacy in Buried City. Craftable at Refiner level 2.",['buried']),
("Hornet Driver","Dropped by Hornets in red and yellow danger zones and on open rooftops.",ALL),
("Power Cable","Electrical and industrial facilities. Power Generation Complex is the best spot.",['dam']),
("Electrical Components","Industrial and tech interiors. Craftable at the Refiner.",ALL),
("Bastion Cell","Dropped only by Bastions: north Piazza Roma (Buried City), Hydroponic Dome Complex (Dam).",['buried','dam']),
("Industrial Battery","Server racks and large generators.",ALL),
("Advanced Electrical Components","Tech buildings and high-tier rooms such as Pilgrim's Peak and Reinforced Reception. Craftable at the Refiner.",['gate']),
("Pop Trigger","Dropped by Pops: Blue Gate underground walkways and homes, small clusters on Dam.",['gate','dam']),
("Synthesized Fuel","Water Treatment Control (Dam) and industrial storage rooms.",['dam']),
("Crude Explosives","Industrial interiors and storage rooms. Craftable at the Refiner from Chemicals.",ALL),
("Laboratory Reagents","Lab environments on Dam, plus hospital and research wings.",['dam','buried']),
("Rocketeer Driver","Dropped by Rocketeers: northwest Dam, South Swamp Outpost, Old Battleground, Ben Welder's Sunroof (Blue Gate).",['dam','gate']),
("Explosive Compound","Industrial zone of Dam and workshops with hazard signage. Craftable at the Refiner.",['dam']),
("Damaged Heat Sink","Server-filled buildings. The Control Tower on Spaceport is the most reliable.",['space']),
("Snitch Scanner","Dropped by Snitch drones over open sky paths on most maps. Shoot the thrusters to down them.",['gate','dam']),
("Fried Motherboard","Server rooms, computer labs and electronics storage on every map.",ALL),
("Leaper Pulse Unit","Dropped by Leapers: Dam between Water Treatment and Research & Administration, fortified spots in Buried City and Blue Gate.",['dam','buried','gate']),
]
BIRD="Bird nests on chimneys of Italian-style (terracotta roof) buildings, only while the Bird City condition is active on Buried City. There are no fixed duck buildings."
G2=[
("Rubber Duck","Random trinket loot, most often inside residential buildings on every map. One was found in the Testing Annex on Dam Battlegrounds.",ALL,"Nerd's Chalk"),
("Tropical Duck",BIRD,['buried'],"Arc Raiders Hub, Dexerto"),
("Gentle Duck",BIRD,['buried'],"Arc Raiders Hub, Dexerto"),
("Alien Duck",BIRD,['buried'],"Arc Raiders Hub, Dexerto"),
("Doodly Duck",BIRD,['buried'],"Arc Raiders Hub, Dexerto"),
("Flashy Duck",BIRD,['buried'],"Arc Raiders Hub, Dexerto"),
("Familiar Duck",BIRD,['buried'],"Arc Raiders Hub, Dexerto"),
]
NEST="Reported in Bird City bird nests on Buried City chimneys (the trinket is also ordinary loot in the categories shown)."
for n in ("Lance's Mixtape (5th Edition)","Breathtaking Snow Globe","Red Coral Jewelry","Music Box","Fine Wristwatch","Silver Teaspoon Set","Statuette","Painted Box","Rosary"):
    G2.append((n,NEST,['buried'],"Arc Raiders Hub"))
guide={}
for n,w,m in G:
    iid=byname[n.lower()]; guide[iid]={'w':w,'m':m,'s':ACER}
for n,w,m,src in G2:
    iid=byname[n.lower()]; guide[iid]={'w':w,'m':m,'s':src}


# ================= Frozen Trail 2.x extensions (sources dated Oct-Nov 2026) =================
def addstation(sid,name,levels,unl,req=None,note=None):
    stations.append({'id':sid,'n':name,'max':len(levels),'lv':levels,'un':unl,**({'req':req} if req else {}),**({'note':note} if note else {})})
def q(**k): return [{'i':a,'q':b} for a,b in k.items()]
# Gunsmith level 4
gs=[s for s in stations if s['id']=='weapon_bench'][0]
gs['lv'].append(q(radial_press=3,magnetic_accelerator=3,emperor_modulator=1)); gs['max']=4
gs['un'].append(['Amplification: a fifth weapon tier (also needs Research Station IV and Outpost 4)'])
gs['req']=[None,None,None,'Outpost level 4']
# Scrappy keeps repo data; move after the new stations later
scr=[s for s in stations if s['id']=='scrappy'][0]; stations.remove(scr)
addstation('outpost','Outpost',
  [[],q(steel_cable=3,sheet_metal=20,cable_strippers=3),q(epoxy_bucket=3,planks=35,hand_drill=3),q(sheet_metal=40,laser_level=3,insulation_roll=3)],
  [['Base room: 42 furniture slots and 8 station slots. Needs Raider level 18 and all three stages of the Sheltered Retreat project'],['One room: Chalet, Timeless or Panoramic (22 furniture slots)'],['One more room: Chalet, Timeless or Panoramic (22 furniture slots)'],['Studious Room (22 furniture slots)']],
  req=[None,None,None,None], note='Level 1 is the starting base room and has no upgrade cost. Gate for Research Station and Gunsmith 4.')
addstation('research','Research Station',
  [q(planks=35,battered_paperback=5,mini_pump=3),q(calculator=3,raider_logbook=3,skulker_targeter=5),q(differential_microphone=3,exodus_technical_handbook=3,bully_fragmenter=6),q(thermal_shaker=3,arc_data_module=3,frigate_inductor=1)],
  [['14 blueprint entries and 20 furniture designs'],['31 blueprint entries (plus Anvil) and 18 furniture designs'],['14 blueprint entries (plus Hullcracker) and 14 furniture designs'],['15 Amplified research entries']],
  req=['Outpost level 1 (1 room)','Outpost level 2 (2 rooms)','Outpost level 3 (3 rooms)','Outpost level 4 (4 rooms)'])
stations.append(scr)

# New Frozen Trail items missing from the Aug-2026 data set. Only facts found in the cited guides are filled in.
def newitem(i,n,t='Material',r=None,v=None,w=None,s=None,d=None,ve=None):
    o={'id':i,'n':n,'t':t,'r':r,'v':v,'ad':'2.x','nd':1 if (r is None or v is None) else 0}
    if w is not None:o['w']=w
    if s is not None:o['s']=s
    if d:o['d']=d
    if ve:o['ve']=ve
    out.append(o); by[i]={'id':i}; byname[n.lower()]=i
NI=[
 ('pendola_pass_observatory_key','Pendola Pass Observatory Key',dict(t='Key',r='Epic',d='Unlocks a small locked room in Cielo Sereno Observatory on Pendola Pass.')),
 ('pendola_pass_train_station_key','Pendola Pass Train Station Key',dict(t='Key',d='Unlocks a locked room in Almatera Station on Pendola Pass.')),
 ('pendola_pass_old_town_key','Pendola Pass Old Town Key',dict(t='Key',d='Unlocks a basement among the western houses of Old Town on Pendola Pass.')),
 ('pendola_pass_railyard_key','Pendola Pass Railyard Key',dict(t='Key',d='Unlocks a door at the Controlled Receiving Facility on Pendola Pass.')),
 ('planks','Planks',dict(ve=[{'tr':'Celeste','c':{'assorted_seeds':3},'lim':None,'lv':None}])),
 ('sheet_metal','Sheet Metal',dict(ve=[{'tr':'Celeste','c':{'assorted_seeds':3},'lim':None,'lv':None}])),
 ('steel_cable','Steel Cable',dict(d='Celeste trades it for Assorted Seeds (amount not stated in the guide).')),
 ('cable_strippers','Cable Strippers',{}),
 ('epoxy_bucket','Epoxy Bucket',dict(t='Topside Material',r='Rare',v=1000,w=0.5)),
 ('hand_drill','Hand Drill',dict(t='Topside Material',r='Rare',v=640,w=0.5)),
 ('laser_level','Laser Level',{}),('insulation_roll','Insulation Roll',{}),
 ('battered_paperback','Battered Paperback',dict(d='Grants 50 Research Points.')),('mini_pump','Mini Pump',{}),('calculator','Calculator',{}),('raider_logbook','Raider Logbook',dict(d='Grants 100 Research Points.')),
 ('skulker_targeter','Skulker Targeter',{}),('differential_microphone','Differential Microphone',{}),('exodus_technical_handbook','Exodus Technical Handbook',dict(d='Grants 150 Research Points.')),
 ('bully_fragmenter','Bully Fragmenter',{}),
 ('thermal_shaker','Thermal Shaker',dict(t='Topside Material',r='Epic',v=3000,w=0.5)),
 ('arc_data_module','ARC Data Module',dict(t='Topside Material',r='Epic',v=2000,w=0.5,s=3,d='Scavenged from ARC machines. Grants 200 Research Points. Cannot be recycled or salvaged.')),
 ('frigate_inductor','Frigate Inductor',dict(t='Topside Material',r='Legendary',v=7000)),
 ('radial_press','Radial Press',dict(t='Topside Material',r='Epic',v=3000,w=0.5,s=3,d='Not craftable.')),
 ('emperor_modulator','Emperor Modulator',dict(t='Topside Material',r='Legendary',v=7000,d='Legendary crafting material. Not a guaranteed drop. Keep one for the Gunsmith 4 upgrade.')),
 ('frigate_diagnostic_node','Frigate Diagnostic Node',dict(t='Topside Material',d='Found only on the ARC Frigate. Grants 1,000 Research Points.')),
 ('amplification_module','Amplification Module',dict(t='Special',d='Comes in Mk. I to Mk. V. Dropped by Frigates and the fallen Emperor on Pendola Pass.')),
]
for i,n,k in NI:
    assert i not in by, i
    newitem(i,n,**k)
# magnetic_accelerator already exists in the data set

PGUIDE="Arc Raiders Hub, Oct 13 2026"
def gd(name,w,m,src): guide[byname[name.lower()]]={'w':w,'m':m,'s':src}
gd('Planks',"Best in Old Town on the west side of Pendola Pass: kitchen cupboards, wardrobes, drawers, suitcases and stacking boxes in houses. Also stacking boxes and cupboards in the Commissary Supermarket. Celeste sells it for 3 Assorted Seeds.",['pendola'],'KeenGamer, Oct 13 2026')
gd('Sheet Metal',"Stella Montis: Assembly (yellow drawers) and Loading Bay (shipping containers, shelves, desks, workbenches). On Pendola Pass: Commissary Supermarket shelves, tables and back-room lockers. Celeste sells it for 3 Assorted Seeds.",['stella','pendola'],'KeenGamer, Oct 13 2026')
gd('Steel Cable',"Pendola Pass: lying out in the Railyard and the Fallen Emperor, never in containers. Celeste trades it for Assorted Seeds.",['pendola'],'AllThings.how, Oct 16 2026')
gd('Epoxy Bucket',"Pendola Pass only. Spawn spots by area: Almatera Station 408, Cielo Sereno Observatory 268, Freight Terminal 207, Railyard 149, Controlled Receiving Facility 145. Mostly loose loot on shelves, train-car tables and desks.",['pendola'],PGUIDE)
gd('Hand Drill',"Pendola Pass only. Spawn spots by area: Almatera Station 304, Cielo Sereno Observatory 208, Freight Terminal 181, Railyard 110, Controlled Receiving Facility 109. Mostly shelves, train-car tables and consoles.",['pendola'],PGUIDE)
gd('Thermal Shaker',"Pendola Pass only. Spawn spots by area: Commissary Supermarket 985, Almatera Station 402, Cielo Sereno Observatory 268, Freight Terminal 207, Railyard 149. Mostly loose loot on shelves and racks.",['pendola'],PGUIDE)
gd('Skulker Targeter',"Dropped by Skulkers: it is the gun half of a destroyed Skulker.",['pendola'],'AllThings.how, Oct 16 2026')
gd('Bully Fragmenter',"Dropped by Bullies, around Railroad Junction and the Commissary Supermarket, or collected after destroying one.",['pendola'],'AllThings.how, Oct 16 2026')
gd('ARC Data Module',"Scavenged from ARC machines.",[],'arcraiders.wiki')
gd('Frigate Inductor',"Only in containers aboard the ARC Frigate, so you need a raid with the Frigate map condition. The Frigate rotates between maps. Guides disagree on which: TimeSaver lists Pendola Pass, Dam and Spaceport most often, AllThings.how lists Pendola Pass and Blue Gate. About 1 in 350 tracked raids yields one.",['pendola','dam','space','gate'],'TimeSaver, Nov 2026 and AllThings.how, Oct 16 2026')
gd('Radial Press',"Pendola Pass only: 304 of 308 spawn spots are in Almatera Station (second-floor shelf room and the parked train cars underneath are best), 4 are in Porta Benvenuti. Loose loot on shelves and racks (54%) and train-car tables and seats (35%).",['pendola'],'TimeSaver, Oct 20 2026')
gd('Emperor Modulator',"Loot pods, breachable containers and wall capsules inside the Fallen Emperor on Pendola Pass. Entering needs an Emperor Gateway Conduit, crafted at Workbench level 1 from an ARC Conductive, ARC Insulated and ARC Plated Coupler (Redirection map condition). Not a guaranteed drop.",['pendola'],'KeenGamer, Oct 9 2026')
gd('Amplification Module',"Dropped by Frigates and the fallen Emperor on Pendola Pass. Frigates are risky.",['pendola'],'Destructoid, Oct 10 2026')

# ================= Weapons =================
import collections
fam=collections.OrderedDict()
guns=[i for i in items if i.get('isWeapon')]
for g in guns:
    m=re.match(r'(.+?)_(i|ii|iii|iv)$',g['id']); k=m.group(1) if m else g['id']
    fam.setdefault(k,[]).append(g['id'])
RN={'i':1,'ii':2,'iii':3,'iv':4}
def tier_of(gid):
    m=re.match(r'.+?_(i|ii|iii|iv)$',gid); return RN[m.group(1)] if m else 1
def eff(i): return {k:v.get('value') for k,v in (i.get('effects') or {}).items()}
BASEK={'Ammo Type','ARC Armor Penetration','Durability','Firing Mode','Magazine Size','Special Trait'}
def tbonus(i):
    e=eff(i); out=[]
    for k,v in e.items():
        if k in BASEK: continue
        if k=='Upgrade Modifiers' and isinstance(v,list): out+= [str(x) for x in v]; continue
        if v is True: continue
        if isinstance(v,(str,int,float)): out.append(k+' '+str(v))
    if not out:
        out=[k for k,v in e.items() if v is True]
    return out
STATK=('damage','fireRate','range','stability','agility','stealth')
weapons=[]
for k,ids in fam.items():
    ids=sorted(ids,key=tier_of); first=by[ids[0]]
    name=re.sub(r' (I|II|III|IV)$','',en(first['name']))
    w={'id':k,'n':name,'t':first['type'],'r':first['rarity'],'tiers':ids,'tv':[by[x]['value'] for x in ids],
       'rec':first.get('recipe'),'lvl':first.get('stationLevelRequired'),'bp':bool(first.get('blueprintLocked')),
       'up':[None]+[by[x].get('upgradeCost') for x in ids[1:]],
       'slots':first.get('modSlots') or {},'ef':eff(first),
       'ste':[{s:by[x][s] for s in STATK if s in by[x]} for x in ids],
       'dur':[ (eff(by[x]).get('Durability') or '') for x in ids],
       'mag':[ eff(by[x]).get('Magazine Size') for x in ids],
       'tb':[tbonus(by[x]) for x in ids],
       'rep':[by[x].get('repairCost') or None for x in ids]}
    if first.get('vendors'): w['ve']=[{'tr':v.get('trader'),'c':v.get('cost'),'lim':v.get('limit'),'lv':v.get('requiredLevel')} for v in first['vendors']]
    weapons.append(w)
# Base stats for stats the data set leaves out. Damage, fire rate and range: arcraiders.wiki (same scale as
# the data set). Stability, agility and stealth: arcraidershub.com (approximate).
WIKI_STATS={
 'kettle':(8.5,30,42.8),'rattler':(9,33.3,56.2),'arpeggio':(9.5,18.3,55.9),'tempest':(10,36.7,55.9),'bettina':(16,28.7,52.3),
 'ferro':(40,6.6,53.1),'renegade':(35,21,68.8),'aphelion':(25,9,76),'stitcher':(6.5,45.3,42.1),'canto':(6.5,56.7,51),
 'bobcat':(6,66.7,44),'il_toro':(67.5,14,20),'vulcano':(49.5,26.3,26),'hairpin':(20,9,38.6),'burletta':(10,28,41.7),
 'venator':(16,36.7,48.4),'anvil':(40,16.3,50.2),'torrente':(8,58.3,49.9),'osprey':(45,17.7,80.3),'jupiter':(60,7.7,71.7),
 'rascal':(75,13.7,28.3),'hullcracker':(100,20.3,38.9),'equalizer':(8,33.3,68.6),
}
HUB_STATS={
 'anvil':dict(stability=67,agility=56,stealth=10),'aphelion':dict(stability=88,agility=39,stealth=16),
 'bettina':dict(stability=81,agility=43,stealth=14),'bobcat':dict(agility=74.3,stealth=21),
 'burletta':dict(stability=75,agility=86,stealth=24),'ferro':dict(stability=78,agility=32,stealth=8),
 'hairpin':dict(stability=92,agility=77,stealth=70),'stitcher':dict(agility=74.8,stealth=19),
 'tempest':dict(agility=52,stealth=14),'torrente':dict(stability=78.2,agility=39.8,stealth=1),
 'venator':dict(stability=71,agility=78,stealth=12),
}
for w in weapons:
    ste=[{k:v for k,v in (x or {}).items() if v is not None} for x in w['ste']]
    fb={}
    if w['id'] in WIKI_STATS: fb.update(zip(('damage','fireRate','range'),WIKI_STATS[w['id']]))
    fb.update(HUB_STATS.get(w['id'],{}))
    for s,v in fb.items():
        if not any(s in x for x in ste):
            for x in ste: x[s]=v
            w['sest']=1
    # the data set often lists stats on only some tiers; where every listed tier agrees, the
    # stat does not change between tiers, so fill the gaps with that value
    for s in STATK:
        vals=[x[s] for x in ste if s in x]
        if vals and all(v==vals[0] for v in vals):
            for x in ste: x[s]=vals[0]
    # where fire rate is the same base value on every tier, apply each tier's "Increased Fire Rate X%" bonus
    frs=[x.get('fireRate') for x in ste]
    if len(ste)>1 and frs[0] is not None and all(v==frs[0] for v in frs):
        for i,x in enumerate(ste):
            m=re.search(r'Increased Fire Rate\s*([\d.]+)%',' '.join(w['tb'][i] or []))
            if m and i>0:
                x['fireRate']=round(frs[0]*(1+float(m.group(1))/100),1); w['frb']=1
    w['ste']=ste
mods={}
for i in items:
    if i['type']!='Modification': continue
    mods[i['id']]={'n':en(i['name']),'r':i['rarity'],'v':i['value'],'rec':i.get('recipe'),'lvl':i.get('stationLevelRequired'),'bp':bool(i.get('blueprintLocked')),'ef':eff(i),
      **({'ve':[{'tr':v.get('trader'),'c':v.get('cost'),'lim':v.get('limit'),'lv':v.get('requiredLevel')} for v in i['vendors']]} if i.get('vendors') else {})}

MB='Metaforge, updated Apr 9 2026'; AS='ArcStatus, Nov 4 2026'; TG='TheGamer, Jan 6 2026'
BPL={
 'anvil_i':("Raider Containers. Uncovered Caches give about a 10% blueprint rate; any Raider container on any map can hold it.",MB),
 'bettina_i':("Raider Containers; First Wave Caches during the Hurricane condition.",MB),
 'bobcat_i':("Locked Gate event on Blue Gate; First Wave Caches during Hurricane; breachable containers. TheGamer also lists it as a three-star Trial reward.",MB+' and '+TG),
 'burletta_i':("Quest reward: Industrial Espionage (Tian Wen, Speranza).",MB),
 'canto_i':("World drop. Best reports are First Wave Raider Caches during Hurricane; Night Raid and locked rooms may improve odds. Farm spots: Dam (Hydroponic Dome, Control Tower), Buried City (Hospital, Town Hall), Spaceport (Arrival, Departure), Blue Gate (Gate Approach, Pilgrim's Peak), Stella Montis (Medical Research, Cultural Archives).",AS),
 'dolabra':("Close Scrutiny ARC Operation, from the three breachable Assessor containers.",AS+' and '+MB),
 'equalizer':("Harvester event: puzzle final containers or the Queen Core.",MB),
 'jupiter':("Harvester event puzzle final containers. More common than Equalizer.",MB),
 'hullcracker_i':("Quest reward: The Major's Footlocker.",MB),
 'il_toro_i':("Raider Containers; Uncovered Caches.",MB),
 'osprey_i':("Raider Containers; buried Raider Caches.",MB),
 'tempest_i':("Night Raid (residential and commercial containers); First Wave Caches during Hurricane, now the best source.",MB),
 'torrente_i':("Raider Containers, mainly Uncovered Raider Caches.",MB),
 'venator_i':("Raider Containers; Uncovered Caches.",MB),
 'vulcano_i':("Hidden Bunker event (Spaceport breachables); First Wave Caches during Hurricane.",MB),
 'aphelion':("Stella Montis drawers.",TG),
 'angled_grip_ii':("Residential containers on basic maps (Blue Gate Village, Buried City Grandioso, Dam residential).",MB),
 'angled_grip_iii':("Residential containers during 2x conditions (Locked Gate, Night Raid, Electromagnetic Storm).",MB),
 'compensator_ii':("Residential containers on basic maps (Buried City Plaza Rosa, Dam Ruby Residence).",MB),
 'compensator_iii':("Residential containers during 2x conditions. Locked Gate is considered best.",MB),
 'extended_barrel_ii':("High-value zones and breachables during 2x conditions and Locked Gate (Blue Gate, Dam, Buried City).",MB),
 'extended_barrel_iii':("High-value zones and breachables during 2x conditions and Locked Gate (Blue Gate, Dam, Buried City).",MB),
 'extended_light_mag_ii':("Residential containers on basic maps (Dam Ruby Residence).",MB),
 'extended_light_mag_iii':("Residential containers during 2x conditions. Blue and purple key rooms reported.",MB),
 'extended_medium_mag_ii':("Residential containers on basic maps (Blue Gate Village, Dam residential).",MB),
 'extended_medium_mag_iii':("Residential and high-value zones during 2x conditions (Night Raid, Electromagnetic Storm).",MB),
 'extended_shotgun_mag_ii':("Residential containers on basic maps (Buried City Santa Maria and Grandioso).",MB),
 'extended_shotgun_mag_iii':("Residential containers during 2x conditions or Locked Gate. Desks in blue and purple key rooms reported.",MB),
 'lightweight_stock':("High-value zones during 2x conditions (Night Raid), residential bias. Also a Weekly Trial reward at 4,000 points.",MB),
 'muzzle_brake_ii':("Residential containers on basic maps (Buried City Grandioso, Dam Pale Apartments).",MB),
 'muzzle_brake_iii':("2x conditions: Stella Montis Security Checkpoint (Night Raid), Blue Gate (Locked Gate).",MB),
 'padded_stock':("Residential-style and breachable rooms during 2x conditions (Night Raid, Locked Gate).",MB),
 'shotgun_choke_ii':("Residential containers on basic maps (Buried City Plaza Rosa, Dam Pattern House).",MB),
 'shotgun_choke_iii':("Residential containers during 2x conditions: Blue Gate Village (Night Raid, Locked Gate), Dam Control Tower, Hydroponic Domes.",MB),
 'shotgun_silencer':("High-value zones on harder maps such as Blue Gate. Also a Weekly Trial reward.",MB),
 'silencer_i':("Residential containers on basic maps (suitcases, desks). Rarer than Silencer II.",MB),
 'silencer_ii':("Residential containers, more likely during 2x conditions. Also seen on basic maps (Stella Lobby, Atrium).",MB),
 'stable_stock_ii':("Residential containers on basic maps.",MB),
 'stable_stock_iii':("Residential and high-value zones during 2x conditions.",MB),
 'vertical_grip_ii':("Residential containers on basic maps (wardrobes, drawers); a breachable room at Buried City Train Station.",MB),
 'vertical_grip_iii':("Residential containers during 2x conditions (Buried City trash cans and suitcases).",MB),
}
# loot-only attachments (no crafting recipe in the game data; sources from the game's quest and project data)
LOOT={'kinetic_converter':"Found as loot (cannot be crafted). Guaranteed from the Trophy Display project, Ferocious Foes phase: hand in 10 ARC Performance Steel.",
      'horizontal_grip':"Found as loot (cannot be crafted). Also a reward from Tian Wen's quest Safe Harbor on Riven Tides.",
      'silencer_iii':"Found as loot only (cannot be crafted).",
      'anvil_splitter':"Since update 2.0 it is no longer a normal attachment: it is part of the Amplified Anvil upgrade. Before that it came from Celeste's quest A Rising Tide and the Trophy Display project."}
GD='Game data (quests and projects), Aug 2026'
for k,(t,src) in BPL.items(): 
    tgt=mods.get(k)
    if tgt is not None: tgt['bpl']=[t,src]
for w in weapons:
    if w['tiers'][0] in BPL: w['bpl']=list(BPL[w['tiers'][0]])
    elif w['id'] in BPL: w['bpl']=list(BPL[w['id']])

# amplification (15 weapons). Module marks the guides state outright are flagged explicit.
AMPDATA={
 'anvil':(3,True,['Anvil Splitter or X-Rounds (only one)']),
 'aphelion':(5,False,['Bigger Mag','Charged Burst','Increased Burst (needs Charged Burst)','Incendiary Rounds']),
 'bettina':(None,False,['Bigger Mag','Semi-Auto','X-Rounds (needs Semi-Auto)']),
 'burletta':(None,False,['Burst Fire','Increased Burst','Full-Auto','Sprint Shooting']),
 'canto':(None,False,['Carbine Conversion','Incendiary Rounds','Sprint Shooting (cannot combine with Carbine Conversion)']),
 'equalizer':(5,False,['Bigger Mag','Anti-Weak Point','Ramping Damage (Anti-Weak Point and Ramping Damage cannot combine)']),
 'hairpin':(None,False,['Incendiary Rounds (alone only)','Semi-Auto','Sprint Shooting','Tracker Rounds']),
 'hullcracker':(4,True,['Mag Reload','Incendiary Grenades']),
 'il_toro':(None,False,['More Reload','Slug Rounds']),
 'jupiter':(5,False,['Bigger Mag','Scoped','Straight (Ergonomic) Bolt']),
 'kettle':(None,False,['Full-Auto','Anti-Shield','X-Rounds (alone only)']),
 'osprey':(3,True,['Anti-Weak Point','Straight (Ergonomic) Bolt','Tracker Rounds']),
 'rascal':(None,False,['High Velocity','Incendiary Grenades','Sprint Shooting']),
 'rattler':(1,True,['More Reload','Drum Mag, 64 rounds (needs More Reload)','Incendiary Rounds']),
 'renegade':(None,False,['More Reload','Scoped']),
}
RMK={'Common':1,'Uncommon':2,'Rare':3,'Epic':4,'Legendary':5}
for w in weapons:
    if w['id'] in AMPDATA:
        mk,explicit,opts=AMPDATA[w['id']]
        if mk is None: mk=RMK[w['r']]
        elif not explicit: mk=RMK[w['r']]
        w['amp']={'mk':mk,'explicit':explicit,'opts':opts}
        if w['id']=='anvil' and RMK[w['r']]!=mk: w['amp']['conflict']='The game data lists Anvil as '+w['r']+' (Mk. '+['','I','II','III','IV','V'][RMK[w['r']]]+'); the AOEAH guide says Mk. III.'
big_ids={}


# ---- keys and locked rooms. pin = [image key, x, y] in pixels of the 1800px map images; a 4th value of 1 means the pin is on the exact door (otherwise it marks the area)
KG='KeenGamer, Feb 24 2026'; DX='Dexerto wiki, Apr 29 2026'; NC="Nerd's Chalk, Dec 29 2025"; GF='GamesFuze, May 25 2026'; UM='UMA Technology, Oct 20 2026'; TB='TechBloat, Oct 31 2026'; SN='Shacknews, Nov 13 2025'; GR='GamesRadar, May 8 2026'; AC='AltChar, Oct 19 2026'
ANY='Random loot in containers (drawers, lockers, cabinets, bags). Keys are not carried by ARC.'
K=[
 # Dam
 ('dam_control_tower_key','dam','Top room of the Control Tower.','Random containers; guides mention admin and residential buildings and the Control Center area.','High-value room (KeenGamer).',[KG,DX,NC],['dam',1077,906]),
 ('dam_surveillance_key','dam','Interior room in the Water Treatment Control building.','Random containers; often found in and around Water Treatment Control.',None,[KG,DX,NC],['dam',750,856]),
 ('dam_staff_room_key','dam','Staff room inside the Research & Administration building.','Random containers, especially administrative ones.','Crafting materials and rare components (Nerd\'s Chalk).',[DX,NC],['dam',1040,970]),
 ('dam_testing_annex_key','dam','Doors inside the Testing Annex. Guides disagree on whether one key opens both doors.','Random containers in and near the Testing Annex and admin buildings.','Larger loot room (KeenGamer).',[KG,DX,NC],['dam',1249,1127]),
 ('dam_controlled_access_zone_key','dam','Door at the top of the Controlled Access Zone, the puzzle area under the dam between the Power Generation Complex and Pipeline Tower.',None,None,[DX],['dam',1165,529]),
 # Spaceport
 ('spaceport_control_tower_key','space','Control Tower A6 (also called the Ground Control Tower).','Random containers; upper tower levels and pilot offices are mentioned.',None,[KG,DX,NC],['space',983,885]),
 ('spaceport_container_storage_key','space','Locked room in Container Storage, up the stairs to the upper walkway.','Random containers, lockers and crates.','Often guarded by ARC (Nerd\'s Chalk).',[KG,DX,NC],['space',1124,951]),
 ('spaceport_trench_tower_key','space','North and South Trench Towers. One key opens both.','Random containers.',None,[KG,DX,NC],['space',1023,382]),
 ('spaceport_warehouse_key','space','Secured room in the Shipping Warehouse, northwest Spaceport.','Random containers.','Expect heavy player traffic (Nerd\'s Chalk).',[KG,DX,NC],['space',816,356]),
 ('hidden_bunker_key','space','A bunker in Spaceport. Guides describe an Outskirts Bunker in Alberi Hills (southwest, near the Departure Building). The Hidden Bunker map event opens with four antennas, not this key.','Random containers.',None,[KG,DX,GR],None),
 # Buried City
 ('buried_city_town_hall_key','buried','Town Hall building.','Random containers; residential areas such as Grandioso Apartments.','Large loot area (KeenGamer).',[KG,DX,NC],['buried',966,986]),
 ('buried_city_hospital_key','buried','Restricted rooms in the Hospital.','Random containers; upper floors of the Hospital and nearby buildings.','Medical supplies (KeenGamer).',[KG,DX,NC],['buried',924,590]),
 ('buried_city_jkv_employee_access_card','buried','4th floor of the Space Travel building (J Kozma Ventures).','Random containers, often near the JKV building.',None,[KG,DX,NC],['buried',1029,781]),
 ('buried_city_residential_master_key','buried','Apartment doors. KeenGamer names Grandioso Apartments; Dexerto says a building south of West Village.','Random containers (drawers, shelves).',None,[KG,DX,NC],['buried',583,1153]),
 # Blue Gate
 ('blue_gate_village_key','gate','A locked building in the Village.','Random containers in the Village houses.',None,[KG,DX,NC],['gate',709,303]),
 ('blue_gate_confiscation_room_key','gate','Confiscated goods room in the tunnels; KeenGamer places it under Reinforced Reception.','Random containers in the tunnels and nearby buildings.','Close-quarters fights (Nerd\'s Chalk).',[KG,DX,NC],['gate',920,385]),
 ('blue_gate_communication_tower_key','gate','Pilgrim\'s Peak, by the Communication Tower: a basement metal door (KeenGamer).','Random containers near the tower and tunnels.',None,[KG,DX,NC],['gate',1367,312]),
 ('blue_gate_cellar_key','gate','Works on several cellar doors. Most reported: just south of Olive Grove (angled door by a rock wall and beehives), Trapper\'s Glade (against a small ruined building), south of Raider\'s Refuge (hatch in open ground) and west of Ruined Homestead along the road (by a low stone wall).','Random containers.','Several doors, so check a few until you find one still closed.',[KG,DX,NC],['gate',745,982]),
 ('patrol_car_key','gate','Trunk of a patrol car. KeenGamer: Traffic Tunnel at the Headhouse (Blue Gate). Dexerto: a patrol car near the Customs House on Riven Tides.','Random containers; also a quest reward.','Random, moderate gear (Nerd\'s Chalk).',[KG,DX,NC],['gate',1052,420]),
 ('ancient_fort_security_code','gate','Gate Control Room (blue building on top of the Checkpoint gate). One of four codes for the Locked Gate condition.','Containers at Ancient Fort.','The fourth code opens the main Checkpoint gate; the area behind it is lootable.',[SN],['gate',964,1113]),
 ('pilgrims_peak_security_code','gate','Gate Control Room. One of four codes for the Locked Gate condition.','Containers at Pilgrim\'s Peak.',None,[SN],['gate',1359,322]),
 ('raiders_refuge_security_code','gate','Gate Control Room. One of four codes for the Locked Gate condition.','Containers at Raider\'s Refuge.',None,[SN],['gate',548,441]),
 ('reinforced_reception_security_code','gate','Gate Control Room. One of four codes for the Locked Gate condition.','Containers at Reinforced Reception.',None,[SN],['gate',905,360]),
 # Stella Montis
 ('stella_montis_archives_key','stella','A door in the Archives, at the end of the tunnels.','Random containers in high-loot areas (lockers, cabinets, bags).','High-value room (KeenGamer).',[KG,DX],['stella_l',1616,501,1]),
 ('stella_montis_assembly_admin_key','stella','Assembly admin door in the northwest, near the Assembly Line.','Random containers in Assembly and Medical Research.',None,[KG,DX],['stella_l',661,358,1]),
 ('stella_montis_medical_storage_key','stella','Medical storage door in Medical Research.','Random containers.',None,[KG],['stella_l',185,578,1]),
 ('stella_montis_security_checkpoint_key','stella','First door on the right in the Security Checkpoint.','Random containers.',None,[KG,DX],['stella_l',1189,332,1]),
 ('seed_vault_box_key','stella','A specific box in the Seed Vault.',None,None,[],['stella_u',1210,1253]),
 # Riven Tides
 ('riven_tides_hotel_keycard_no_113','riven','Hotel Panorama Azzurro, floor 01: north-east stairs up, room straight ahead.','Random loot.',None,[GF,DX],['riven',433,1070]),
 ('riven_tides_hotel_keycard_no_107','riven','Hotel Panorama Azzurro, floor 01: north-west of room 113, on the left.','Guaranteed from Apollo\'s quest Battening Down; also random loot.','Busy PvP area (GamesFuze).',[GF,DX],['riven',433,1070]),
 ('riven_tides_hotel_keycard_no_102','riven','Hotel Panorama Azzurro, floor 01: far west end of a hallway, on the right.','Random loot.',None,[GF],['riven',433,1070]),
 ('riven_tides_hotel_keycard_no_205','riven','Hotel Panorama Azzurro, floor 02: near the centre, by a zipline and the western stairs.','Random loot.',None,[GF,DX],['riven',433,1070]),
 ('riven_tides_hotel_keycard_no_208','riven','Hotel Panorama Azzurro, floor 02: eastern part.','Random loot.',None,[GF,DX],['riven',433,1070]),
 ('riven_tides_hotel_keycard_no_311','riven','Hotel Panorama Azzurro, floor 03: easternmost stairs, just right of boarded room 313.','Random loot.',None,[GF,DX],['riven',433,1070]),
 ('riven_tides_hotel_keycard_no_404','riven','Hotel Panorama Azzurro, floor 04: easternmost stairs to the roof, then the far west corner at the end of a hallway.','Random loot.',None,[GF,DX],['riven',433,1070]),
 ('riven_tides_classified_records_keycard','riven','Port Authority Building, top floor, west side: a pair of locked doors guarded by a Sentry.','Random loot.',None,[GF,DX],['riven',795,690]),
 ('riven_tides_secure_storage_keycard','riven','A second locked door inside the Classified Records room (open that first).','Random loot.',None,[GF],['riven',795,690]),
 ('riven_tides_crane_house_keycard','riven','Harbor, in the Stacking Yard: top of the south-central building, south-east corner door. Reach it by zipline or ladders.','Random loot.',None,[GF,DX],['riven',1240,954,1]),
 # Pendola Pass
 ('pendola_pass_observatory_key','pendola','Cielo Sereno Observatory (north of the Railyard), main building: west exterior stairs, central north door, right-hand door, then left; the small room is at the end of the passage.','Scavenging; Shani\'s quest Belly of the Beast is reported to give one.','One of the two best rooms on the map (AltChar).',[TB,UM,AC],None),
 ('pendola_pass_train_station_key','pendola','Almatera Station: enter from the west, go to reception, the door is on the left.',None,None,[UM,AC],None),
 ('pendola_pass_old_town_key','pendola','South-west Old Town: a basement among the western houses, through a narrow gap beside the southern white house.',None,'One of the two best rooms on the map (AltChar).',[UM,AC],None),
 ('pendola_pass_railyard_key','pendola','Controlled Receiving Facility: climb the SC/Super Costa building\'s outside stairs and follow the upper hallway past the stairwell.',None,None,[UM,AC],None),
 # Any map
 ('raider_hatch_key','any','Any Raider Hatch (an extraction point) on any map.','Containers; can also be crafted or bought from Shani.',None,[NC],None),
]
# keys that open more than one door: extra pins
XPINS={'blue_gate_cellar_key':[['gate',510,562],['gate',560,478],['gate',790,1012]]}
keys=[]
for (kid,mp,door,get,loot,src,pin) in K:
    keys.append({'id':kid,'m':mp,'door':door,'get':get or ANY,'gn':0 if get else 1,'loot':loot,'src':src,'pin':pin,'pf':1 if kid.endswith('_security_code') else 0})
    if kid in XPINS: keys[-1]['xp']=XPINS[kid]


# ---- corrections from patch notes (Frozen Trail 2.0, Oct 8 2026; 2.3.0, Oct 27 2026) ----
PN='KeenGamer 2.0 patch notes, Oct 8 2026'; GB='Gamebrief patch notes, 2.3.0 Oct 27 2026'
for mid,txt in LOOT.items():
    if mid in mods:
        mods[mid]['loot']=1; mods[mid]['bpl']=[txt, PN if mid=='anvil_splitter' else GD]
for w in weapons:
    if w['id']=='anvil':
        w['r']='Rare'; w['slots'].pop('special',None)
        w['amp']={'mk':3,'explicit':True,'opts':w['amp']['opts']}
        w['note']='Update 2.0 raised the Anvil from Uncommon to Rare, removed its tech-mod slot and stopped Tian Wen selling it.'
    if w['id'] in ('anvil','hullcracker') and w.get('ve'):
        w['ve']=[v for v in w['ve'] if v.get('tr')!='Tian Wen']
    if w['id'] in ('dolabra','bobcat','equalizer','jupiter','tempest','vulcano') and w.get('bpl'):
        w['bpl']=[w['bpl'][0]+' Since update 2.3 the blueprint can also drop during any major map condition, at a slightly lower chance.', w['bpl'][1]+' and '+GB]
    for k in list(w['slots']):
        w['slots'][k]=[m for m in w['slots'][k] if m!='anvil_splitter']
        if not w['slots'][k]: w['slots'].pop(k)
for o in out:
    if o['id'] in ('anvil_i','anvil_ii','anvil_iii','anvil_iv'): o['r']='Rare'
    if o['id'].startswith(('anvil_','hullcracker_')) and o.get('ve'): o['ve']=[v for v in o['ve'] if v.get('tr')!='Tian Wen']
def nocreds(ve): return [v for v in (ve or []) if 'creds' not in (v.get('c') or {})]
for o in list(out)+list(mods.values())+weapons:
    if o.get('ve'):
        o['ve']=nocreds(o['ve'])
        if not o['ve']: o.pop('ve')
events += [{'id':'frigate','n':'Frigate','cat':'major','new':1},{'id':'redirection','n':'Redirection','cat':'major','new':1}]
weapons.append({'id':'stiletto','n':'Stiletto','t':'Battle Rifle','r':'Uncommon','wip':1,'tiers':[],'slots':{},
  'facts':['Added in update 2.0 (Frozen Trail).','Light ammo, 16-round magazine, semi-automatic (preview figures).','Drops with its blueprint from containers, lockers, weapon cases and raider caches.'],
  'src':'AllThings.how, Oct 9 2026; TimeSaver, Oct 8 2026'})
weapons.append({'id':'bantam','n':'Bantam','t':'Hand Cannon','r':'Uncommon','wip':1,'tiers':[],'slots':{},
  'facts':['Added in update 2.0 (Frozen Trail).','Snub-nosed revolver that uses heavy ammo.'],
  'src':'KeenGamer patch notes, Oct 8 2026; TimeSaver, Oct 8 2026'})
# ---- map condition rotation (estimated). Observed hour by hour (UTC, Europe servers) from
# thearcraiders.wiki/events, 5 Nov 2026 14:00 to 7 Nov 2026 07:00. Most events repeat every 25 hours,
# so the site loops this cycle. When Embark changes the rotation, record a fresh run here and update EV_REC/EV_PATCH.
EV_T0='2026-11-05T14:00:00Z'; EV_REC='2026-11-05'; EV_PATCH='2.3.0'; EV_PER=25
EV_RAW={
 'dam':"Electromagnetic Storm,Matriarch,ARC Frigate,-,Harvester,Matriarch,ARC Frigate,-,-,Night Raid,-,Uncovered Caches,Uncovered Caches,-,ARC Frigate,-,Prospecting Probes,-,ARC Frigate,Matriarch,-,ARC Frigate,Uncovered Caches,-,ARC Frigate,Electromagnetic Storm,Matriarch,ARC Frigate,-,Harvester,Matriarch,ARC Frigate,ARC Frigate,-,Night Raid,-,Uncovered Caches,Uncovered Caches,-,ARC Frigate,-,Prospecting Probes",
 'buried':"Prospecting Probes,ARC Frigate,Bird City,Uncovered Caches,ARC Frigate,Bird City,Close Scrutiny,-,-,Bird City,-,-,Bird City,Prospecting Probes,-,ARC Frigate + Bird City,-,Night Raid,Bird City,-,-,Bird City,-,-,Bird City,Prospecting Probes,ARC Frigate,Bird City,Uncovered Caches,ARC Frigate,Bird City,-,-,-,Bird City,-,-,Bird City,Prospecting Probes,-,ARC Frigate + Bird City,-",
 'space':"ARC Frigate,-,Close Scrutiny,ARC Frigate,-,-,Harvester,Matriarch,Matriarch,-,ARC Frigate,Night Raid,ARC Frigate,Night Raid,Launch Tower Loot,-,Matriarch,Launch Tower Loot,-,ARC Frigate,Uncovered Caches,Night Raid,ARC Frigate,Harvester + Hidden Bunker,Matriarch,ARC Frigate,-,Electromagnetic Storm,ARC Frigate,-,-,Harvester,Harvester,Matriarch,-,ARC Frigate,Night Raid,ARC Frigate,Night Raid,Launch Tower Loot,-,Matriarch",
 'gate':"Harvester,-,Harvester,Matriarch,Hurricane,ARC Frigate,Prospecting Probes,-,-,ARC Frigate,Matriarch,-,-,Matriarch,-,Uncovered Caches,ARC Frigate,-,-,Night Raid,-,Locked Gate,Matriarch,ARC Frigate,-,Harvester,-,Harvester,Matriarch,-,ARC Frigate,Locked Gate + Prospecting Probes,Prospecting Probes,-,ARC Frigate,Matriarch,-,-,Matriarch,-,Uncovered Caches,ARC Frigate",
 'stella':"-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid,-,Night Raid",
 'riven':"Night Raid,Beachcombing,-,-,Beachcombing,-,Night Raid,Beachcombing,Beachcombing,-,Prospecting Probes,Beachcombing,-,-,Beachcombing,-,-,Beachcombing,-,Prospecting Probes,Beachcombing,-,-,Beachcombing,-,Night Raid,Beachcombing,-,-,Beachcombing,-,Night Raid,Night Raid,Beachcombing,-,Prospecting Probes,Beachcombing,-,-,Beachcombing,-,-",
 'pendola':"-,-,-,-,-,-,-,ARC Frigate,ARC Frigate,-,-,ARC Frigate + Redirection,-,ARC Frigate,-,Night Raid,-,ARC Frigate,-,-,ARC Frigate + Redirection,-,-,Redirection,-,Redirection,-,-,-,-,-,-,-,ARC Frigate,-,-,ARC Frigate,-,ARC Frigate,-,Night Raid,-",
}
ev={'t0':EV_T0,'per':EV_PER,'rec':EV_REC,'patch':EV_PATCH,'src':'thearcraiders.wiki','m':{}}
for k,v in EV_RAW.items():
    a=[x.strip() for x in v.split(',')]
    # later observations win where the two passes disagree
    ev['m'][k]=[('' if a[i]=='-' else a[i]) for i in [s+EV_PER if s+EV_PER<len(a) else s for s in range(EV_PER)]]
# ---- quest rewards: item id -> quests that give it (used for blueprints and weapons)
qr={}
for f in sorted(os.listdir(R+'quests')) if os.path.isdir(R+'quests') else []:
    if not f.endswith('.json'): continue
    q=json.load(open(R+'quests/'+f))
    for r in (q.get('rewardItemIds') or []):
        iid=r.get('itemId') if isinstance(r,dict) else r
        if iid: qr.setdefault(iid,[]).append({'id':q['id'],'n':en(q.get('name') or q['id'])})
# ---- blueprints: every blueprint, how to research it (Research Station) and where to find it ----
RS_SRC='ARCTracker research list, Nov 2026'; LP='LePreStore blueprint guide, Oct 24 2026'
RS_RAW="""Bantam|1|3000|8 Hornet Driver
Barricade Kit|1|1000|3 Rusty ARC Steel
Burletta|1|2000|8 Simple Gun Parts
Crash Mat|1|1000|5 Durable Cloth
Gas Mine|1|1000|3 Household Cleaner
Grappling Hook|1|2000|10 Rope
Il Toro|1|1500|5 Shredder Gyro
Lure Grenade|1|1000|6 ARC Circuitry
Pulse Mine|1|1000|3 Industrial Battery
Remote Raider Flare|1|500|25 Chemicals
Seeker Grenade|1|1000|1 Rocketeer Driver
Stiletto|1|3000|15 Wasp Driver
White Flag|1|500|5 Planks
Yank Grenade|1|1000|8 Steel Cable
Angled Grip II|2|3000|5 ARC Flex Rubber + 1 Mechanical Components
Anvil|2|3000|5 Bully Fragmenter + 1 Rusted Tools
Canto|2|2000|10 Skulker Targeter + 5 Steel Spring
Compensator II|2|2000|1 Cooling Coil + 5 Rusty ARC Steel
Defibrillator|2|2000|5 Adrenaline Shot + 3 Syringe
Explosive Mine|2|2000|3 Comet Igniter + 2 Sensors
Extended Barrel II|2|2000|5 Rusty ARC Steel + 1 Steel Cable
Extended Light Mag II|2|2000|5 Dried-Out ARC Resin + 5 Wires
Extended Medium Mag II|2|2000|3 Canister + 5 Dried-Out ARC Resin
Extended Shotgun Mag II|2|2000|5 Dried-Out ARC Resin + 1 Mechanical Components
Heavy Gun Parts|2|2000|5 Simple Gun Parts + 1 Unusable Weapon
Jolt Mine|2|2000|3 Advanced ARC Powercell + 1 Industrial Battery
Light Gun Parts|2|2000|5 Simple Gun Parts + 1 Unusable Weapon
Medium Gun Parts|2|2000|5 Simple Gun Parts + 1 Unusable Weapon
Muzzle Brake II|2|2000|5 Rusty ARC Steel + 1 Steel Cable
Osprey|2|3000|1 Camera Lens + 3 Sentinel Firing Core
Rascal|2|3000|15 ARC Alloy + 2 Bombardier Cell
Shotgun Choke II|2|2000|1 Heavy Gun Parts + 5 Rusty ARC Steel
Showstopper|2|2000|5 Hornet Driver + 3 Industrial Battery
Silencer I|2|2000|1 Cooling Coil + 5 Rusty ARC Steel
Smoke Grenade|2|2000|3 Gas Grenade + 1 Household Cleaner
Stable Stock II|2|2000|5 ARC Flex Rubber + 1 Rubber Pad
Surge Coil|2|2000|10 Battery + 3 Hornet Driver
Tagging Grenade|2|2000|2 Broken Guidance System + 2 Sensors
Tether Launcher|2|2000|3 Steel Cable + 1 Unusable Weapon
Torrente|2|3000|3 Bastion Cell + 1 Cooling Fan
Trailblazer|2|2000|5 Crude Explosives + 1 Turbine Compressor
Trigger 'Nade|2|2000|2 Pop Trigger + 2 Radio
Venator|2|3000|3 Leaper Pulse Unit + 1 Mechanical Components
Vertical Grip II|2|2000|5 ARC Flex Rubber + 1 Mechanical Components
Vita Shot|2|2000|2 Microscope + 2 Syringe
Bettina|3|4500|1 Complex Gun Parts + 5 Rocketeer Driver
Combat Mk. 3 (Flanking)|3|3000|5 ARC Circuitry + 3 Mechanical Components
Complex Gun Parts|3|3000|1 Advanced Mechanical Components + 2 Complex Gun Parts
Deadline|3|3000|5 Comet Igniter + 1 Fossilized Lightning
Hullcracker|3|4500|5 Bombardier Cell + 1 Complex Gun Parts
Looting Mk. 3 (Safekeeper)|3|3000|5 ARC Circuitry + 5 Canister
Powered Descender|3|3000|1 Advanced Electrical Components + 2 Cooling Fan
Silencer II|3|3000|1 Advanced Mechanical Components + 5 ARC Performance Steel
Tactical Mk. 3 (Defensive)|3|3000|2 Advanced ARC Powercell + 5 ARC Circuitry
Tactical Mk. 3 (Revival)|3|3000|3 Antiseptic + 5 ARC Circuitry
Vertical Grip III|3|3000|1 Advanced Mechanical Components + 6 ARC Motion Core
Vita Spray|3|3000|5 Antiseptic + 50 Chemicals"""
# where to find blueprints that have no detailed note above (weapons and attachments use BPL)
BPF={
 'complex_gun_parts':"Security containers on all maps.",
 'heavy_gun_parts':"Raider containers on all maps. Also a Trials reward.",
 'light_gun_parts':"Raider containers on all maps. Also a Trials reward.",
 'medium_gun_parts':"Raider containers on all maps. Also a Trials reward.",
 'combat_mk3_aggressive':"Medical and security containers on Stella Montis or Blue Gate. Also a Trials reward.",
 'combat_mk3_flanking':"Medical and security containers on Stella Montis or Blue Gate. Also a Trials reward.",
 'looting_mk3_safekeeper':"Medical, security and metal crates on all maps. Also a Trials reward.",
 'looting_mk3_survivor':"Medical, security and metal crates on all maps. Also a Trials reward.",
 'tactical_mk3_defensive':"Medical and security loot and ARC Surveyors on Stella Montis or Blue Gate. Also a Trials reward.",
 'tactical_mk3_healing':"Medical and security containers on Stella Montis or Blue Gate. Also a Trials reward.",
 'tactical_mk3_revival':"Medical and security containers on Stella Montis or Blue Gate. Also a Trials reward.",
 'tactical_mk3_smoke':"High-tier containers; Stella Montis is one known spot.",
 'defibrillator':"Medical containers on all maps. Also a Trials reward.",
 'vita_shot':"Medical containers on all maps and ARC Surveyors. Also a Trials reward.",
 'vita_spray':"Medical containers or ARC Surveyors.",
 'barricade_kit':"Electrical loot on all maps. Also a Trials reward.",
 'blue_light_stick':"World loot on all maps. Also a Trials reward.",
 'green_light_stick':"World loot on all maps. Also a Trials reward.",
 'red_light_stick':"World loot on all maps. Also a Trials reward.",
 'yellow_light_stick':"World loot on all maps. Also a Trials reward.",
 'crash_mat':"Riven Tides containers or world loot. Also a Trials reward.",
 'powered_descender':"Riven Tides containers, including the Stacking Yard.",
 'remote_raider_flare':"Electrical loot on all maps. Also a Trials reward.",
 'snap_hook':"World loot during Electromagnetic Storm.",
 'white_flag':"World loot on Riven Tides. Also a Trials reward.",
 'blaze_grenade':"Industrial containers on all maps. Also a Trials reward.",
 'deadline':"World loot on Stella Montis. Also a Trials reward.",
 'explosive_mine':"Industrial containers on all maps. Also a Trials reward.",
 'fireworks_box':"World loot during Cold Snap.",
 'gas_mine':"World loot on Stella Montis.",
 'jolt_mine':"Industrial containers on all maps. Also a Trials reward.",
 'lure_grenade':"Quest reward.",
 'pulse_mine':"World loot on Stella Montis. Also a Trials reward.",
 'seeker_grenade':"World loot on Stella Montis.",
 'showstopper':"Industrial containers on all maps. Also a Trials reward.",
 'smoke_grenade':"Residential loot on all maps. Also a Trials reward.",
 'surge_coil':"World loot during Electromagnetic Storm.",
 'tagging_grenade':"Electrical loot on all maps. Also a Trials reward.",
 'trailblazer':"World loot on Stella Montis. Also a Trials reward.",
 'trigger_nade':"World loot on several maps.",
 'wolfpack':"Residential loot during Night Raid. Also a Trials reward.",
 'rascal_i':"Raider containers on all maps.",
 'grappling_hook':"Research Station. Also reported from scavenging and the free Reward Pass.",
 'tether_launcher':"Research Station. Also reported from scavenging.",
 'yank_grenade':"Research Station. Also reported from scavenging.",
 'bantam':"Research Station. Also reported from scavenging.",
 'stiletto':"Research Station. Scavenging is not confirmed.",
}
CONDS=["Electromagnetic Storm","Night Raid","Locked Gate","Hurricane","Harvester","Close Scrutiny","Hidden Bunker","Uncovered Caches","Prospecting Probes","Bird City","Matriarch","Launch Tower Loot","Beachcombing","Cold Snap"]
MAPN={'dam':'Dam','buried':'Buried City','space':'Spaceport','gate':'Blue Gate','stella':'Stella Montis','riven':'Riven Tides','pendola':'Pendola Pass'}
def scan(txt):
    c=[x for x in CONDS if x in txt]
    if 'Frigate' in txt: c.append('ARC Frigate')
    if 'Redirection' in txt: c.append('Redirection')
    m=[k for k,v in MAPN.items() if v in txt or (k=='dam' and 'Dam ' in txt)]
    return c,m
HEAL={'defibrillator','vita_shot','vita_spray'}
GADGET={'barricade_kit','crash_mat','blue_light_stick','green_light_stick','red_light_stick','yellow_light_stick','powered_descender','remote_raider_flare','snap_hook','white_flag','fireworks_box','grappling_hook','tether_launcher'}
GUNT={"Assault Rifle","SMG","Pistol","Shotgun","Battle Rifle","Hand Cannon","LMG","Sniper Rifle","Special"}
def cat(i,t):
    if t in GUNT: return 'wpn'
    if t=='Modification': return 'att'
    if t=='Augment': return 'aug'
    if t=='Topside Material': return 'parts'
    if i in HEAL: return 'heal'
    if i in GADGET: return 'gad'
    return 'exp'
def nrm(s): return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
NB={nrm(k):v for k,v in byname.items()}
NB[nrm('Cable Stripper')]='cable_strippers'
wbyt={w['tiers'][0]:w for w in weapons if w.get('tiers')}
bpl={}
for w in weapons:
    if w.get('bpl') and w.get('tiers'): bpl[w['tiers'][0]]=w['bpl']
for k,m in mods.items():
    if m.get('bpl') and not m.get('loot'): bpl[k]=m['bpl']
bps=[]; seen={}
def add_bp(iid,name,t):
    base=re.sub(r' I$','',name) if t in GUNT else name
    b=NB.get(nrm(base+' Blueprint'))
    e={'id':iid,'n':base,'c':cat(iid,t)}
    if b: e['b']=b
    if iid in bpl: e['f'],e['fs']=bpl[iid][0],bpl[iid][1]
    elif iid in BPF: e['f'],e['fs']=BPF[iid],LP
    if iid in wbyt: e['w']=wbyt[iid]['id']
    bps.append(e); seen[nrm(base)]=e
for o in out:
    if o.get('bp'): add_bp(o['id'],o['n'],o['t'])
for iid,name,t in [('bantam','Bantam','Hand Cannon'),('stiletto','Stiletto','Battle Rifle'),('grappling_hook','Grappling Hook','Quick Use'),('tether_launcher','Tether Launcher','Quick Use'),('yank_grenade','Yank Grenade','Quick Use')]:
    if nrm(name) not in seen and iid not in by: add_bp(iid,name,t); bps[-1]['x']=1
miss=[]
for line in RS_RAW.splitlines():
    n,l,p,mats=line.split('|'); e=seen.get(nrm(n))
    if not e: miss.append(n); continue
    mm={}
    for part in mats.split(' + '):
        q,mn=part.split(' ',1); mid=NB.get(nrm(mn))
        if not mid: miss.append(mn); continue
        mm[mid]=int(q)
    e['rs']={'l':int(l),'p':int(p),'m':mm}
if miss: print('blueprints: unmatched research names', miss)
for e in bps:
    txt=e.get('f','')
    c,m=scan(txt); 
    if c: e['fc']=c
    if m: e['fm']=m
    qs=[]
    for k in (e.get('b'),):
        for q in qr.get(k,[]) if k else []:
            if q not in qs: qs.append(q)
    if qs: e['q']=qs
RP=[('battered_paperback',50,"Residential rooms on any map; Old Town houses on Pendola Pass"),
    ('raider_logbook',100,"Almost anywhere"),
    ('exodus_technical_handbook',150,"Exodus-style sites; Cielo Sereno Observatory on Pendola Pass"),
    ('arc_data_module',200,"Wrecks of ARC machines (Probes, Couriers, Harvesters)"),
    ('frigate_diagnostic_node',1000,"Breach-and-search containers on the ARC Frigate, only while the Frigate condition is up")]
blueprints={'list':bps,'rp':[{'i':a,'p':b,'w':c} for a,b,c in RP],'src':[RS_SRC,LP,'CheckpointGuides research points guide, Oct 17 2026']}
# where the research items turn up, so the Item finder can show it
CG='CheckpointGuides, Oct 17 2026'; ALLM=['dam','buried','space','gate','stella','riven','pendola']
RPG={'battered_paperback':("Residential interiors on any map; the Old Town houses on Pendola Pass are a good spot. Study it after extracting for 50 Research Points.",ALLM),
     'raider_logbook':("Almost anywhere. Study it after extracting for 100 Research Points.",ALLM),
     'exodus_technical_handbook':("Exodus-style sites, and the Cielo Sereno Observatory on Pendola Pass. Study it after extracting for 150 Research Points.",['pendola']),
     'arc_data_module':("Wrecks of ARC machines such as Probes, Couriers and Harvesters. Study it after extracting for 200 Research Points.",ALLM),
     'frigate_diagnostic_node':("Breach-and-search containers on the ARC Frigate, only while the Frigate condition is up. Study it after extracting for 1,000 Research Points.",['dam','buried','space','gate','pendola'])}
for k,(w,m) in RPG.items(): guide[k]={'w':w,'m':m,'s':CG}
# quests that give a blueprint: who gives them, where, what to do, and what comes before
QMAP={'dam_battlegrounds':'Dam','dam':'Dam','buried_city':'Buried City','spaceport':'Spaceport','the_spaceport':'Spaceport','blue_gate':'Blue Gate','stella_montis':'Stella Montis','riven_tides':'Riven Tides','pendola_pass':'Pendola Pass'}
qs={}
qall={}
for f in sorted(os.listdir(R+'quests')) if os.path.isdir(R+'quests') else []:
    if f.endswith('.json'):
        q=json.load(open(R+'quests/'+f)); qall[q['id']]=q
for e in bps:
    for qq in e.get('q',[]):
        q=qall.get(qq['id'])
        if not q or q['id'] in qs: continue
        qs[q['id']]={'n':en(q.get('name') or q['id']),'tr':q.get('trader'),
          'm':[QMAP.get(x,x.replace('_',' ').title()) for x in (q.get('map') or [])],
          'o':[en(o) for o in (q.get('objectives') or [])][:4],
          'pre':[en(qall[x]['name']) for x in (q.get('previousQuestIds') or []) if x in qall]}
        # items the quest asks you to hand in ("Deliver 3 Wires to ...")
        dl={}
        for o in qs[q['id']]['o']:
            mm=re.match(r"(?i)^deliver (?:(\d+)\s+|an?\s+|the\s+)?(.+?) to\b",o)
            if not mm: continue
            nmx=nrm(mm.group(2)); iid=NB.get(nmx) or NB.get(re.sub(r's$','',nmx)) or NB.get(re.sub(r'es$','',nmx))
            ob={x['id']:x for x in out}.get(iid)
            if ob and 'quest' not in str(ob.get('t','')).lower(): dl[iid]=dl.get(iid,0)+int(mm.group(1) or 1)
        if dl: qs[q['id']]['d']=dl
blueprints['qs']=qs
# ---- every quest, for the Quest tracker: who gives it, where, what to do, what it needs and gives
QM={'dam_battlegrounds':'dam','buried_city':'buried','the_spaceport':'space','the_blue_gate':'gate','stella_montis':'stella','riven_tides':'riven','pendola_pass':'pendola'}
known={x['id'] for x in out}
def iq(lst): return [[x['itemId'],x.get('quantity',1)] for x in (lst or []) if x.get('itemId') in known]
qorder={}; queue=[k for k,q in qall.items() if not q.get('previousQuestIds')]; n=0
while queue:
    k=queue.pop(0)
    if k in qorder or k not in qall: continue
    qorder[k]=n; n+=1
    queue+=qall[k].get('nextQuestIds') or []
quests=[]
for k,q in sorted(qall.items(), key=lambda kv:(qorder.get(kv[0],9999),kv[0])):
    e={'id':k,'n':en(q.get('name') or k),'tr':q.get('trader') or '','m':[QM.get(x,x) for x in (q.get('map') or [])],
       'o':[en(o) for o in (q.get('objectives') or [])],'r':iq(q.get('rewardItemIds')),'g':iq(q.get('grantedItemIds')),
       'req':iq(q.get('requiredItemIds')),'pre':q.get('previousQuestIds') or [],'nx':q.get('nextQuestIds') or []}
    loc={lg:(q.get('name') or {}).get(lg) for lg in ('pt','es','fr','de','sv')}
    loc={lg:v for lg,v in loc.items() if v and v!=e['n']}
    if loc: e['nl']=loc
    if q.get('xp'): e['xp']=q['xp']
    if q.get('otherRequirements'): e['oth']=[str(x) for x in q['otherRequirements']]
    quests.append(e)
print('quests:', len(quests))
print('blueprints:', len(bps), 'entries,', sum(1 for e in bps if 'rs' in e), 'researchable')

# ---- MetaForge (metaforge.app/arc-raiders): newer values, missing items and spawn hints. Written by scripts/metaforge.py.
OUTD=os.environ.get('OUT','build'); mfp=os.path.join(OUTD,'mf.json')
mfd=json.load(open(mfp)) if os.path.exists(mfp) else {}
mf_icons={}; mfinfo=None
if mfd.get('items'):
    oby={o['id']:o for o in out}; added=filled=0
    for mid,m in mfd['items'].items():
        oid=mfd['alias'].get(mid) or mid.replace('-','_')
        if oid not in oby: oid=NB.get(nrm(m['n']),oid)
        o=oby.get(oid)
        if o is None:
            o={'id':oid,'n':m['n'],'t':m['t'],'mfn':1}; out.append(o); oby[oid]=o; added+=1
        else: filled+=1
        for a in ('r','v','w','s'):
            if m.get(a) is not None: o[a]=m[a]
        if m.get('d') and not o.get('d'): o['d']=m['d']
        if m.get('f'): o['f']=m['f']
        if m.get('sp'): o['sp']=m['sp']
        if o.get('nd') and o.get('r') and o.get('v') is not None: o['nd']=0
        if m.get('icon'): mf_icons[oid]=m['icon']
    mfinfo={'types':mfd['types'],'loot':mfd['loot'],'at':mfd.get('fetched')}
    # key doors from MetaForge: exact door positions, every door a key opens
    kp=mfd.get('keypins') or {}; kn=0
    for k in keys:
        for mid,pins in kp.items():
            oid=mfd['alias'].get(mid) or mid.replace('-','_')
            if oid!=k['id'] and NB.get(nrm(mfd['items'].get(mid,{}).get('n','')))!=k['id']: continue
            ours=k.get('pin')
            pins=sorted(pins,key=lambda p:(0 if ours and p[0]==ours[0] and abs(p[1]-ours[1])+abs(p[2]-ours[2])<80 else 1))
            k['pin']=pins[0]; k['xp']=pins[1:] or None
            if not k['xp']: k.pop('xp')
            k['mfp']=1; kn+=1; break
    print('MetaForge key doors:', kn, 'keys')
    mq=mfd.get('quests') or {}; qn=0
    for e in quests:
        m=mq.get(re.sub(r'^\d+_','',e['id']).replace('_','-'))
        if m: e['mk']=m; qn+=1
    print('MetaForge quests:', qn, 'with map spots')
    print('MetaForge merge:', filled, 'items updated,', added, 'added')
json.dump(mf_icons,open(os.path.join(OUTD,'mf_icons.json'),'w'))

data={'items':out,'mf':mfinfo,'stations':stations,'events':events,'guide':guide,'weapons':weapons,'mods':mods,'keys':keys,'qr':qr,'ev':ev,'bp':blueprints,'quests':quests}
js='var DB='+json.dumps(data,separators=(',',':'),ensure_ascii=False)+';'
open(os.path.join(os.environ.get('OUT','build'),'data.js'),'w').write(js)
print(len(js),'bytes', len(out),'items', len(guide),'guide entries')
print([e['n'] for e in events])
print([ (s['n'],[len(u) for u in s['un']]) for s in stations])
