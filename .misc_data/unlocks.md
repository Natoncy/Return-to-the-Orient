# Unlocks

Generated 2026-10-29 from the unlock triggers in data/config/export/main/asset/assets_includes/triggers/,
using the unlock editor's parser (.misc_data/tools/unlock_editor). It is a snapshot: the triggers are the source of truth.

- Order: Nomads, Envoys, Envoy skyscraper, Scholars. Each stage lists its main trigger first, then the **Extra**
  triggers that also need population in another region or a DLC.
- Everything here is shown greyed out (unhidden) one stage before it unlocks, except at the first stage of a tier
  (2.0, 3.0): like vanilla (colony01 1.4 and 2.4 unhide nothing), those items appear without a preview.
  Entries inside a build-menu subfolder (Small/Large Harbour, Market Stalls, Airship Platform, Trading Company) and the
  subfolders themselves are never unhidden either: a preview there breaks the subfolder button. They appear when they unlock.
- Build-menu folders follow vanilla too: a tab or subfolder shows as soon as one entry inside is shown or unlocked,
  and a later tier's tab gets its own chain copies (the "Scholars: …" chains) so it doesn't open with an earlier tier.
- A pool unlocks everything in it: buildings, fields, goods, production chains (the build-menu entries), recipes
  and items. Entries inside a pool are separated by ";".
- Creative mode (assets_creative_mode.xml) unlocks everything at once and is not listed.
- Market-stall and export needs also have conditions on the residence side, see needs.md.
- The Nomad and Envoy counts are the New World's (Jornaleros 50/100/200/300, Obreros 1/300/600/1000/1500).
  Buildings with a New World counterpart unlock at the same stage as there (see Vanilla order below).

## Nomads

### 1.0 — Orient session reached

- Kontor I
- Palm lumber (pool)
  - Buildings: Palm Lumberjack
  - Goods: Palm Wood
  - Items: Khalil al-Najjar, The Woodcutter of the Oases; Frame Saw
- Imperial Kontor I; Desert Road; Wooden Bridge
- Bazaar (pool)
  - Buildings: Marketplace
  - Goods: Market
  - Items: Regulations for Souks and Supply; Vizier Decree on Urban Jurisdiction
- Nomad house
- Warehouse I (pool)
  - Buildings: Warehouse I

### 1.1 — 50 Nomads

- Irrigation (pool)
  - Buildings: Noria; Canal Orient; Crossing Canal-Street Orient; Crossing Canal-FastStreet Orient
  - Chains: Irrigation
  - Items: Storage Ordinance of the Diwan
- Dates (pool)
  - Buildings: Date Farm
  - Fields: Date Field
  - Goods: Dates
  - Items: Fatima bint Khalid, Desert Botanist; Manual Pollination System of the Palm Grove; Date Seeds; Quality Date Seeds; Hybrid Date Seeds; Decree on the Grafting and Pruning of Fruit Trees
- Trade Union

### 1.2 — 100 Nomads

- Harbour menu (tier 1); Quay; Depot; Harbour Office
- Camels (pool)
  - Buildings: Camel Farm
  - Fields: Camel Field
  - Goods: Camels
  - Items: Animal Grazing and Breeding Agreement; Hassan ibn Rashid, Breeder of purebred camels

### 1.3 — 200 Nomads

- Pomegranate Juice (pool)
  - Buildings: Pomegranate Farm
  - Fields: Pomegranate Field
  - Goods: Pomegranate Juice
  - Items: Fatima bint Khalid, Desert Botanist; Mariam bint Yusuf al-Bustani, Guardian of the Royal Pomegranate; Salim al-Masri, Juice Counterfeiter; Pomegranate Screw Press; Yusuf ibn Hamdan, Juice Sommelier; Pomegranate Juice Seeds; Quality Pomegranate Juice Seeds; Hybrid Pomegranate Juice Seeds; Decree on the Grafting and Pruning of Fruit Trees
- Mud Bricks (pool)
  - Buildings: Clay Pit
  - Chains: Mud bricks
  - Items: Nasrin Khatun, The Master of Clay; Mining Dewatering Pump
- Fire Department
- Harbour defenses 1 (pool)
  - Buildings: Puckle Gun; FlaK tower
