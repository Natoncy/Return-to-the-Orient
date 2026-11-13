# Anno 1800 – InfoTips: Referenz

Zusammengestellt aus: `infotips.md` (modding-guide), funktionierenden Beispieldateien (Return to the Orient), den Vanilla-Infotip-Exporten, `textsourcelist.json` und `properties-toolone.xml`.

Angaben ohne Beleg aus Dokumentation oder funktionierendem Beispiel sind als ungetestet gekennzeichnet. `int` bezeichnet eine Zahl bzw. GUID.

---

## 1. Grundaufbau

```
InfoTipData            (Guid, ChildCount)
 +- InfoElement         (ElementType, VisibilityElement, Icon, Text, Value, ...)
     +- InfoElement      (verschachtelt, bei Containern)
```

- Die Reihenfolge der `InfoElement`s im XML = Reihenfolge der Anzeige (oben nach unten).
- Ein `VisibilityElement` enthält Bedingungen. Nur wenn sie zutreffen, wird das Element samt Kindern angezeigt. Sie lassen sich verschachteln.
- Standardwert für alle nicht gesetzten Integer ist 0.
- `ChildCount` = Anzahl der `InfoElement`s im Element bzw. der `VisibilityElement`s im `VisibilityElement`. Der Modloader korrigiert falsche Werte automatisch, **ergänzt aber fehlende nicht**. Bei ElementType 7 und 8 muss `ChildCount` stehen, sonst wird das Element nicht angezeigt.

### Felder eines InfoElements

| Feld | Bedeutung |
|---|---|
| `ElementType` | Art des Elements (siehe Abschnitt 2) |
| `ChildCount` | Anzahl Kind-Elemente (Pflicht bei 7 und 8) |
| `VisibilityElement` | Sichtbarkeitsbedingung (Abschnitt 3) |
| `Icon` | `IconGUID` (feste GUID) oder `IconText` (Ausdruck), dazu `Style` |
| `Text` | `TextGUID` oder `Text` (Ausdruck/Direkttext), dazu `Style` |
| `Value` | rechter Wert, gleiche Form wie `Text` |
| `WarningType` | `2` = Eintrag rot hervorgehoben (einziger Wert in Vanilla) |
| `BackgroundType` | in den Beispielen leer, Bedeutung unbekannt |
| `Source` | Quelle einer Liste (ElementType 7, 10), z. B. `[… COUNT]` |
| `Columns` | nur ElementType 10, laut Doku fehlerhaft (zeigt immer 2) |
| `Headline`, `Subline`, `CategoryIcon`, `ColorValue` | nur ElementType 16 |
| `TemplateGUID` | nur ElementType 19 |
| `Comment` | Kommentar im XML (ungetestet) |

---

## 2. ElementType (Art des Elements)

| Nr | Beschreibung | Felder in Beispielen |
|---|---|---|
| 1 | Überschrift: `Text` fett, helle Farbe, Zeilenumbruch; `Icon` mittig | Text, Value, WarningType, BackgroundType |
| 2 | wie 1, plus Leerraum darunter. Kann `SubText` nutzen (größeres Icon links, zwei Textzeilen) | in den Beispielen nicht vorhanden |
| 3 | einfacher Text: `Text` (+ `Value`) in heller Farbe, mit Umbruch, **keine** Icons | |
| 4 | **Attribut-Zeile**: `Icon`, `Text`, `Value` in heller Farbe, immer einzeilig. **Universellster Typ** | Icon, Text, Value, WarningType, BackgroundType |
| 5 | einfacher Text in dunkelgrau („Hintergrundtext“), kein `Icon`/`Value` | Text, BackgroundType |
| 6 | (optionaler) Text plus **Trennlinie** darunter | Text |
| 7 | Container für Unterelemente, hat `Source` (Liste). Zeigt selbst nichts. **ChildCount nötig** | ChildCount, VisibilityElement, Source |
| 8 | Container (Gruppe), `Source` nur auf Unterebenen. **ChildCount nötig** | ChildCount, VisibilityElement |
| 9 | InfoLayer-Hinweise: `Text` fett, einzeilig; für UI-Buttons (Baumenü, Gebäude). Keine Icons | |
| 10 | Container nur für ElementType 11; hat `Source` und `Columns` | |
| 11 | hängt mit Kosten zusammen (Material, Permits, Godlikes, Blueprints, Upgradbarkeit) | |
| 12 | Container | |
| 13 | Container | |
| 14 | einfacher Text in mittelgrau, für Aktionsbeschreibungen („Klicke, um …“). Passt Infotip-Größe **nicht** an die Textlänge an | |
| 15 | tut anscheinend nichts | |
| 16 | Hauptkategorie-Infotips (z. B. MonumentEventCategories). Braucht mindestens `Headline` | Icon, CategoryIcon, Headline, Subline, ColorValue |
| 17 | wie 5 (dunkelgrau), passt Größe nicht an | |
| 18 | Text in Kursiv (Fluff-Texte von Buffs/Items) | |
| 19 | Auflistung von Attributen, z. B. alle Effekte eines Buffs. Braucht `TemplateGUID` | |

