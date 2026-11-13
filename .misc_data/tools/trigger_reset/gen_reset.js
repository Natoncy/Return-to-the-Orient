// Generates Natoncy_orient_trigger_reset/data/config/export/main/asset/assets.xml (CRLF).
// Usage (from the repo root): node .misc_data/tools/trigger_reset/gen_reset.js
// When a new progression trigger is added, put it into `tiers` in tier order and regenerate.
// Regenerate for every release too: the reset runs once per save for each main mod version.
const fs = require('fs');
const path = require('path');
const STEP = 1000; // ms between two re-registrations
const tiers = [
  ['1404000792', '1.0'],
  ['1404000814', '1.1'], ['1404000815', '1.2'], ['1404000816', '1.3'], ['1404000817', '1.4'],
  ['1404000818', '2.0'], ['1404004876', '2.0 Palm Trees'],
  ['1404000819', '2.1'], ['1404001260', '2.1 Biscuits'],
  ['1404001016', '2.2'],
  ['1404007020', '2.2 Lighthouse'],
  ['1404000820', '2.3'], ['1404001270', '2.3 Ice Cream'],
  ['1404000821', '2.4'],
  ['1404004022', '2.4 Incense'],
  ['1404000822', '2.5'], ['1404001263', '2.5 Typewriters'], ['1404004024', '2.5 Typewriters Engineers'], ['1404001264', '2.5 Fans'],
  ['1404004023', '2.5 Incense'],
  ['1404000823', '2.6'],
  ['1404000824', '2.7'], ['1404001267', '2.7 Steam Carriages'], ['1404001268', '2.7 Scooters'],
  ['1404000825', '2.8'],
  ['1404004027', 'Skyscraper 1.1'], ['1404004028', 'Skyscraper 1.2'], ['1404004029', 'Skyscraper 2.1'], ['1404004030', 'Skyscraper 2.2'],
  ['1404001156', '3.0'], ['1404001157', '3.1'], ['1404001158', '3.2'], ['1404001159', '3.3'], ['1404001160', '3.4'], ['1404001161', '3.5'],
  ['1404005072', 'New Horizons Lab Unhide'], ['1404005073', 'New Horizons Lab Unlock'],
  ['1404004031', '2.7 Oudh Perfume (New Horizons)'], ['1404004032', '2.8 Oudh Perfume (New Horizons)'],
];
// Creative games: these unlock everything there. They stay pending in normal games anyway.
const creative = [
  ['1404000791', 'InitCreativeMode-Orient'],
  ['1404005061', 'Orient New Horizons Creative Mode'],
  ['1404007026', 'Orient lighthouse creative unlock'],
  ['1404004877', 'InitCreativeMode-Orient Palm Trees'],
];

const pad = (n) => ' '.repeat(n);
const block = (base, lines) => lines.map((l) => pad(base) + l).join('\n');

function step(guid, comment, delay, base) {
  return block(base, [
    `<!-- ${comment} -->`,
    `<Item>`,
    `    <TriggerAction>`,
    `        <Template>ActionDelayedActions</Template>`,
    `        <Values>`,
    `            <Action />`,
    `            <ActionDelayedActions>`,
    `                <ExecutionDelay>${delay}</ExecutionDelay>`,
    `                <DelayedActions>`,
    `                    <IsBaseAutoCreateAsset>1</IsBaseAutoCreateAsset>`,
    `                    <Values>`,
    `                        <ActionList>`,
    `                            <Actions>`,
    `                                <Item>`,
    `                                    <Action>`,
    `                                        <Template>ActionRegisterTrigger</Template>`,
    `                                        <Values>`,
    `                                            <Action />`,
    `                                            <ActionRegisterTrigger>`,
    `                                                <TriggerAsset>${guid}</TriggerAsset>`,
    `                                            </ActionRegisterTrigger>`,
    `                                        </Values>`,
    `                                    </Action>`,
    `                                </Item>`,
    `                            </Actions>`,
    `                        </ActionList>`,
    `                    </Values>`,
    `                </DelayedActions>`,
    `            </ActionDelayedActions>`,
    `        </Values>`,
    `    </TriggerAction>`,
    `</Item>`,
  ]);
}