- Repair Crane

### 1.4 — 300 Nomads

- Mosque (pool)
  - Buildings: Mosque
  - Goods: Mosque
  - Items: Sheikh al-Qadiri, The Voice of the Minbar; Vizier Decree on Urban Jurisdiction
- Rugs (pool)
  - Buildings: Carpet Workshop; Silk Plantation
  - Fields: Silk Field
  - Goods: Silk Fabric
  - Chains: Rugs
  - Items: Farhad Mirza Tabrizi, Master of the Loom; Layla al-Dimashqi, President of the Royal Silk Guild; Mehmet Efendi Kaya, Raised Among Looms; Silk Seeds; Quality Silk Seeds; Hybrid Silk Seeds; Leyla al-Harir, the Mistress of the Cocoon; Steam boilers for silk reeling
- Envoy house; FloorUpgradeInAllRegions (vanilla 30728); Police Station; Ornaments tab; ornament group Park; ornament group City; ornament group Paving; ornament group Fences and Walls; ornament group Countryside; Oriental Tent; Silo; Small Ruins; Small Oriental Wall

## Envoys

### 2.0 — 1 Envoy

- Paved Street
- Mosaic (pool)
  - Buildings: Mosaic Workshop; Clay Pit; Beryl Mine; Beryl Mine work area
  - Goods: Beryl; Mosaic
  - Chains: Mosaic
  - Items: Nasrin Khatun, The Master of Clay; Mining Dewatering Pump
- Consulate (pool)
  - Buildings: Consulate
  - Goods: Consulate; Sultan's Seals
  - Items: Edict of Urban Settlement; Hassan ibn Mahmud, Merchant of Nearby Lands; Rashid ibn al-Zahir, Consular Envoy of the Sultan
- Warehouse & kontor II (pool)
  - Buildings: Warehouse II; Kontor II; Imperial Kontor II
- Spice Powder (pool)
  - Buildings: Spice Mill; Aniseed Farm
  - Fields: Aniseed Field
  - Goods: Spice Powder; Aniseed
  - Chains: Spice Powder
  - Items: Abdul Rahman al-Haddad, The Weigher of a Thousand Spices; Hassan al-Bakri, The Obsessive Blender; Zayn al-Qadir, Allergic to Spicy Food; Aniseed Seeds; Quality Aniseed Seeds; Hybrid Aniseed Seeds
- Bedouin Camp; Bedouin Tent
- Pearl Necklaces (pool)
  - Buildings: Pearl Necklace Workshop; Pearl Diver
  - Goods: Pearl Necklaces
  - Chains: Pearl Necklace
  - Items: Aisha bint Marwan, Pearlsmith of Bahrain; Nabil ibn Yusuf al-Sarraj, With the Silver Touch; Pearl Sorting Bank-Bench; Zubayda al-Durra, the Deep-Sea Diver; Diving Ballast Stone
- Bedouin Camp (need); Town Hall; Fertilizer module; Large Oriental Wall; Oriental Wall Junction; Oriental Palm; Palm Tree (Orient copy); Small Palm Tree (Orient copy); Bush (Orient copy); Grass (Orient copy)
- **Extra** (needs DLC Tourist Season):
  - Palm Trees (Orient copy)

### 2.1 — 300 Envoys

- Harbour menu (tier 2); Pier; Advanced Pier
- Ceremonial Sabers (pool)
  - Buildings: Oriental Smith; Oriental Smith: Ceremonial Sabers; Import Dock: Ebony (vanilla); Orient trading company; Orient trading company warehouse; Ebony Import Dock (Orient); Honey Import Dock (Orient); Export Dock: Mosaic; Export Dock: Ceremonial Sabers; Export Dock: Flotation Concentrate; Export Dock: Pearl Necklaces; Silver Ore Mine; Silver Ore Mine work area; Silver Smelter
  - Goods: Ceremonial Sabers; Ebony; Trade Licenses; Silver Ore; Silver Bars
  - Chains: Ceremonial Sabers
  - Recipes: Ceremonial Sabers
  - Menus: Orient construction menu trading company
  - Items: Charcoal Crucible Furnace; Jalal ad-Din al-Halabi, Smith of the Royal Armory; Water-Powered Trip Hammer; Farid ibn Yasin, The Gadget Seller; Bahram ibn Kaveh, Obsessive Smelter; Gallery Foreman; Mining Dewatering Pump
  - Old World trading company (vanilla) (pool)
    - Buildings: Foreign Trading Company; Foreign Trading Company Warehouse; 1999005388 (missing in vanilla); Export Dock: Tools; Export Dock: Steel; Export Dock: Weapons; Export Dock: Sewing Machines; Export Dock: Dynamite; Export Dock: Advanced Weapons; Export Dock: Steam Engines; Export Dock: Typewriters
    - Goods: Trade Licenses