Quelle: modding-guide (laut Autor ohne Gewähr). Die Spalte „Felder in Beispielen“ stammt aus dem Vanilla-Export.

---

## 3. Sichtbarkeit (VisibilityElement)

### Aufbau (aus den Beispielen abgeleitet)
Ein äußeres `VisibilityElement` mit `ElementType` **2** ist die Gruppe. Darin liegen beliebig viele innere `VisibilityElement`s mit `ElementType` **1**, das sind die einzelnen Bedingungen.

**Immer sichtbar:**
```xml
<VisibilityElement>
  <ElementType><ElementType>2</ElementType></ElementType>
  <OperatorType />
</VisibilityElement>
```

**Eine Bedingung (Ganzzahl-Vergleich), z. B. „[RefGuid] ist 1404000880“:**
```xml
<VisibilityElement>
  <ElementType><ElementType>2</ElementType></ElementType>
  <ChildCount>1</ChildCount>
  <VisibilityElement>
    <ElementType><ElementType>1</ElementType></ElementType>
    <CompareOperator />
    <ResultType><ResultType>1</ResultType></ResultType>
    <ExpectedValueInt>1404000880</ExpectedValueInt>
    <Condition>[RefGuid]</Condition>
  </VisibilityElement>
  <OperatorType />
</VisibilityElement>
```

**Bool-Bedingung:**
```xml
<VisibilityElement>
  <ElementType><ElementType>1</ElementType></ElementType>
  <CompareOperator />
  <ResultType />
  <ExpectedValueBool>False</ExpectedValueBool>
  <Condition>[ProductAssetData([RefGuid]) CanBeProducedInCurrentRegion]</Condition>
</VisibilityElement>
```

**ODER-Verknüpfung** (mehrere GUIDs, eine Gruppe, `OperatorType` 1 an der Gruppe) Beispiel Beacons: mehrere innere `VisibilityElement`s mit je `ExpectedValueInt` und `Condition` `[RefGuid]`, `ChildCount` = Anzahl, `OperatorType` = 1.

### Felder

| Feld | Werte |
|---|---|
| `CompareOperator` | 0/leer = gleich · 1 = ungleich · 2 = kleiner · 3 = kleiner oder gleich · 4 = größer oder gleich · 5 = größer |
| `ResultType` | 0/leer = Bool (ohne `ExpectedValueBool` gilt „True“) · 1 = Integer (ohne `ExpectedValueInt` gilt 0) · 2 = Float (Punkt als Trenner, `1.2`) |
| `ExpectedValueBool/Int/Float` | Vergleichswert passend zu `ResultType` |
| `OperatorType` | 0 = UND (alle Bedingungen derselben Ebene) · 1 = ODER |
| `Condition` | Textsource-Ausdruck (Abschnitt 5) |

`ExpectedValueInt` kann laut Doku nur **feste Zahlen**, keine Ausdrücke wie `[ItemAssetData([RefGuid]) InputAmountUpgradeProduct(#index0#)]`.

---

## 4. Text und Icon

- **`TextGUID`**: Text dieser GUID wird verwendet. Reicht anscheinend auch Variablen weiter (z. B. `{ItemGuid}`).
- **`Text`** (direkt): Ausdruck oder Klartext, z. B. `<Text>[AssetData(12345) Text]</Text>`. Dabei kann der Text der GUID 12345 **keine** Variablen wie `{ItemGuid}` nutzen.
- **`IconGUID`** (feste GUID) oder **`IconText`** (Ausdruck, z. B. `[AssetData(1234) Icon]`).
- In den Beispielen steht bei Produkt-/Asset-Zeilen dieselbe GUID sowohl als `IconGUID` als auch als `TextGUID` (Icon und Name des Assets). Das funktioniert vermutlich, weil der Asset-Name unter seiner eigenen GUID als Text liegt.
- Formatierung in Texten (aus Beispielen): `<font color='0xff817f87'>…</font>` (Farbe), `<b>…</b>` (fett). Zahlenformat über `>>`, z. B. `[… StorageAmount([RefGuid]) >> storagegood]`.

---

## 5. Conditions und Textsource-Ausdrücke

Alle Ausdrücke stehen in eckigen Klammern: **`[Einstieg(Argument) Feld Feld(Argument)]`**.
Der Einstieg liefert ein Objekt, jedes weitere Wort liest ein Feld daraus oder ruft eine Funktion auf.

### Kontext-Variablen

