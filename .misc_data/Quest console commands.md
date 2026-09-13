# Quest console commands — Return to the Orient

The command that starts a quest directly (from `textsourcelist.json`, class `CQuestManager`):

```
ts.Quests.StartQuestForCurrentPlayerNet(questGUID)
```

> *"Does the same as StartQuest(int questGUID) or StartQuestLine(int questLineGUID) depending on
> the given GUID but without return value and for the currently active session"*

`Quests` is a static root alias exactly like `Conditions` and `Participants`, so the long form
`TextSources.TextSourceRoots.Quests.StartQuestForCurrentPlayerNet(GUID)` works too.

Be in the Orient session with the right resident population present — the quest still needs its
giver (Envoy / Nomad / Elder) and any target buildings to exist, or it will start and immediately
fail to find its objects.

---

## Envoy quests (giver 1404000019 — Envoy resident)

### Tradition Keeper
```
ts.Quests.StartQuestForCurrentPlayerNet(1404001275)   # 1 Invitation (decision)
ts.Quests.StartQuestForCurrentPlayerNet(1404001290)   # 2 Bull Leaping Ceremony (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001296)   # 5 Aida (select)
```

### Kids Nowadays
```
ts.Quests.StartQuestForCurrentPlayerNet(1404001304)   # 1 Take Christmas Away (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001313)   # 2 Make Them Work (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001321)   # 3 Public Confession (photo)
```

### I Am The Senate
```
ts.Quests.StartQuestForCurrentPlayerNet(1404001330)   # 1 The Speech (decision)
ts.Quests.StartQuestForCurrentPlayerNet(1404001351)   # 2 Stuff The Ballots (select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001358)   # 3 Ruining A Reputation (select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001376)   # 5 Dura Lex Sed Lex (status quo)
```

### Higher By Nature
```
ts.Quests.StartQuestForCurrentPlayerNet(1404001381)   # 1 Gold (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001387)   # 2 Beggars (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001397)   # 3 Helping Indigents (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001405)   # 4a Timqet Festival (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001412)   # 5 Fruit Basket (select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001426)   # 6 Fasting (sustain)
```

### Standalone envoy quests
```
ts.Quests.StartQuestForCurrentPlayerNet(1404001436)   # Storyteller (decision)
ts.Quests.StartQuestForCurrentPlayerNet(1404001455)   # Learning From Those (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001459)   # Clean Up Your Mess (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001465)   # Set The Right Example (solve incident)
ts.Quests.StartQuestForCurrentPlayerNet(1404001470)   # Cup Of Tea (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001474)   # Day Care (build)
ts.Quests.StartQuestForCurrentPlayerNet(1404001480)   # Visiting Relatives (transport)
ts.Quests.StartQuestForCurrentPlayerNet(1404001504)   # Reality Check (select)
```

## Nomad quests (giver 1404000018 — Nomad resident)

```
ts.Quests.StartQuestForCurrentPlayerNet(1404001532)   # The Lost Sheep 1 - Grazing (select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001541)   # Righting The Wrongs 1 - Help Family (use item / select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001556)   # Role Of A Man 1 - Being Included (select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001563)   # Role Of A Man 4 - Slay The Beast (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001572)   # Role Of A Man 5 - Gone Girl (select)
ts.Quests.StartQuestForCurrentPlayerNet(1404001580)   # Role Of A Man 9 - Banquet (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001588)   # Missing Sibling (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001594)   # Caring For Elderly (deliver)
ts.Quests.StartQuestForCurrentPlayerNet(1404001598)   # Helping In The Field (gift)
ts.Quests.StartQuestForCurrentPlayerNet(1404001608)   # Man's Best Friend (photo)
ts.Quests.StartQuestForCurrentPlayerNet(1404001615)   # Goat Run (picture puzzle)
ts.Quests.StartQuestForCurrentPlayerNet(1404001621)   # Exotic Nature (photo)
ts.Quests.StartQuestForCurrentPlayerNet(1404001629)   # Song Of Durin (transport / pickup object)
```

---

## Helpers

Quest pool GUIDs:

| GUID | Pool |
|------|------|
| 1404001272 | RQ_AllQuest_ParentPoolOrient |
| 1404001273 | OrientQuests_Nomad_Pool |
| 1404001274 | OrientQuests_Envoy_Pool |

```
ts.Quests.CheatEndPoolCooldownNet(1404001274)              # skip envoy pool cooldown
ts.Quests.CheatEndPoolCooldownNet(1404001273)              # skip nomad pool cooldown
ts.Quests.CheatEndQuestTimerNet(questGUID)                 # cut a quest's delay/latency timer to 0
ts.Quests.CheatEndQuestBlockingNet(poolGUID, questGUID)    # stop a pool blocking on a quest
ts.Quests.ReachSelectedQuest()                             # instantly complete the tracked quest
ts.Quests.RunningQuestByGUID(questGUID)                    # inspect a running instance
ts.Quests.DebugQuestGUID(questGUID)                        # point the debug page at a quest
ts.Quests.ResetTutorialQuestsNet()
```

Sub-quests inside *Ruining A Reputation* (`TriggerQuest` assets, fired from the parent — not meant
to be started standalone): 1404001359, 1404001360, 1404001361.