- Export Goods menu
- Elmore mixture (pool)
  - Buildings: Flotation Plant; Ore Drum Module; Acid Plant; Sulfur Pit
  - Goods: Flotation Concentrate; Sulfuric Acid; Sulfur
  - Chains: Elmore mixture
  - Items: Iskandar ibn Faraj, Chemistry Expert; Daryush Mehrzad, Tireless Foreman; Lead Chamber
- Cyanide (pool)
  - Goods: Cyanide
- Oil (pool)
  - Buildings: Oil Harbor I; Oil Harbor II; Oil Harbor III; Oil Harbor IV; Railway; Oil Storage; Oil Heavy Industry; Oil Pump; Tractor module; Fuel Station
  - Chains: Oil; Fuel
- Marketstall: Pocket Watches (pool)
  - Buildings: Marketstall: Pocket Watches; Marketstall
  - Goods: Marketstall: Pocket Watches
  - Items: Omar ibn Salih al-Tujjar, The Great Importer
- Market Stalls menu
- Hummus (pool)
  - Buildings: Olive Plantation; Chickpea Farm; Hummus Kitchen; Cold Press; Silo module (camel feed, eats chickpeas)
  - Fields: Olive Grove; Chickpea Field
  - Goods: Olive Oil; Olives; Chickpeas; Hummus
  - Chains: Hummus
  - Items: Olive Seeds; Quality Olive Seeds; Hybrid Olive Seeds; Chickpea Seeds; Quality Chickpea Seeds; Hybrid Chickpea Seeds
- Roasted Chickpeas (pool)
  - Buildings: Roastery: Chickpeas; Chickpea Farm
  - Fields: Chickpea Field
  - Goods: Roasted Chickpeas; Chickpeas
  - Chains: Roasted chickpeas
  - Recipes: Chickpeas; Roastery Recipes
  - Items: Chickpea Seeds; Quality Chickpea Seeds; Hybrid Chickpea Seeds
- Harbour defenses 2 (pool)
  - Buildings: Cannon Tower; Fire tower
- Small Street Canopy; Oriental Place
- **Extra** (needs 15× Investor Skyscraper: Level 2 + DLC The High Life):
  - Marketstall: Biscuits (pool)
    - Buildings: Marketstall: Biscuits; Marketstall
    - Goods: Marketstall: Biscuits
    - Items: Omar ibn Salih al-Tujjar, The Great Importer
- **Optional submod** (`-Natoncy_return_to_the_orient_beta_compatibility`, 300 Envoys): Silver Ore Import Dock

### 2.2 — 600 Envoys

- Hospital
- Airship platform (pool)
  - Buildings: Orient airship landing platform; Orient Item Transfer Module; Orient Airship Commuter Station; DLC11 Cafe Orient; DLC11 Cafe Tables Orient; DLC11 Clock Orient; DLC11 Flagpole Orient; DLC11 Benches Small Orient; DLC11 Benches Large Orient; DLC11 Sign Orient; DLC11 Gate Orient
  - Menus: Orient construction menu airship platform
- Oriental Fence; Oriental Lighthouse: Foundations

### 2.3 — 1000 Envoys

- Marketstall: Gramophones (pool)
  - Buildings: Marketstall: Gramophones; Marketstall
  - Goods: Marketstall: Gramophones
  - Items: Omar ibn Salih al-Tujjar, The Great Importer
- Large Street Canopy
- Spiced tea (pool)
  - Buildings: Tea Brewery
  - Goods: Spiced Tea
  - Chains: Spiced tea
  - Items: Spice Supply Decree; Jalaluddin al-Qahwa, The Master of Spices