| Ausdruck | Bedeutung |
|---|---|
| `[RefGuid]` | GUID des Assets, über dem der Mauszeiger steht bzw. das ausgewählt ist. **Grundlage der meisten Bedingungen** |
| `[RefOid]` | Objekt-ID des Objekts (ungetestet) |
| `[Selection Object …]` | **ausgewähltes** Objekt. Mouseover wird *nicht* erkannt |
| `[Selection Picked …]` | Objekt unter dem Mauszeiger (zuletzt gehovert) |
| `[StaticData …]` | funktioniert auch bei Mouseover (z. B. Baumenü-Icons), aber nur wenige gültige Argumente |
| `[Selection Object Static Guid]` | GUID des Assets des ausgewählten Objekts: `Selection` → `Object` (CGameObject) → `Static` (CAsset) → `Guid` |

### Listen
- `COUNT` = Anzahl der Einträge, `AT(i)` = Eintrag i. Beispiel: `[FactoryAssetData([Selection Object Static Guid]) Production AT(index) Text]`.
- In ElementType 7 steht das `COUNT` als `<Source>`, die Kind-Elemente nutzen `AT(#index0#)` (Beispiel: `[ToolOneHelper ItemOrBuffEffectTargets(14443047) AT(#index0#) Text]`).
- Jeder Listeneintrag (`ListValue`) hat `Guid`, `Icon`, `Text`, `Value`.

### Prüfung „Objekt hat Eigenschaft“ (Fallstrick)
`[Selection Object Shipyard]` liefert bei Objekten **mit** der Eigenschaft immer „wahr“, bei Objekten ohne sie immer „falsch“, unabhängig von `ResultType`/`CompareOperator`. Dadurch ist „zeige X wenn ja, Y wenn nein“ schwierig. Workaround: eine andere Eigenschaft prüfen (z. B. `Walking` für Schiffe, `Culture` statt „kein Walking“).
Bei `[MetaObjects SessionGameObject([RefOid]) Walking]` scheitert die Prüfung **immer**. Stattdessen tiefer gehen: `[MetaObjects SessionGameObject([RefOid]) Walking BaseSpeedWithUpgrades]`.

---

## 6. Funktionsreferenz (aus `textsourcelist.json`)

Laut Autor des Guides ist die Datei etwas veraltet. Kommentare gibt es nur bei wenigen Einträgen, vieles ist aus dem Namen zu deuten. `int` = GUID bzw. Zahl.

### 6.1 Einstiegspunkte
`AccountSettings`, `AchievementAssetData`, `Achievements`, `ActiveTrade`, `AiConstruction`, `AiUnit`, `And`, `Animals`, `Area`, `AreaCoast`, `AreaFetch`, `AreaManager`, `AreaNeedUnlock`, `AreaPopulation`, `AreaProductDelta`, `AreaResidenceConsumption`, `AssetData`, `AssetForValue`, `Attractivity`, `Blueprint`, `BuildMode`, `BuildPermits`, `Cheat`, `Conditions`, `Contracts`, `Daytime`, `DebugRender`, `DesyncRecover`, `DifficultyHelper`, `Discovery`, `DlcUpgrade`, `Economy`, `EconomyStatistic`, `EnableObjectGroup`, `EngineMetrics`, `Expedition`, `FactoryAssetData`, `Feedback`, `FestivalManager`, `FreeAreaProductivity`, `FullscreenMovieQueueManager`, `GUI`, `Game`, `GameClock`, `GameObject`, `GameSetup`, `Greater`, `Happiness`, `HappyDayEventManager`, `Incidents`, `InfoTip`, `Input`, `Interface`, `Irrigation`, `Item`, `ItemAssetData`, `LoadingPier`, `Memorize`, `MetaGameManager`, `MetaIncidents`, `MetaInfluence`, `MetaObjects`, `Military`, `Money`, `Newspaper`, `Not`, `Notifications`, `Objects`, `Online`, `OnlineEvents`, `OnlineInventory`, `OnlineMarket`, `Options`, `Palace`, `PalaceDecreeData`, `Participants`, `Path`, `Pause`, `PlatformDispatch`, `PopulationAssetData`, `Popup`, `ProductAssetData`, `Quests`, `Railway`, `Random`, `RecipeAssetData`, `Records`, `RefGuid`, `RefOid`, `Regrow`, `Research`, `Rewards`, `SavegameFetcher`, `Selection`, `SessionCamera`, `SessionParticipants`, `SessionTransfer`, `ShortcutManager`, `ShowPhotographyNewspaper`, `Sound`, `StaticData`, `StreetOverlay`, `Target`, `Text`, `TextSourceManager`, `ToggleDebugInfo`, `ToolOneDataHelper`, `ToolOneHelper`, `ToolOneManager`, `TradeRoute`, `Unlock`, `Visitors`, `Weather`, `WinLose`, `WorkforceTransferManager`, `WorldMap`

