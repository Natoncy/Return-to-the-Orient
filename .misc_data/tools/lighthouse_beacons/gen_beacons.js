// Oriental Lighthouse beacons: the mod's own beacon items, socketed in the completed lighthouse, buff all
// of the player's ships of one type in every session.
//
// The engine can't pass an arbitrary socketed item on to other ships (building sockets reach a radius at
// most, and the mod loader can't make per-item assets for other mods' items), so the lighthouse only
// takes these beacons. 6 ship types (lens colour) x 4 rarities (housing metal) = 24 beacons; each has
// the mod allocation Mod14 (only the lighthouse socket accepts it) and
//   - an ItemSet of its own (1404007100+i) that the lighthouse lists in Culture/Sets,
//   - a global VehicleBuff on its ship type (1404007300+i) carrying the same upgrades the item shows,
//   - an "on" trigger (ItemSetsActive >= 1 -> ActionBuff add, 1404007500+i) and an "off" trigger
//     (ItemSetsActive < 1 -> ActionBuff remove, 1404007700+i) that register each other.
// Beacons are sold by Madame Kahina in the Orient only (her Orient assortment 1404000978), rarely, and the
// rarer ones even less often (rarity weights 50/30/15/5). Items are locked by default and traders skip
// locked items, so the asset pool 1404007046 holds all beacons; the Envoys 2.4 trigger 1404000821 (with the
// completed lighthouse) and creative trigger 1404000791 unlock it by hand.
//
// Balancing: a beacon works on a whole fleet, so a legendary beacon is about as strong as a vanilla
// uncommon-to-rare item on one ship; uncommon/rare/epic beacons get roughly 40/60/80% of that.
// Uncommon beacons carry 1 upgrade, rare and epic 2, legendary 3.
//
// usage: node gen_beacons.js   (texts: node beacon_texts.js, icons: node cut_icons.js)
const fs = require('fs');
const path = require('path');
const TEXTS = require('./beacon_texts.js');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.join(ROOT, 'data/config/export/main/asset/assets_includes/buildings/monument/assets_lighthouse_beacons.xml');

const LIGHTHOUSE = 1404007002;
const SET_BUFF = 1404007004;
const ALLOCATION = 'Mod14';
const ALLOCATION_TEXT = 1404007041;
// all beacons; rarity pools 1404007042+r. Linked by hand in Madame Kahina's Orient assortment 1404000978
// (reward_pools/trade/assets_third_party_08_orient.xml, weight 60 of 1260: 1 in 21 offered items), which
// loads after this file.
const POOL = 1404007040;
const UNLOCK_POOL = 1404007046;
const BASE = { item: 1404007200, set: 1404007100, buff: 1404007300, on: 1404007500, off: 1404007700 };
const ICONS = 'data/graphics/icons/items/lighthouse_beacons';

// Vanilla pools miss some ships (diving vessels, paddle steamer, Siege Cruiser, Fisher, creative-mode
// ships); those are listed directly, like vanilla's diving bell items list 112084.
const DIVING = [112084, 15831];                     // Salvager, Free Diving Vessel
const STEAM_EXTRA = [7995, 7076, 15835, 15836];     // paddle steamer, Siege Cruiser, creative Great White/Great Eastern
const FISHER = 105520;                              // Aarhant scenario warship (sail)

const TYPES = [
  { key: 'all', targets: [191454, 191458, 1404, ...DIVING, ...STEAM_EXTRA, FISHER] }, // all ships, all warships, all steel hull ships
  { key: 'sail', targets: [191455, FISHER] },                                          // all sailships
  { key: 'steam', targets: [191456, 1404, ...DIVING, ...STEAM_EXTRA] },               // all steamships, all steel hull ships
  { key: 'military', targets: [191458, 7076, FISHER] },                                // all warships
  { key: 'air', targets: [4146, 102492] },                                             // all AirShips, all airships (scenario)
  { key: 'salvager', targets: DIVING },
];
// housing metal on the icon: uncommon pewter (the sheet's "clear"), rare copper, epic blackened iron, legendary brass
const RARITIES = [
  { key: 'uncommon', rarity: 'Uncommon', price: 25000, weight: 50 },
  { key: 'rare', rarity: 'Rare', price: 75000, weight: 30 },
  { key: 'epic', rarity: 'Epic', price: 200000, weight: 15 },
  { key: 'legendary', rarity: 'Legendary', price: 450000, weight: 5 },
];