- Large Ruins; Oriental Watchtower; Oriental Lighthouse: Tower
- **Extra** (needs 1800 Artistas + DLC New World Rising):
  - Marketstall: Ice Cream (pool)
    - Buildings: Marketstall: Ice Cream; Marketstall
    - Goods: Marketstall: Ice Cream
    - Items: Omar ibn Salih al-Tujjar, The Great Importer

### 2.4 — 1500 Envoys

- Oriental Statue
- Hookahs (pool)
  - Buildings: Oriental Workshop; Oriental Workshop: Hookahs
  - Goods: Hookahs
  - Chains: Hookahs
  - Recipes: Hookahs
  - Items: Charcoal Crucible Furnace; Karim ibn Nasser, Renowned Hooka Craftsman; Mustafa ibn Qadir, The Master Silver Craftsman; Farid ibn Yasin, The Gadget Seller
- Kaftans (pool)
  - Buildings: Kaftan Tailor; Silk Plantation
  - Fields: Silk Field
  - Goods: Kaftans; Silk Fabric
  - Chains: Kaftans
  - Items: Iskender Pasha Oglu, Dressmaker to the Grand Vizier; Regulations of the Kaftan Workshops of the Main Bazaar; Silk Seeds; Quality Silk Seeds; Hybrid Silk Seeds; Leyla al-Harir, the Mistress of the Cocoon; Steam boilers for silk reeling
- Armor Pierce tower
- Warehouse & kontor III (pool)
  - Buildings: Warehouse III; Kontor III; Imperial Kontor III
- Oriental Lighthouse: Lantern Room; Oriental Lighthouse
- Lighthouse beacons (pool)
  - Items: Beacon of the Harbour; Thrifty Beacon of the Shipwrights; Steadfast Beacon of the Fleet; Eternal Beacon of the Seven Seas; Beacon of the Dhows; Swift Beacon of the Trade Winds; Vigilant Beacon of the Frigates; Radiant Beacon of the Monsoon; Beacon of the Stokers; Tireless Beacon of the Boilers; Relentless Beacon of the Steamers; Golden Beacon of the Merchants; Beacon of the Gunners; Fierce Beacon of the Broadside; Thundering Beacon of the Admiralty; Unbreakable Beacon of the Navy; Beacon of the Skies; Buoyant Beacon of the Clouds; Steady Beacon of the Airmen; Soaring Beacon of the Djinn; Beacon of the Pearl Divers; Glimmering Beacon of the Deep; Mysterious Beacon of the Sunken Hoards; Fabled Beacon of the Drowned Kingdom
- Oriental Place 2

### 2.5 — 2250 Envoys

- Grand Mosque: Foundations; Ore Drum Module; Oriental City Wall; Oriental City Gate; Oriental Wall Tower
- **Extra** (needs 1× Investor Skyscraper: Level 4 + DLC The High Life):
  - Marketstall: Typewriters (pool)
    - Buildings: Marketstall: Typewriters; Marketstall
    - Goods: Marketstall: Typewriters
    - Items: Omar ibn Salih al-Tujjar, The Great Importer
- **Extra** (needs 1× Engineer Skyscraper: Level 3 + DLC The High Life):
  - Marketstall: Typewriters (same pool as above)
- **Extra** (needs 4000 Artistas + DLC New World Rising):
  - Marketstall: Fans (pool)
    - Buildings: Marketstall: Fans; Marketstall
    - Goods: Marketstall: Fans
    - Items: Omar ibn Salih al-Tujjar, The Great Importer
- **Extra** (needs 4000 Artistas):
  - Incense (pool)
    - Buildings: Palm Leaf Pickers; Incense Workshop
    - Goods: Incense; Palm Leaves
    - Chains: Incense
    - Items: Leaf Pickers

### 2.6 — 3250 Envoys

- Marzipan (pool)
  - Buildings: Confectioner's Workshop; Almond Farm; Bee Garden; Import Dock: Honey
  - Fields: Almond Field
  - Goods: Marzipan; Almonds; Honey; Trade Licenses
  - Chains: Marzipan
  - Items: Noura bint Saeed, A Sweeter World!; Samiq ibn Zahir, The Kalifa's Confectioner; Almond Seeds; Quality Almond Seeds; Hybrid Almond Seeds; Nadira al-Lawz, The Lady of the Almond Grove; Decree on the Grafting and Pruning of Fruit Trees
  - Old World trading company (vanilla) (pool, contents under 2.1)