### 6.2 `AssetData(guid)` → CAsset
| Aufruf | Rückgabe | Hinweis |
|---|---|---|
| `Guid` | int | |
| `Icon` | Text | |
| `Text` | Text | |

### 6.3 `ProductAssetData(guid)` → CProductAsset
| Aufruf | Rückgabe | Hinweis |
|---|---|---|
| `Guid` | int | |
| `Icon` | Text | |
| `Text` | Text | |
| `IsWorkforce` | bool | |
| `IsAbstract` | bool | |
| `IsDeltaOnly` | bool | |
| `IsValid` | bool | |
| `Amount` | int | Has to be filled by code. Not filled when static accessed |
| `AvailableAmount` | float | Has to be filled by code. Not filled when static accessed |
| `Available` | bool | Invalid when static accessed |
| `AllowedInCurrentRegion` | bool | Returns true if this product is associated with the current region |
| `AllowedInRegion(regionIndex:int)` | bool | Returns true if the product is associated with the given region (based on the AssociatedRegions config in T1) |
| `ProducingRegions` | Liste<ListValue> | Returns a list of region guid in which the product can be produced (based on ProductionRegions config in T1) |
| `CanBeProducedInCurrentRegion` | bool | Returns if a good can be produced in the current region |
| `DoesBusNeedCheckAttractivity` | bool | Returns true for bus needs with an attractivity check |

### 6.4 `FactoryAssetData(guid)` → CFactoryAsset
| Aufruf | Rückgabe | Hinweis |
|---|---|---|
| `Guid` | int | |
| `Icon` | Text | |
| `Text` | Text | |
| `HasProduction` | bool | |
| `Production` | Liste<CTextSourceListValue> | |
| `HasConsumption` | bool | |
| `Consumption` | Liste<CTextSourceListValue> | |
| `IsRecipeFactory` | bool | |

### 6.5 `ItemAssetData(guid)` → CItemAsset (Items und Buffs)
| Aufruf | Rückgabe | Hinweis |
|---|---|---|
| `Guid` | int | |
| `Icon` | Text | |
| `Text` | Text | |
| `Allocation` | Text | |
| `AllocationTextGUID` | int | |
| `ItemOrBuffEffectTargetsFormatted` | Text | |
| `AdditionalOutputAmount(index:int)` | int | |
| `AdditionalOutputProduct(index:int)` | int | |
| `AdditionalOutputCycle(index:int)` | int | |
| `AdditionalOutputCount` | int | |
| `AdditionalOutputForceProductSameAsFactoryOutput(index:int)` | bool | |
| `AdditionalOutputProductsFormatted` | Text | |
| `InputAmountUpgradeCount` | int | |
| `InputAmountUpgradeAmount(index:int)` | int | |
| `InputAmountUpgradeProduct(index:int)` | int | |
| `ReplaceInputOldInput(index:int)` | int | |
| `ReplaceInputOldInputsFormatted` | Text | |
| `ReplaceInputNewInput(index:int)` | int | |
| `ReplaceInputNewInputsFormatted` | Text | |
| `ReplaceInputCount` | int | |
| `SpecialistSpawnProbabilityIfPercent` | int | |
| `OverrideSpecialistPool` | int | |
| `InputBenefitModifierCount` | int | |
| `InputBenefitModifierProduct(index:int)` | int | |
| `InputBenefitModifierAdditionalSupply(index:int)` | float | |
| `InputBenefitModifierAdditionalHappiness(index:int)` | float | |
| `InputBenefitModifierAdditionalHeat(index:int)` | float | |
| `InputBenefitModifierAdditionalMoney(index:int)` | float | |
| `InputBenefitModifierAdditionalResearch(index:int)` | float | |
| `IsInputBenefitModifierProvidingAnySupply` | bool | |
| `IsInputBenefitModifierProvidingAnyHappiness` | bool | |
| `IsInputBenefitModifierProvidingAnyHeat` | bool | |
| `IsInputBenefitModifierProvidingAnyMoney` | bool | |
| `IsInputBenefitModifierProvidingAnyResearch` | bool | |
| `InputBenefitAllAdditionalSupplyFormatted` | Text | |
| `InputBenefitAllAdditionalHappinessFormatted` | Text | |
| `InputBenefitAllAdditionalHeatFormatted` | Text | |
| `InputBenefitAllAdditionalMoneyFormatted` | Text | |
| `InputBenefitAllAdditionaResearchFormatted` | Text | |
| `GoodConsumptionCount` | int | |
| `GoodConsumptionProvidedNeed(index:int)` | int | |
| `GoodConsumptionAmountInPercent(index:int)` | float | |
| `GoodConsumptionAmountProvidedInPercent(index:int)` | float | |
| `GoodConsumptionAllProvidedNeedsFormatted` | Text | |
| `HasMultipleSameGoodConsumption` | bool | |
| `PirateFlagActive` | bool | |
| `WhiteFlagActive` | bool | |
| `ProjectileInnerDamage` | float | |
| `ProjectileOuterDamageRadius` | float | |
| `UsedProjectile` | int | |
| `NeedProvidesNeedCount` | int | |
| `AllProvidedNeedsFormatted` | Text | |
| `AllSubstituteNeedsFormatted` | Text | |
| `AddAssemblyOptionsCount` | int | |
| `AddAssemblyOptionsFormatted` | Text | |
| `ReplaceAssemblyOptionsCount` | int | |
| `ReplaceAssemblyOptionsNewFormatted` | Text | |
| `ReplacingWorkforce` | int | |
| `GoodGenerationProbability` | int | |
| `GoodGenerationPoolFormatted` | Text | |
| `BlockBuyingShares` | bool | |
| `BlockHostileTakeover` | bool | |
| `HappinessIgnoresMorale` | bool | |
| `EnablesSelfHealDuringCombat` | bool | |
| `ResolverUnitCount` | int | |
| `ResolverUnitDecreaseRateInPercent` | int | |
| `ResolverUnitMovementSpeedInPercent` | int | |
| `SpecialUnitHappinessThresholdUpgrade` | int | |
| `AddedFertility` | int | |
| `IsItemActionNuke` | bool | |
| `IsItemActionKamikaze` | bool | |
| `AreaTolerance` | int | |
| `IsUsingMoraleDamageEffect` | bool | |
| `IsUsingHitpointDamageEffect` | bool | |
| `ItemSetUpgradeCount` | int | |
| `ItemSetUpgrade(index:int)` | CTextSourceListValue | |
| `ItemSetUpgradesFormatted` | Text | |
| `HasDivingRarityUpgrades` | bool | Diving rarity upgrade |
| `DivingRarityUpgradesFormatted` | Text | |
| `IslandStorageIncrease` | int | |
| `IslandWorkforceIncreaseCount` | int | |
| `IslandWorkforceIncrease(index:int)` | int | |
| `AdditionalInfluence` | int | |
| `AdditionalInfluencePerModule` | int | |
| `AdditionalAttractiveness` | int | |
| `AdditionalAttractivenessPerSet` | int | |
| `AdditionalMonumentRewardAmount` | int | |
| `AdditionalSlotAmount` | int | |
| `AdditionalServiceRange` | int | |
| `ProductivityIncrease` | int | |
| `ElectricityBoostIncrease` | int | |
| `WorforceDecrease` | int | |
| `PierLoadingSpeedIncrease` | int | |
| `IsGlobalBuffTimed` | bool | |
| `GlobalBuffCountdown` | rdtime | |
| `IsFluffItem` | bool | |
| `EffectTargetCount` | int | |
| `EffectTarget(index:int)` | CAsset | |

