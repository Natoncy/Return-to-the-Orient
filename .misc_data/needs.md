# Needs

Unlock = condition of the trigger that unlocks the need's asset pool (triggers/assets_intermediate_orient_*.xml).
The need already shows (hidden/preview) one trigger stage earlier.

- Nomads
  - Basic
    - Marketplace (Public service) [unlock: Orient session reached]
    - Dates (Orient) [unlock: 50 Nomads]
    - Pomegranate Juice (Orient) [unlock: 200 Nomads]
    - Mosque (Public service) [unlock: 300 Nomads]
  - Luxury
    - Camels (Orient) [unlock: 100 Nomads]
    - Rugs (Orient or Enbesa) [unlock: 300 Nomads]
      - Silk Fabric (Taludas; Horai or Orient)
      - Indigo (Enbesa)
  - Bedouin Tents (replace a Nomad need)
    - Bedouin Camp radius instead of Marketplace
    - Hummus instead of Dates [unlock: hummus pool, 300 Envoys (2.1)]
    - Spiced Tea instead of Pomegranate Juice [unlock: spiced tea pool, 1000 Envoys (2.3)]
    - Roasted Chickpeas instead of Rugs [unlock: roasted chickpeas pool, 300 Envoys (2.1)]
  - Lifestyle (bonus) [unlock: the count at which the good's production unlocks, like vanilla; no trigger]
    Rewards on the vanilla Jornaleros scale, given as residents (SupplyWeight) / gold (MoneyValue)
    - Bread [150 Workers] 2 / 11
    - Beef [1 Artisan] 1 / 12
    - Chocolate [1750 Investors] 2 / 16
    - Clay [1 Worker] 1 / 11
    - Spice Powder (Orient) [600 Envoys] 1 / 14 — like the Jornaleros' Felt (600 Obreros)
    - Pigments [1800 Artistas] 2 / 14
    - Nandu Leather [1 Artista] 2 / 12

- Envoys (also have all Nomad Basic and Luxury needs)
  - Stages (triggers 2.0–2.8): 1 / 300 / 600 / 1000 / 1500 / 2250 / 3250 / 4500 / 6000 Envoys.
    A need shows at its stage and is full at the next one. Own stages alternate with market-stall stages.
    Production: [need] = when the need shows; [production] = when its pool unlocks, if different.
  - Basic (4 Nomad + 4 + 2 + 2 = 12)
    - Consulate (Public service) [need: 1 Envoy] — regular residence only (palace: Palace radius, v0.7.0)
    - Ceremonial Sabers (Orient) [need: 600 Envoys; production: 300 Envoys with silver + trading company] — regular residence only (palace: Incense)
      - Silver Bars (Orient or New World)
        - Silver Ore (Orient)
      - Ebony (Taludas)
    - Kaftans (Orient) [need: 1500 Envoys] — regular residence only (palace: Turbans)
      - Silk Fabric (Taludas; Horai or Orient)
      - Wool (Old World)
    - Marzipan (Taludas; Orient) [need: 3250 Envoys]
      - Almonds (Taludas; Orient)
      - Honey (Taludas; Orient Bee Garden module on the Date Farm, or Honey Import Dock)
      - Chocolate (New World)
        - Cocoa (New World)
        - Sugar (New World)
          - Sugar Cane (New World)
    - Skyscraper level 2 house (FloorLevel 1) [house: shown at 4500, unlocked at 6000 Envoys]
      - Rose Water (Orient) [production: 1 level 2 house built]
        - Roses (fridhmyr/Satanoy; Orient)
        - Glass (Old World)
          - Quartz Sand (Old World)
        - Alembics (Orient)
          - Copper Bar (Orient)
            - Coal (Old World or Arctic)
            - Copper (Old World)
      - Candied Dates (Orient) [production: 15 level 2 houses built; level 3 house unlocks too]
    - Skyscraper level 3 house (FloorLevel 2)
      - Chandeliers (Orient) [production: 1 level 3 house built]
        - Silver Bars (Orient or New World)
          - Silver Ore (Orient)
        - Wood Veneers (Old World)
          - Wood (Old World, New World or Arctic)
        - Ornate Candles (Enbesa)
          - Beeswax (Enbesa)
          - Cotton (New World)
        - Glass (Old World)
          - Quartz Sand (Old World)
      - Lokum (Orient) [production: 15 level 3 houses built]
  - Luxury (listed in the game in this order: Orient needs first, market stalls last)
    - Pearl Necklaces (Orient) [need: 1 Envoy]
      - Pearls (Orient)
      - Wool (Old World)
    - Spice Powder (Orient) [need: 600 Envoys; production: 1 Envoy]
      - Spices (New World or Enbesa)
      - Aniseed (Orient)
      - Salt (Enbesa or New World)
    - Hookas (Orient) [need: 1500 Envoys]
      - Silver Bars (Orient or New World)
        - Silver Ore (Orient)
      - Caoutchouc (New World)
      - Tobacco (New World)
    - Bath House (Public service) [need: 3250 Envoys] — regular residence only (palace: Coffee House)
    - Oudh Perfume (New Horizons only, always the last one to unlock) [need: 6000 Envoys]
    - Marketstall: Pocket Watches [need: 300 Envoys + 1000 Engineers]
    - Marketstall: Biscuits [need: 300 Envoys + 15 Investor skyscrapers level 2 (residence_tier05_level02) + DLC High Life]
    - Marketstall: Ice Cream [need: 1000 Envoys + 1800 Artistas + DLC New World Rising]
    - Marketstall: Gramophones [need: 1000 Envoys + 3000 Investors]
    - Marketstall: Typewriters [need: 2250 Envoys + (1 Investor skyscraper level 4 OR 1 Engineer skyscraper level 3) + DLC High Life]
    - Marketstall: Fans [need: 2250 Envoys + 4000 Artistas + DLC New World Rising]
    - Marketstall: Steam Carriages [need: 4500 Envoys + 5000 Investors]
    - Marketstall: Scooter [need: 4500 Envoys + 6000 Artistas + DLC New World Rising]

  - Palace Envoys (v0.7.0, not built yet): regular Envoy needs with Palace radius / Incense / Turbans / Coffee House
    in place of Consulate / Ceremonial Sabers / Kaftans / Bath House (those four already have RequiredBuildings
    = regular Envoy residence 1404000017 + levels 1404004300/4301)

  - Coffee House (Public service, Scholars) [unlock: 7000 Scholars + 3250 Envoys]
    - Roasted Coffee (Orient)
      - Coffee Beans (New World)
    - Recipe extras (optional, one per recipe): Goat Milk, Spice Powder, Dates, Rose Water, Honey
      (the Coffee House pool also unlocks the Rose Water pool)

  - Lifestyle (bonus) [unlock: the count at which the good's production unlocks, like vanilla; no trigger]
    Rewards on the vanilla Obreros scale, given as residents (SupplyWeight) / gold (MoneyValue); no ResearchValue, no mail
    - Soap [300 Workers] 1 / 5
    - Astrolabes (Orient) [4000 Scholars; the locked product hides it until 3.4] 5 / 35 — like the Obreros' Typewriter
    - Medicine [6000 Artistas] 6 / 58
    - Orchid [2700 Artistas] 2 / 14
    - Clay Pipe [300 Elders] 3 / 26
    - Film Reel [4000 Artistas] 4 / 30
    - Souvenirs [2000 Tourists] 2 / 12

- Scholars (Orient residence; every tier also needs 3250 Envoys). Vanilla need → Orient replacement, same amounts and thresholds as vanilla
  - Basic
    - University → Research Outpost (Public service) [unlock: 1 Scholar]
    - Canned Food → Hummus [unlock: 1 Scholar]
    - Tailored Suits → Kaftans [unlock: 300 Scholars]
    - Electricity → Spiced Tea [unlock: 1000 Scholars]
    - Seafood Stew (kept) [unlock: 2000 Scholars]
    - Telephones → Astrolabes [unlock: 4000 Scholars]
    - Radio Tower → Coffee House (Public service) [unlock: 7000 Scholars]
  - Luxury
    - Leather Boots (kept) [unlock: 1 Scholar]
    - Rum → Arak [unlock: 1 Scholar]
    - Bowler Hats → Turbans [unlock: 300 Scholars]
    - Hibiscus Tea → Pomegranate Juice [unlock: 1000 Scholars]
    - Tapestries → Rugs (same product 114404, kept) [unlock: 2000 Scholars]
    - Clay Pipes → Hookahs [unlock: 4000 Scholars]
    - Gramophones → Chandeliers [unlock: 7000 Scholars + 3000 Investors]
  - Pearl Necklaces were the Electricity replacement until 2026-10-28; since then they are an Envoy luxury need
  - Turbans unlock with the Scholars (3.0 preview, 3.1 unlock) since no Envoy needs them any more

# Needs in other Worlds (FloorLevel) (unlock)

Unlock = the good's own Orient unlock + the other population's count (NoWeightPopulationCount + 1).
The production has no extra trigger: it unlocks with the Orient pool. The need's AGU holds the Envoy count of that
Orient stage. Skyscraper and Scholar stages rely on the locked product to hide the need until then (untested in game).
Incense is the exception: it has no Orient unlock yet, so its export trigger (2.4 unhide, 2.5 unlock) stays.
The region itself unlocks at 3000 Investors + 1500 Obreros + 1000 Elders (assets_orient_feature_unlock.xml),
so the Elders and Obreros counts below are always reached.

- OW:
  - (1) (2.1: 300 Envoys + 1500 Artisans) Artisans: Hummus
  - (1) (3.4: 4000 Scholars + 3250 Envoys + 3000 Engineers) Engineers: Astrolabes
  - (2) (Sky 2.2: 15 level 3 Envoy houses (6000 Envoys) + 4500 Investors) Investors: Lokum
  - (2) (2.8: 6000 Envoys + 4000 Magnates) Magnates: Oudh-Perfume
- Enbesa:
  - (2) (2.3: 1000 Envoys + 1000 Elders) Elders: Spiced Tea
  - (1) (2.1: 300 Envoys + 400 Shepherds) Shepherds: Roasted chickpeas
- NW:
  - (2) (export trigger: 2250 Envoys + 4000 Artistas) Artista: Incense
  - (1) (Sky 1.2: 15 level 2 Envoy houses (6000 Envoys) + 1000 Obreros) Obrera: Candied Dates
- Arctic:
  - (2) (3.0: 1 Scholar + 3250 Envoys + 750 Technicians) Technicians: Arak