function register(guid, comment, base) {
  return block(base, [
    `<!-- ${comment} -->`,
    `<Item>`,
    `    <TriggerAction>`,
    `        <Template>ActionRegisterTrigger</Template>`,
    `        <Values>`,
    `            <Action />`,
    `            <ActionRegisterTrigger>`,
    `                <TriggerAsset>${guid}</TriggerAsset>`,
    `            </ActionRegisterTrigger>`,
    `        </Values>`,
    `    </TriggerAction>`,
    `</Item>`,
  ]);
}

// Always true: IsBaseAutoCreateAsset means the template default, which is ConditionAlwaysTrue for triggers.
// `actions` is already indented for its place inside <TriggerActions>
function trigger(guid, name, autoRegister, actions) {
  return [
    block(8, [
      `<Asset>`,
      `    <Template>Trigger</Template>`,
      `    <Values>`,
      `        <Standard>`,
      `            <GUID>${guid}</GUID>`,
      `            <Name>${name}</Name>`,
      `        </Standard>`,
      `        <Trigger>`,
      `            <TriggerCondition>`,
      `                <IsBaseAutoCreateAsset>1</IsBaseAutoCreateAsset>`,
      `                <Values>`,
      `                    <Condition />`,
      `                    <ConditionAlwaysTrue />`,
      `                </Values>`,
      `            </TriggerCondition>`,
      `            <TriggerActions>`,
    ]),
    actions,
    block(8, [
      `            </TriggerActions>`,
      `        </Trigger>`,
      `        <TriggerSetup>`,
      ...(autoRegister ? [] : [`            <AutoRegisterTrigger>0</AutoRegisterTrigger>`]),
      `            <UsedBySecondParties>0</UsedBySecondParties>`,
      `        </TriggerSetup>`,
      `    </Values>`,
      `</Asset>`,
    ]),
  ].join('\n');
}

// One run trigger per main mod version: a trigger that is new to a save registers itself on load and
// fires once, so the reset runs exactly once per save after each update. x.y.z -> 1404006000 + 100x + 10y + z.
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../modinfo.json'), 'utf8')).Version;
const [major, minor, patch] = version.split('.').map(Number);
if (minor > 9 || patch > 9 || major > 9) throw new Error(`version ${version} does not fit the run GUID scheme`);
const BODY_GUID = 1404006000;
const RUN_GUID = BODY_GUID + major * 100 + minor * 10 + patch;
if (RUN_GUID === BODY_GUID) throw new Error(`version ${version} would reuse the body GUID`);

const bodySteps = [
  ...tiers.map(([g, l], i) => step(g, `Intermediate Orient ${l}`, (i + 1) * STEP, 24)),
  ...creative.map(([g, l], i) => step(g, l, (tiers.length + i + 1) * STEP, 24)),
].join('\n');

const runActions = register(BODY_GUID, 'Re-run all progression triggers', 24);

const out = [
  `<ModOps>`,
  ``,
  `    <!-- Re-runs the Orient unlock triggers once per save after every update of the main mod.`,
  `         A fired trigger is gone from the savegame, and it expanded its pools when it fired.`,
  `         Buildings that a later update adds to such a pool therefore stay locked in older saves.`,
  `         ActionRegisterTrigger registers a fired trigger again (or re-creates a pending one), so it fires`,
  `         again with the current pool contents as soon as its population condition is met.`,
  ``,
  `         The triggers run one after another in tier order, ${STEP} ms apart, like normal progression.`,
  `         Add new progression triggers here too. -->`,
  `    <ModOp Type="addNextSibling" GUID="10138">`,
  ``,
  `        <!-- Fires once per save for main mod version ${version} -->`,
  trigger(RUN_GUID, `Orient trigger reset run ${version}`, true, runActions),
  ``,
  `        <!-- Only runs when registered by a run trigger -->`,
  trigger(BODY_GUID, 'Orient trigger reset', false, bodySteps),
  ``,
  `    </ModOp>`,
  ``,
  `</ModOps>`,
  ``,
].join('\n');

const target = process.argv[2] || path.join(__dirname, '../../../Natoncy_orient_trigger_reset/data/config/export/main/asset/assets.xml');
fs.writeFileSync(target, out.replace(/\r?\n/g, '\r\n'));
console.log('written', target, 'run trigger', RUN_GUID);