### 6.6 `ToolOneHelper …` (CToolOneTextHelper)
| Aufruf | Rückgabe | Hinweis |
|---|---|---|
| `ToolOneHelper InfoDescription(guid:int)` | CAsset | |
| `ToolOneHelper ProductCategory(guid:int)` | CAsset | |
| `ToolOneHelper BuildingCategory(guid:int)` | CAsset | |
| `ToolOneHelper ConstructionCategoryDescription(guid:int)` | CAsset | |
| `ToolOneHelper Attractiveness(guid:int)` | int | |
| `ToolOneHelper IsTree(guid:int)` | bool | |
| `ToolOneHelper IsSlotObject(guid:int)` | bool | |
| `ToolOneHelper HasSlotType(guid:int, slot:int)` | bool | |
| `ToolOneHelper ProductionRegionsForProduct(productGUID:int)` | Liste<ListValue> | Returns a list of regions GUIDs in which this product can be produced (requires to be configured in T1) |
| `ToolOneHelper ItemBuffs(guid:int)` | Liste<ListValue> | |
| `ToolOneHelper ItemBuffsSpecial(guid:int)` | Liste<ListValue> | |
| `ToolOneHelper ItemRarity(guid:int)` | Text | |
| `ToolOneHelper ItemRarityColor(guid:int)` | rduint | |
| `ToolOneHelper IsItemRarityQuest(guid:int)` | bool | |
| `ToolOneHelper ExpeditionItemFluff(guid:int)` | CAsset | |
| `ToolOneHelper ItemExclusiveGroup(guid:int)` | Text | |
| `ToolOneHelper ItemHasExclusiveGroup(guid:int)` | bool | |
| `ToolOneHelper ItemAllocation(guid:int)` | Text | |
| `ToolOneHelper ItemHasAllocation(guid:int)` | bool | |
| `ToolOneHelper ItemIsSpecialist(guid:int)` | bool | |
| `ToolOneHelper ItemActionDescription(guid:int)` | Text | |
| `ToolOneHelper HasItemActionDescription(guid:int)` | bool | |
| `ToolOneHelper ItemCooldown(guid:int)` | rdtime | |
| `ToolOneHelper ItemDuration(guid:int)` | rdtime | |
| `ToolOneHelper BarrageDuration(guid:int)` | rdtime | |
| `ToolOneHelper ItemIsDestroyedAfterCooldown(guid:int)` | bool | |
| `ToolOneHelper ItemHasCharges(guid:int)` | bool | |
| `ToolOneHelper ItemActiveBuff(guid:int)` | int | |
| `ToolOneHelper ItemSet(guid:int)` | int | |
| `ToolOneHelper ItemSetItems(guid:int)` | Liste<int> | |
| `ToolOneHelper ItemIsActive(guid:int)` | bool | |
| `ToolOneHelper ItemOrBuffEffectTargets(guid:int)` | Liste<int> | |
| `ToolOneHelper IsObjectEffectTarget(objectGUID:int, effectGUID:int)` | bool | |
| `ToolOneHelper ItemHasExpeditionAttribute(guid:int, getTraits:bool)` | bool | |
| `ToolOneHelper ItemExpeditionAttributes(guid:int, getTraits:bool)` | Liste<ListValue> | |
| `ToolOneHelper ExpeditionThreatAttributes(guid:int)` | Liste<ListValue> | |
| `ToolOneHelper ExpeditionThreatFirstAttribute(guid:int)` | int | |
| `ToolOneHelper ItemExpeditionThreats(guid:int)` | Liste<ListValue> | |
| `ToolOneHelper IncidentResolverUnitsForTargetBuildings(guid:int, specialUnits:bool)` | Liste<int> | |
| `ToolOneHelper KamikazeItemDamageForSelected(guid:int)` | int | |
| `ToolOneHelper MainBuildingOutput` | CAsset | |
| `ToolOneHelper BuildingOutput(guid:int)` | CAsset | |
| `ToolOneHelper BuildCost(guid:int)` | CBuildCost | BuildCosts |
| `ToolOneHelper BuildCostSelected(guid:int)` | CBuildCost | |
| `ToolOneHelper ExpeditionName(expeditionGUID:int)` | int | |
| `ToolOneHelper ExpeditionIcon(expeditionGUID:int)` | Text | |
| `ToolOneHelper ExpeditionDescription(expeditionGUID:int)` | int | |
| `ToolOneHelper ExpeditionDifficulty(expeditionGUID:int)` | Text | |
| `ToolOneHelper ExpeditionRegion(expeditionGUID:int)` | int | |
| `ToolOneHelper UnlockRequirements(guid:int)` | Liste<CTextSourceUnlockDataEntry> | |
| `ToolOneHelper SlotAmount(guid:int)` | int | |
| `ToolOneHelper SocketAmount(guid:int)` | int | |
| `ToolOneHelper HitPoints(guid:int)` | int | |
| `ToolOneHelper AttackDamage(guid:int)` | int | |
| `ToolOneHelper ReloadTimeInMS(guid:int)` | int | |
| `ToolOneHelper DPS(guid:int)` | float | |
| `ToolOneHelper ShipMaintenance(shipguid:int)` | int | |
| `ToolOneHelper SelectionAggresive` | bool | |
| `ToolOneHelper SelectionDefensive` | bool | |
| `ToolOneHelper SelectionStandGround` | bool | |
| `ToolOneHelper SelectionMixedStance` | bool | |
| `ToolOneHelper GroupSelectionStayTogether` | bool | |
| `ToolOneHelper GroupSelectionMoveIndividually` | bool | |
| `ToolOneHelper GroupSelectionMixed` | bool | |
| `ToolOneHelper MaxPopulationNeededForUnlocks(populationGUID:int)` | int | |
| `ToolOneHelper ItemTradePrice(itemGUID:int)` | int | |
| `ToolOneHelper ProductBasePrice(productGUID:int)` | int | |
| `ToolOneHelper StartProducts(productGUID:int, difficulty:int)` | int | |
| `ToolOneHelper BaseShareInfluence` | int | |
| `ToolOneHelper ItemGUIDFromEffectOrEffectContainer(effectGUID:int)` | int | |
| `ToolOneHelper ForwardedEffectGuidOrSelf(effectGUID:int)` | int | |
| `ToolOneHelper IsForwardingEffect(effectGUID:int)` | bool | Palace |
| `ToolOneHelper MinistryName(effectContainerGUID:int)` | Text | |
| `ToolOneHelper AmountPalaceModulesForCompanyLevel(curentCompanyLevel:int)` | int | |
| `ToolOneHelper PalaceRangePerModule` | int | |
| `ToolOneHelper IsPalaceModule(moduleGuid:int)` | bool | |
| `ToolOneHelper NextUnlocks(currentAttractiveness:int)` | Liste<CAsset> | |
| `ToolOneHelper NextUnlockAttractiveness(currentAttractiveness:int)` | int | |
| `ToolOneHelper MinistryIndex(effectGUID:int)` | int | |
| `ToolOneHelper RequiresIrrigation(buildingGUID:int)` | bool | Irrigation |
| `ToolOneHelper IsBoostedByIrrigation(buildingGUID:int)` | bool | |
| `ToolOneHelper RequiresDirectCanalConnection(buildingGUID:int)` | bool | |
| `ToolOneHelper SkinName(guid:int)` | Text | Object Skins |
| `ToolOneHelper SkinDescription(guid:int)` | Text | |
| `ToolOneHelper IsMonument(buildingGUID:int)` | bool | |
| `ToolOneHelper HighscoreIcon` | Text | Highscore |