// upgrade building blocks
const pct = v => ({ Value: v, Percental: 1 });
const speed = v => ({ VehicleUpgrade: { ForwardSpeedUpgrade: pct(v) } });
const cargoSlowdown = v => ({ VehicleUpgrade: { IgnoreWeightFactorUpgrade: pct(v) } });
const damageSlowdown = v => ({ VehicleUpgrade: { IgnoreDamageFactorUpgrade: pct(v) } });
const maintenance = v => ({ VehicleUpgrade: { MaintainanceUpgrade: pct(v) } });
const loading = v => ({ TradeShipUpgrade: { LoadingSpeedUpgrade: pct(v) } });
const tradePrice = v => ({ TradeShipUpgrade: { ActiveTradePriceInPercent: v } });
const hitpoints = v => ({ AttackableUpgrade: { MaxHitpointsUpgrade: pct(v) } });
const selfHeal = v => ({ AttackableUpgrade: { SelfHealUpgrade: pct(v) } });
const damageTaken = (kind, f) => ({ AttackableUpgrade: { DamageReceiveFactor: { [kind]: { Factor: f } } } });
const damage = v => ({ AttackerUpgrade: { BaseDamageUpgrade: pct(v) } });
const damageVs = (kind, f) => ({ AttackerUpgrade: { DamageFactor: { [kind]: { Factor: f } } } });
const reload = v => ({ AttackerUpgrade: { ReloadTimeUpgrade: pct(v) } });
const range = v => ({ AttackerUpgrade: { AttackRangeUpgrade: pct(v) } });
const sight = v => ({ AttackerUpgrade: { LineOfSightRangeUpgrade: pct(v) } });
const accuracy = v => ({ AttackerUpgrade: { AccuracyUpgrade: pct(v) } });
const findChance = (rarity, w) => ({ DivingBellUpgrade: { RarityWeightUpgrade: { [rarity]: { AdditionalWeight: w } } } });
const scrapLevel = v => ({ DivingBellUpgrade: { ScrapAmountLevelUpgrade: { Value: v } } });

// [type][rarity] -> upgrades (vanilla yardsticks in the notes at the top)
const UPGRADES = {
  all: [
    [hitpoints(5)],
    [maintenance(-10), selfHeal(50)],
    [damageSlowdown(30), hitpoints(10)],
    [speed(8), maintenance(-20), hitpoints(15)],
  ],
  sail: [
    [cargoSlowdown(10)],
    [speed(5), loading(20)],
    [accuracy(10), damageTaken('Cannon', 0.93)],
    [speed(8), cargoSlowdown(30), sight(10)],
  ],
  steam: [
    [loading(10)],
    [cargoSlowdown(15), maintenance(-10)],
    [speed(6), damageSlowdown(30)],
    [loading(35), hitpoints(15), tradePrice(95)],
  ],
  military: [
    [damage(3)],
    [damageVs('SteamShip', 1.07), damageVs('SailShip', 1.07)],
    [reload(-7), range(6)],
    [damage(10), accuracy(15), damageTaken('Normal', 0.9)],
  ],
  air: [
    [speed(3)],
    [loading(20), cargoSlowdown(15)],
    [maintenance(-15), hitpoints(10)],
    [speed(8), loading(35), damageSlowdown(40)],
  ],
  salvager: [
    [findChance('Rare', 3)],
    [findChance('Epic', 2), speed(5)],
    [findChance('Legendary', 1), cargoSlowdown(20)],
    [scrapLevel(1), findChance('Legendary', 2), speed(8)],
  ],
};

const isObj = v => v && typeof v === 'object';
function merge(into, from) {
  for (const [k, v] of Object.entries(from)) {
    if (isObj(v) && isObj(into[k])) merge(into[k], v);
    else if (k in into) throw new Error('duplicate upgrade ' + k);
    else into[k] = isObj(v) ? merge({}, v) : v;
  }
  return into;
}
const PROP_ORDER = ['VehicleUpgrade', 'AttackerUpgrade', 'AttackableUpgrade', 'TradeShipUpgrade', 'DivingBellUpgrade'];
function upgradeLines(list) {
  const all = list.reduce((acc, u) => merge(acc, u), {});
  const out = [];
  const emit = (k, v, d) => {
    const pad = '    '.repeat(d);
    if (!isObj(v)) { out.push(`${pad}<${k}>${v}</${k}>`); return; }
    out.push(`${pad}<${k}>`);
    for (const [ck, cv] of Object.entries(v)) emit(ck, cv, d + 1);
    out.push(`${pad}</${k}>`);
  };
  for (const p of PROP_ORDER) if (all[p]) emit(p, all[p], 0);
  return out;
}