- Grand Mosque: Prayer Hall; Jugglers' Camp
- Bath House (pool)
  - Buildings: Bath House
  - Goods: Bath House
  - Chains: Bath house
  - Items: Ibrahim ibn Hasan al-Hammami, Baths Supervisor; Vizier Decree on Urban Jurisdiction
- Oriental Harbour Tower; Oriental Place 3

### 2.7 — 4500 Envoys

- Grand Mosque: Towers; Prayer Ground; Small Oriental Fountain
- **Extra** (needs 5000 Investors):
  - Marketstall: Steam Carriages (pool)
    - Buildings: Marketstall: Steam Carriages; Marketstall
    - Goods: Marketstall: Steam Carriages
    - Items: Omar ibn Salih al-Tujjar, The Great Importer
- **Extra** (needs 6000 Artistas + DLC New World Rising):
  - Marketstall: Scooter (pool)
    - Buildings: Marketstall: Scooter; Marketstall
    - Goods: Marketstall: Scooter
    - Items: Omar ibn Salih al-Tujjar, The Great Importer

### 2.8 — 6000 Envoys

- Grand Mosque
- Museum (pool)
  - Buildings: Abacus museum module; Prophet's Stone museum module; Palm Leaf museum module
  - Items: DESERT TREASURES; Desert Treasures Exhibition; Divine Prophet's Stone; The Scholars' Abacus; Palm leaf of the holy Martyr
- Research Outpost; Envoy house: Level 2
- **New Horizons only**:
  - Oudh (pool)
    - Buildings: Agarwood Plantation; Mycological Laboratory: P. parasiticum; Infestation Cellar; Oudh Distillery; Copper Smelter; Oriental Smith: Alembics
    - Goods: P. parasiticum; Oudh; Oudh Perfume; Agarwood; Copper Bar; Alembics
    - Chains: Oud; Mushrooms
    - Recipes: Mycological Laboratory Patent List; Lab_oud; Alembics

### New Horizons lab (any Envoy count)

- **New Horizons only** (needs 2000 Magnates):
  - Noble Mushrooms lab (pool)
    - Buildings: Mycological Laboratory: Noble Mushrooms
    - Goods: Mouldy Bread
    - Chains: Noble mushrooms
    - Recipes: Lab_noble; Mycological Laboratory Patent List

## Envoy skyscraper

The Level 2 house is shown at 4500 Envoys and unlocks at 6000 Envoys (2.8). The Level 3 house unlocks at Sky 1.2.

### Sky 1.1 — first Level 2 Envoy house built

- Rose Water (pool)
  - Buildings: Perfumery; Rose Nursery; Export Dock: Rose Water; Copper Smelter; Oriental Smith: Alembics
  - Fields: Rose Field
  - Goods: Rosewater; Roses; Copper Bar; Alembics
  - Chains: Rose Water
  - Recipes: Alembics
  - Items: Rashid ibn Farouk, Anthophile Floriculturist; Rose Garden Pruning and Watering Calendar; Persian High-Pressure Retort; Zahra bint Ismail, Distiller by Tradition; Roses Seeds; Quality Roses Seeds; Hybrid Roses Seeds; Decree on the Grafting and Pruning of Fruit Trees

### Sky 1.2 — 15 Level 2 houses

- Candied dates (pool)
  - Buildings: Fruit Manufactory; Bee Garden
  - Goods: Candied Dates; Honey
  - Chains: Candied dates
  - Items: Mahinbanu Khatun, the Shah’s Personal Confectioner; Tin-Lined Copper Cauldron
- Envoy house: Level 3

### Sky 2.1 — first Level 3 house built

- Chandeliers (pool)
  - Buildings: Oriental Workshop; Oriental Workshop: Chandeliers; Export Dock: Chandeliers
  - Goods: Chandeliers
  - Chains: Chandeliers
  - Recipes: Chandeliers
  - Items: Charcoal Crucible Furnace; Mustafa ibn Qadir, The Master Silver Craftsman; Yahya ibn Suleiman, Royal-Made Candlesticks; Farid ibn Yasin, The Gadget Seller