### 6.7 Auswahl (`Selection …`)
| Aufruf | Rückgabe | Hinweis |
|---|---|---|
| `Selection Picked` | CGameObject | |
| `Selection Objects` | Liste<CGameObject> | Returns the list of selected objects |
| `Selection Object` | CGameObject | Returns a selected object from the list of selected objects. If there are multiple objects in the list it is u |
| `Selection ContainsWarship` | bool | Returns true if the selection contains at least one warship |
| `Selection SelectionGroup` | CSelectionGroupController | Returns the SelectionGroupController to store or restore selection groups |

Das Objekt (`CGameObject`, z. B. `Selection Object`) hat u. a. `Static` (Asset) und Eigenschaften wie `Factory`, `ItemContainer`, `Residence`, `Walking`, `Culture`, `Shipyard`, `Warehouse`, `Module` (insgesamt 76 Mitglieder).

### 6.8 Rückgabetypen von Listen
- `ListValue`: `Guid`, `Icon`, `Text`, `Value`
- `CBuildCost`: `Empty`, `HasInfluenceChanges`, `IsPayable`, `Costs`, `Icons`, `Names`, `Values`, `Payable`, `Available`, `MoneyCost`, `InfluenceCost`, `InfluencePayable`, `InfluencePayback`, `InfluenceUsageCost`
- `UnlockDataEntry`: `Guid`, `Icon`, `Text`, `HasOperatorAnd`, `HasOperatorOr`, `CurrentAmount`, `TargetAmount`