const beacons = [];
TYPES.forEach((type, t) => RARITIES.forEach((rar, r) => {
  const i = t * RARITIES.length + r;
  const ups = UPGRADES[type.key][r];
  if (ups.length !== [1, 2, 2, 3][r]) throw new Error(`${type.key} ${rar.key}: ${ups.length} upgrades`);
  beacons.push({
    i, type, rar, ups, guid: BASE.item + i,
    name: TEXTS.T.english.names[i],
    icon: `${ICONS}/lighthouse_beacon_${type.key}_${rar.key}.png`,
  });
}));
const keys = beacons.map(b => JSON.stringify(b.ups.map(u => Object.keys(u)[0] + JSON.stringify(u)).sort()));
if (new Set(keys).size !== keys.length) throw new Error('two beacons share the same upgrades');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const L = [];
const ind = (n, lines) => lines.forEach(l => L.push('    '.repeat(n) + l));

function trigger(guid, name, setGuid, buffGuid, on, other) {
  ind(2, [
    '<Asset>',
    '    <Template>Trigger</Template>',
    '    <Values>',
    '        <Standard>',
    `            <GUID>${guid}</GUID>`,
    `            <Name>${esc(name)}</Name>`,
    '        </Standard>',
    '        <Trigger>',
    '            <TriggerCondition>',
    '                <Template>ConditionPlayerCounter</Template>',
    '                <Values>',
    '                    <Condition />',
    '                    <ConditionPlayerCounter>',
    '                        <PlayerCounter>ItemSetsActive</PlayerCounter>',
    `                        <Context>${setGuid}</Context>`,
    '                        <CounterAmount>1</CounterAmount>',
    ...(on ? [] : ['                        <ComparisonOp>LessThan</ComparisonOp>']),
    '                    </ConditionPlayerCounter>',
    '                </Values>',
    '            </TriggerCondition>',
    '            <TriggerActions>',
    '                <Item>',
    '                    <TriggerAction>',
    '                        <Template>ActionBuff</Template>',
    '                        <Values>',
    '                            <Action />',
    '                            <ActionBuff>',
    `                                <BuffAsset>${buffGuid}</BuffAsset>`,
    `                                <AddBuff>${on ? 1 : 0}</AddBuff>`,
    '                            </ActionBuff>',
    '                        </Values>',
    '                    </TriggerAction>',
    '                </Item>',
    '                <Item>',
    '                    <TriggerAction>',
    '                        <Template>ActionRegisterTrigger</Template>',
    '                        <Values>',
    '                            <Action />',
    '                            <ActionRegisterTrigger>',
    `                                <TriggerAsset>${other}</TriggerAsset>`,
    '                            </ActionRegisterTrigger>',
    '                        </Values>',
    '                    </TriggerAction>',
    '                </Item>',
    '            </TriggerActions>',
    '        </Trigger>',
    '        <TriggerSetup>',
    `            <AutoRegisterTrigger>${on ? 1 : 0}</AutoRegisterTrigger>`,
    '            <UsedBySecondParties>0</UsedBySecondParties>',
    '        </TriggerSetup>',
    '    </Values>',
    '</Asset>',
  ]);
}

L.push('<ModOps>', '');
L.push('    <!-- Generated by .misc_data/tools/lighthouse_beacons/gen_beacons.js - edit the generator, not this file. -->');
L.push(`    <!-- ${beacons.length} beacon items ${BASE.item}+i: set ${BASE.set}+i, global buff ${BASE.buff}+i, on trigger ${BASE.on}+i, off trigger ${BASE.off}+i -->`);
L.push('');