### Sky 2.2 — 15 Level 3 houses

- Lokum (pool)
  - Buildings: Lokum Baker; Pistachio Farm; Roastery: Pistachios
  - Fields: Pistachio Grove
  - Goods: Lokum; Roasted Pistachios; Pistachio Fruits
  - Chains: Lokum
  - Recipes: Roastery Recipes; Pistachios
  - Items: Pistachio Seeds; Quality Pistachio Seeds; Hybrid Pistachio Seeds; Decree on the Grafting and Pruning of Fruit Trees; Samir al-Fustuq, The Pistachio Expert; Şehrazat Hanım, the Lady of Sugar; Mercury Thermometer; Baha al-Din al-Fustuq, The Roasting Alchemist; Iron Roasting Drum
  - Rose Water (pool, contents under Sky 1.1)

## Scholars

Every Scholar stage also needs 3250 Envoys, so it can come before 2.7, 2.8 and the skyscraper stages.

### 3.0 — 1 Scholar

- Scholar residence
- Research Outpost: also unlocked at 2.8, whichever comes first
- Scholars: leather shoes; Scholars: hummus
- Arak (pool)
  - Buildings: Copper Smelter; Oriental Smith: Alembics; Oriental Smith; Arak Distillery
  - Goods: Copper Bar; Alembics; Arak
  - Chains: Arak
  - Recipes: Alembics
- Research Outpost (need); Obelisk

### 3.1 — 300 Scholars

- Scholars: turban; Scholars: kaftans
- Turbans (pool)
  - Buildings: Turban Weaver; Silk Plantation
  - Fields: Silk Field
  - Goods: Turbans; Silk Fabric
  - Chains: Turbans
  - Items: Amina bint Rashid, Guru of Latest Fashion; Iskender Pasha Oglu, Dressmaker to the Grand Vizier; Silk Seeds; Quality Silk Seeds; Hybrid Silk Seeds; Leyla al-Harir, the Mistress of the Cocoon; Steam boilers for silk reeling
- Sultan's Palace; Sultan's Palace Wing; Sultan's Palace Wing - Bridge; Sultan's Palace Wing - Gate; Sultan's Palace Wing - Cross; Sultan's Palace Wing - Corner; Sultan's Palace menu

### 3.2 — 1000 Scholars

- Oriental Fountain
- Scholars: pomegranate juice; Scholars: spiced tea (menu copies, the goods are already unlocked)

### 3.3 — 2000 Scholars

- Scholars: seafood stew; Scholars: rugs; Oriental Place 4

### 3.4 — 4000 Scholars

- Scholars: hookahs (menu copy)
- Astrolabes (pool)
  - Buildings: Oriental Workshop: Astrolabes; Copper Smelter; Oriental Smith: Alembics; Oriental Workshop
  - Goods: Astrolabes; Copper Bar
  - Chains: Astrolabes
  - Recipes: Astrolabes

### 3.5 — 7000 Scholars

- Coffee House (pool)
  - Buildings: Coffee House; Coffee House: Black Coffee; Coffee House: Milk Coffee; Coffee House: Cardamom Coffee; Coffee House: Date Coffee; Coffee House: Rose Coffee; Coffee House: Honey Coffee; Roastery: Coffee
  - Goods: Coffee House; Roasted Coffee Beans
  - Chains: Coffee House; Roasted coffee
  - Recipes: Black Coffee; Milk Coffee; Cardamom Coffee; Date Coffee; Rose Coffee; Honey Coffee; Roastery Recipes; Coffee
  - Items: Husayn ibn Tariq al-Qahwaji, Renowned Coffee Master; Vizier Decree on Urban Jurisdiction
  - Rose Water (pool, contents under Sky 1.1)
- Chandeliers (pool): also unlocked at Sky 2.1, whichever comes first (contents there)
- Scholars: chandeliers (menu copy)

## Vanilla order

Buildings that are not production chains, needs or public services, compared with vanilla's New World triggers
(intermediate colony01 1.0–2.4 and their DLC side triggers):