---

## 7. Beispiele (aus funktionierenden Dateien)

### 7.1 Block in den Produkt-Infotip einhängen, abhängig vom Produkt
Aus `infotips_fake_water.xml`: Gruppe (ElementType 8), sichtbar nur wenn `[RefGuid]` die Produkt-GUID ist:
```xml
<ModOps>
  <ModOp Path="//InfoTipData[Guid = '25000206']" Type="add">
    <InfoElement>
      <ElementType>8</ElementType>
      <ChildCount>1</ChildCount>
      <VisibilityElement>
        <ElementType><ElementType>2</ElementType></ElementType>
        <ChildCount>1</ChildCount>
        <VisibilityElement>
          <ElementType><ElementType>1</ElementType></ElementType>
          <CompareOperator />
          <ResultType><ResultType>1</ResultType></ResultType>
          <ExpectedValueInt>1404000880</ExpectedValueInt>
          <Condition>[RefGuid]</Condition>
        </VisibilityElement>
        <OperatorType />
      </VisibilityElement>
      <InfoElement>
        <ElementType>4</ElementType>
        <VisibilityElement>
          <ElementType><ElementType>2</ElementType></ElementType>
          <OperatorType />
        </VisibilityElement>
        <Icon><IconGUID>1404004229</IconGUID><Style /></Icon>
        <Text><TextGUID>1404004892</TextGUID><Style /></Text>
        <Value><Style /></Value>
        <BackgroundType />
      </InfoElement>
    </InfoElement>
  </ModOp>
</ModOps>
```

### 7.2 Zeile hinter ein bestehendes Element setzen (`addNextSibling`)
Pfad über den Inhalt des Vorgängers (Bedingung oder Headline):
```xml
<ModOp Type="addNextSibling"
       Path="//InfoElement[VisibilityElement/VisibilityElement/Condition = '[StaticData Building AllowedInRegion(4, [RefGuid])]']">
  <InfoElement> … </InfoElement>
</ModOp>
```
Weitere Pfad-Muster aus den Beispielen:
- `//InfoTipData[Guid = '501520']` (nach einem ganzen Infotip einfügen)
- `//InfoTipData[Guid = '501667']/InfoElement[3]` (n-tes Element)
- `//InfoElement[Headline/TextGUID = '134145']`
- `//InfoTipData[Guid='25000084']/InfoElement[ElementType='16'][last()]`