// the beacon allocation: name and icon in the item UI, listed in the inventory filters
L.push(`    <ModOp Type="merge" GUID="6000017" Path="/Values/ItemConfig/AllocationText">`);
ind(2, ['<AllocationText>', `    <${ALLOCATION}>`, `        <Text>${ALLOCATION_TEXT}</Text>`, `    </${ALLOCATION}>`, '</AllocationText>']);
L.push('    </ModOp>');
L.push(`    <ModOp Type="add" GUID="6000017" Path="/Values/ItemConfig/AllocationIcons">`);
ind(2, ['<Item>', `    <Allocation>${ALLOCATION}</Allocation>`, '    <AllocationIcon>data/graphics/icons/ornaments/lighthouse.png</AllocationIcon>', '</Item>']);
L.push('    </ModOp>');
// the item tooltip's "Equipped in" line takes its icon from the allocation text asset, like vanilla Pavilion 114323
L.push('    <ModOp Type="addNextSibling" GUID="114323">');
ind(2, [
  '<Asset>',
  '    <Template>Text</Template>',
  '    <Values>',
  '        <Standard>',
  `            <GUID>${ALLOCATION_TEXT}</GUID>`,
  '            <Name>orient lighthouse beacon allocation</Name>',
  '            <IconFilename>data/graphics/icons/ornaments/lighthouse.png</IconFilename>',
  '        </Standard>',
  '        <Text>',
  '            <LocaText>',
  '                <English>',
  '                    <Text>Lighthouse</Text>',
  '                </English>',
  '            </LocaText>',
  '        </Text>',
  '    </Values>',
  '</Asset>',
]);
L.push('    </ModOp>');
L.push(`    <ModOp Type="add" GUID="501516,502015" Path="/Values/ItemFilter/ItemCategories/Item[CategoryAsset='18021' or CategoryAsset='18022']/ItemTypes">;${ALLOCATION}</ModOp>`);
L.push('');

// the beacon items
L.push('    <ModOp Type="addNextSibling" GUID="191013">');
beacons.forEach(b => {
  ind(2, [
    `<!-- ${b.type.key} / ${b.rar.key} -->`,
    '<Asset>',
    '    <Template>VehicleItem</Template>',
    '    <Values>',
    '        <Standard>',
    `            <GUID>${b.guid}</GUID>`,
    `            <Name>orient lighthouse beacon ${b.type.key} ${b.rar.key}</Name>`,
    `            <IconFilename>${b.icon}</IconFilename>`,
    `            <InfoDescription>${TEXTS.GUID.tooltip + b.i}</InfoDescription>`,
    '        </Standard>',
    '        <Text>',
    '            <LocaText>',
    '                <English>',
    `                    <Text>${esc(b.name)}</Text>`,
    '                </English>',
    '            </LocaText>',
    '        </Text>',
    '        <Item>',
    `            <Allocation>${ALLOCATION}</Allocation>`,
    '            <MaxStackSize>1</MaxStackSize>',
    `            <Rarity>${b.rar.rarity}</Rarity>`,
    `            <TradePrice>${b.rar.price}</TradePrice>`,
    `            <ItemSet>${BASE.set + b.i}</ItemSet>`,
    '        </Item>',
  ]);
  // the item shows the stats; in the lighthouse socket they reach no building, the buff below applies them
  ind(4, upgradeLines(b.ups));
  ind(2, [
    '        <ExpeditionAttribute>',
    '            <BaseMorale>0</BaseMorale>',
    `            <FluffText>${TEXTS.GUID.fluff + b.i}</FluffText>`,
    '        </ExpeditionAttribute>',
    '    </Values>',
    '</Asset>',
  ]);
});
L.push('    </ModOp>', '');

// shared set buff: the real effect comes from the global ActionBuff, the set only marks the beacon as socketed
L.push('    <ModOp Type="addNextSibling" GUID="191146">');
ind(2, [
  '<Asset>',
  '    <Template>VehicleBuff</Template>',
  '    <Values>',
  '        <Standard>',
  `            <GUID>${SET_BUFF}</GUID>`,
  '            <Name>orient lighthouse beacon set marker</Name>',
  '            <IconFilename>data/graphics/icons/ornaments/lighthouse.png</IconFilename>',
  '        </Standard>',
  '        <Text>',
  `            <TextOverride>${LIGHTHOUSE}</TextOverride>`,
  '        </Text>',
  '        <Buff />',
  '        <ItemEffect />',
  '    </Values>',
  '</Asset>',
]);
beacons.forEach(b => {
  ind(2, [
    '<Asset>',
    '    <Template>ItemSet</Template>',
    '    <Values>',
    '        <Standard>',
    `            <GUID>${BASE.set + b.i}</GUID>`,
    `            <Name>orient lighthouse beacon set ${b.type.key} ${b.rar.key}</Name>`,
    '            <IconFilename>data/graphics/icons/ornaments/lighthouse.png</IconFilename>',
    '        </Standard>',
    '        <ItemSocketSet>',
    `            <SetBuff>${SET_BUFF}</SetBuff>`,
    '            <BuffScope>Area</BuffScope>',
    '        </ItemSocketSet>',
    '        <Text>',
    `            <TextOverride>${LIGHTHOUSE}</TextOverride>`,
    '        </Text>',
    '        <Locked />',
    '    </Values>',
    '</Asset>',
  ]);
});
beacons.forEach(b => {
  ind(2, [
    '<Asset>',
    '    <Template>VehicleBuff</Template>',
    '    <Values>',
    '        <Standard>',
    `            <GUID>${BASE.buff + b.i}</GUID>`,
    `            <Name>orient lighthouse beacon buff ${b.type.key} ${b.rar.key}</Name>`,
    `            <IconFilename>${b.icon}</IconFilename>`,
    '        </Standard>',
    '        <Text>',
    `            <TextOverride>${b.guid}</TextOverride>`,
    '        </Text>',
  ]);
  ind(4, upgradeLines(b.ups));
  ind(2, [
    '        <Buff />',
    '        <ItemEffect>',
    '            <EffectTargets>',
    ...b.type.targets.flatMap(t => ['                <Item>', `                    <GUID>${t}</GUID>`, '                </Item>']),
    '            </EffectTargets>',
    '        </ItemEffect>',
    '    </Values>',
    '</Asset>',
  ]);
});
L.push('    </ModOp>', '');