| Orient | Stage | New World counterpart |
|---|---|---|
| Warehouse I, Desert Road | 1.0 | Small Warehouse, Dirt Road (1.0) |
| Trade Union | 1.1 | Trade Union (1.1) |
| Quay, Depot, Harbour Office | 1.2 | Quay, Depot, Harbourmaster's Office (1.2) |
| Fire Department, Repair Crane, Puckle Gun, FlaK tower | 1.3 | Fire Station, Repair Crane, Mounted Guns, Flak (1.3) |
| Police Station, Ornaments tab, Palm Trees | 1.4 | Police Station, Quaint Park, Palm Trees (1.4) |
| Paved Street, Warehouse II, Kontor II, Town Hall, Bedouin Camp, Fertilizer module | 2.0 | Paved Street, Medium Warehouse, Medium Trading Post, Town Hall, Hacienda, Fertiliser Silo (2.0) |
| Pier, Cannon Tower, Fire Tower | 2.1 | Pier, Cannon Tower, Flame Tower (2.1) |
| Hospital, Airship platform | 2.2 | Hospital, Airship Platform (2.2) |
| Warehouse III, Kontor III, Armor Pierce tower | 2.4 | Large Warehouse, Large Trading Post, Anti-Armour Gun (2.4) |

Not aligned (no one-to-one counterpart, or a choice still open):
- Ornaments after the tab: New World unlocks them in three batches (1.4, 2.1, 2.3). The Orient spreads them from
  1.4 to 3.3, one to four per stage: countryside pieces and the small wall first, vegetation and the large wall at
  1 Envoy, the fence after the walls, the places from 2.1 on (the last one at 3.3), and the obelisk and the large
  fountain at Scholars.
- Oil (harbours, storage, railway, tractor, fuel station) unlocks at 2.1; the New World has it at 2.2. It is a
  production chain here, so it was left alone.
- Desert Treasures museum set at 2.8; the New World museum is at 2.4.
- Harbour Tower has no New World counterpart.

Monuments and haciendas (set 2026-10-29) follow vanilla's pattern across all regions rather than the New World alone:
- Vanilla puts the Hacienda at the entry of the middle tier (1 Obrero), the Palace at the entry of the top tier
  (1 Investor), and builds a region's big monument one stage per population step, each stage shown one step
  earlier (World's Fair 1/750/1750/3000/5000 Investors, Arctic monument 1/100/300/750 Technicians).
- Bedouin Camp 2.0, Research Outpost 3.0 (or 2.8).
- Oriental Lighthouse: Foundations 2.2 (own trigger 1404007020), Tower 2.3, Lantern Room and the finished
  lighthouse with its beacons 2.4. Then the Grand Mosque: Foundations 2.5, Prayer Hall 2.6, Towers 2.7, finished 2.8.
  So every Envoy stage from 2.2 to 2.8 opens one monument stage.
- Sultan's Palace 3.1 (shown at 3.0). Its planned residents need Incense, Turbans (3.1) and the Coffee House (3.5).
- The Lantern Room and the mosque Towers take Hookahs (2.4) instead of Chandeliers, which only come with
  Sky 2.1 or 3.5.

## Notes

- Rose Water sits inside the Lokum and Coffee House pools. Coffee House (3.5) can come before Sky 1.1, and then
  Rose Water unlocks with it.
- Research Outpost (2.8 or 3.0) and Chandeliers (Sky 2.1 or 3.5) have two real routes: Scholar stages only need
  3250 Envoys, so they can come first.
- Incense only unlocks through 4000 Artistas (New World Rising). The planned palace residence would need it.
- The New Horizons lab (Noble Mushrooms) has no Orient condition, only the Magnates count.
- The Park group lists Orient copies of Palm Trees and the vanilla palms, bush and grass (1404004870–874). The New
  World unlocks the originals at 300 Jornaleros (pools 134882 and 130195), before the Orient opens. Palm Trees is
  Tourist Season content, so its copy has its own triggers that also check that DLC (1404004876 unlock,
  1404004877 creative), like vanilla's. It is not previewed at 1.4 (first Envoy stage).
- The Development folder 1404004865 (debug, finished Lighthouse and Grand Mosque) is the first entry of the Nomads
  tab 1404000014 with IgnoreUnlockStateForCategoryVisibility. It unlocks only in creative mode (1404000791).