### 7.3 Liste mit Einträgen (ElementType 7)
```xml
<InfoElement>
  <ElementType>7</ElementType>
  <ChildCount>1</ChildCount>
  <VisibilityElement>
    <ElementType><ElementType>2</ElementType></ElementType>
    <OperatorType />
  </VisibilityElement>
  <InfoElement>
    <ElementType>4</ElementType>
    <VisibilityElement>
      <ElementType><ElementType>2</ElementType></ElementType>
      <OperatorType />
    </VisibilityElement>
    <Icon>
      <IconText>[AssetData([ToolOneHelper ItemOrBuffEffectTargets(14443047) AT(#index0#) Text]) Icon]</IconText>
      <Style />
    </Icon>
    <Text>
      <Text>[AssetData([ToolOneHelper ItemOrBuffEffectTargets(14443047) AT(#index0#) Text]) Text]</Text>
      <Style />
    </Text>
    <Value><Style /></Value>
    <WarningType />
    <BackgroundType />
  </InfoElement>
  <Source>[ToolOneHelper ItemOrBuffEffectTargets(14443047) COUNT]</Source>
</InfoElement>
```

### 7.4 Vanilla-Infotips mit Produktionsliste
Die Infotips mit GUID **500260** (Überschrift TextGUID 3032) und **500262** (3033) bestehen aus einer Überschrift und einer Liste über `[FactoryAssetData([Selection Object Static Guid]) Production COUNT]`, je Zeile Icon und Text über `… Production AT(index) Icon/Text`. (aus JSON-Export)

### 7.5 Trennlinie
```xml
<InfoElement>
  <ElementType>6</ElementType>
  <VisibilityElement>
    <ElementType><ElementType>2</ElementType></ElementType>
    <OperatorType />
  </VisibilityElement>
  <Text><Style /></Text>
</InfoElement>
```
Laut Doku sind die Linien teils unsichtbar (Vanilla-Fehler).

### 7.6 Fettdruck mit Asset-Text (Sultan’s Seals)
`<Text><Text>&lt;b&gt;[AssetData(1404005138) Text]&lt;/b&gt;</Text><Style /></Text>`

---

## 8. Bekannte Infotip-GUIDs (aus Beispielen)

| GUID | Verwendung in den Beispielen |
|---|---|
| `25000206` | Produkt-Infotip: produktabhängige Blöcke werden per `[RefGuid]` eingehängt |
| `25000084` | Item-Infotip (`[ItemAssetData([RefGuid]) AllocationTextGUID]`), Beacon-Block wird hinter das letzte ElementType-16-Element gesetzt |
| `25000020`, `501520`, `501667`, `501669`, `501932` | werden in den Beispielen gepatcht, Zweck nicht verifiziert |
| `500260` / `500262` | Produktionsliste einer Fabrik/Mine |
| `500683` | Standard von `ModuleButtonInfotip` |

Asset-Felder vom Typ `Infotip` (properties-toolone.xml): `ModuleButtonInfotip` (Standard 500683), `InfoCorner`.

---

## 9. ModOp-Hinweise

- Der `Path` eines ModOps enthält oft große Teile des Ziel-Elements. Ändert ein anderer Mod Bedingung oder Text dieses Elements, schlägt das ModOp fehl.
- `add`, `addNextSibling` und `addPrevSibling` verändern den Pfad zum Vanilla-Code nicht und sind meist unkritisch. `merge`, `replace` und `remove` an Vanilla-Code kollidieren sehr wahrscheinlich mit anderen Mods, die denselben Infotip ändern.
- `ChildCount` wird vom Modloader korrigiert, fehlende Einträge werden aber nicht ergänzt.
- `AssetForValue` / `ValueAssetMap` übersetzen einen Wert in einen anderen (z. B. Participant-ID in GUID). Die Reihenfolge der Einträge ist relevant (aufsteigend nach Wert). Der maximale `ValidFrom`-Wert liegt bei etwa 7 Stellen, darüber werden Werte ungenau.

---

## 10. Offene Punkte (ungetestet)

- Ob `ItemAssetData(guid) ItemOrBuffEffectTargetsFormatted` bei einem Item den Buff findet, wenn dieser nur über Trigger-Aktionen verknüpft ist (nicht über ein Feld am Item).
- `ItemEffectTargetPool` (Asset mit `EffectTargetGUIDs`, darf auch Pools enthalten) als eigener Pool: unklar, ob `ItemOrBuffEffectTargets` und `IsObjectEffectTarget(objectGUID, effectGUID)` ihn direkt oder nur über einen Effekt auflösen.
- `ItemAssetData` mit einer GUID, die weder Item noch Buff ist: vermutlich leer.
- Ob Bedingungen innerhalb einer Liste (`#index0#`) den Index benutzen dürfen.
- Welche TextGUID die Überschrift „Rohstoffvorkommen“ ist (3032 oder 3033).
- Wie die Engine Produkt-/Fake-Produkt-Infotips zuordnet: nicht in den Properties enthalten.
- Ob Arithmetik in Ausdrücken möglich ist (`[RefGuid] + 100`).