L.push('    <ModOp Type="addNextSibling" GUID="130248">');
beacons.forEach(b => {
  trigger(BASE.on + b.i, `orient lighthouse beacon on ${b.type.key} ${b.rar.key}`, BASE.set + b.i, BASE.buff + b.i, true, BASE.off + b.i);
  trigger(BASE.off + b.i, `orient lighthouse beacon off ${b.type.key} ${b.rar.key}`, BASE.set + b.i, BASE.buff + b.i, false, BASE.on + b.i);
});
L.push('    </ModOp>', '');

// Madame Kahina (Orient only): one weighted beacon pool for her assortment, rarer beacons less often
const pool = (guid, name, entries) => ind(2, [
  '<Asset>',
  '    <Template>RewardItemPool</Template>',
  '    <Values>',
  '        <Standard>',
  `            <GUID>${guid}</GUID>`,
  `            <Name>${esc(name)}</Name>`,
  '        </Standard>',
  '        <RewardPool>',
  '            <ItemsPool>',
  ...entries.flatMap(([link, weight]) => ['                <Item>', `                    <ItemLink>${link}</ItemLink>`, ...(weight === undefined ? [] : [`                    <Weight>${weight}</Weight>`]), '                </Item>']),
  '            </ItemsPool>',
  '        </RewardPool>',
  '        <Locked />',
  '    </Values>',
  '</Asset>',
]);
L.push('    <ModOp Type="addNextSibling" GUID="190387">');
pool(POOL, 'Kahina Orient Lighthouse Beacons', RARITIES.map((rar, r) => [POOL + 2 + r, rar.weight]));
RARITIES.forEach((rar, r) => pool(POOL + 2 + r, `Kahina Orient Lighthouse Beacons ${rar.rarity}`, beacons.filter(b => b.rar === rar).map(b => [b.guid])));
L.push('    </ModOp>', '');

// unlock pool: items default to locked, and the trader never offers a locked item
L.push('    <ModOp Type="addNextSibling" GUID="114531">');
ind(2, [
  '<Asset>',
  '    <Template>AssetPool</Template>',
  '    <Values>',
  '        <Standard>',
  `            <GUID>${UNLOCK_POOL}</GUID>`,
  '            <Name>asset pool orient lighthouse beacons</Name>',
  '        </Standard>',
  '        <AssetPool>',
  '            <AssetList>',
  ...beacons.flatMap(b => ['                <Item>', `                    <Asset>${b.guid}</Asset>`, '                </Item>']),
  '            </AssetList>',
  '        </AssetPool>',
  '    </Values>',
  '</Asset>',
]);
L.push('    </ModOp>', '');

// the completed lighthouse knows all sets
L.push(`    <ModOp Type="add" GUID="${LIGHTHOUSE}" Path="/Values/Culture">`);
L.push('        <Sets>');
beacons.forEach(b => L.push('            <Item>', `                <Set>${BASE.set + b.i}</Set>`, '            </Item>'));
L.push('        </Sets>');
L.push('    </ModOp>', '');
L.push('</ModOps>');

fs.writeFileSync(OUT, L.join('\r\n') + '\r\n', 'utf8');
console.log(beacons.length, 'beacons ->', path.relative(ROOT, OUT));
