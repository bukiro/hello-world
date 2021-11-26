import { Injectable } from '@angular/core';
import { Condition, ConditionOverride } from 'src/app/classes/Condition';
import { ConditionGain } from 'src/app/classes/ConditionGain';
import { CharacterService } from 'src/app/services/character.service';
import { EffectsService } from 'src/app/services/effects.service';
import { Character } from 'src/app/classes/Character';
import { AnimalCompanion } from 'src/app/classes/AnimalCompanion';
import { ActivityGain } from 'src/app/classes/ActivityGain';
import { ItemGain } from 'src/app/classes/ItemGain';
import { Item } from 'src/app/classes/Item';
import { ItemsService } from 'src/app/services/items.service';
import { Equipment } from 'src/app/classes/Equipment';
import { EffectGain } from 'src/app/classes/EffectGain';
import * as json_conditions from 'src/assets/json/conditions';
import { Creature } from 'src/app/classes/Creature';
import { Activity } from 'src/app/classes/Activity';
import { ItemActivity } from 'src/app/classes/ItemActivity';
import { ExtensionsService } from 'src/app/services/extensions.service';
import { Familiar } from 'src/app/classes/Familiar';
import { Rune } from 'src/app/classes/Rune';
import { WeaponRune } from 'src/app/classes/WeaponRune';
import { EvaluationService } from 'src/app/services/evaluation.service';
import { RefreshService } from 'src/app/services/refresh.service';

@Injectable({
    providedIn: 'root'
})
export class ConditionsService {

    private conditions: Condition[] = [];
    private loading: boolean = false;
    private appliedConditions: ConditionGain[][] = [[], [], []];
    private conditionsMap = new Map<string, Condition>();

    constructor(
        private extensionsService: ExtensionsService,
        private evaluationService: EvaluationService,
        private refreshService: RefreshService
    ) { }

    get_ReplacementCondition(name?: string): Condition {
        return Object.assign(new Condition(), { name: "Condition not found", "desc": (name ? name : "The requested condition") + " does not exist in the conditions list." });
    }

    get_ConditionFromName(name: string): Condition {
        //Returns a named condition from the map.
        return this.conditionsMap.get(name.toLowerCase()) || this.get_ReplacementCondition(name);
    }

    get_Conditions(name: string = "", type: string = ""): Condition[] {
        if (!this.still_loading()) {
            //If only a name is given, try to find a condition by that name in the index map. This should be much quicker.
            if (name && !type) {
                return [this.get_ConditionFromName(name)];
            } else {
                return this.conditions.filter(condition =>
                    (!name || condition.name.toLowerCase() == name.toLowerCase()) &&
                    (!type || condition.type.toLowerCase() == type.toLowerCase())
                );
            }
        }
        return [new Condition()];
    }

    get_CalculatedIndex(creature: string): number {
        switch (creature) {
            case "Character":
                return 0;
            case "Companion":
                return 1;
            case "Familiar":
                return 2;
        }
    }

    get_AppliedConditions(creature: Creature, characterService: CharacterService, activeConditions: ConditionGain[], readonly: boolean = false): ConditionGain[] {
        let creatureIndex: number = this.get_CalculatedIndex(creature.type);
        //Readonly skips any modifications and just returns the currently applied conditions. The same happens if the conditions haven't changed since the last run.
        if (!readonly && JSON.stringify(activeConditions) != JSON.stringify(this.appliedConditions[creatureIndex])) {
            function conditionOverrideExists(gain: ConditionGain) {
                return overrides.some(override => ["All", gain.name].includes(override.override.name) && override.source != gain.id);
            }
            let overrides: { override: ConditionOverride, source: string }[] = [];
            activeConditions.forEach(gain => {
                //Set apply for all conditions first, then change it later.
                gain.apply = true;
                const originalCondition = this.get_ConditionFromName(gain.name);
                if (originalCondition.name == gain.name) {
                    //Mark any conditions for deletion if their duration is 0, or if they can have a value and their value is 0 or lower
                    //Add overrides for the rest if their conditionChoiceFilter matches the choice.
                    if ((originalCondition.hasValue && gain.value <= 0) || gain.duration == 0) {
                        gain.value = -1;
                    } else {
                        overrides.push(...originalCondition.overrideConditions.filter(override => !override.conditionChoiceFilter?.length || override.conditionChoiceFilter.includes(gain.choice)).map(overrideCondition => { return { override: overrideCondition, source: gain.id } }));
                    }
                }
            });
            //Cleanup overrides, first iteration: If any condition overrides "All" and is itself overridden, remove its overrides.
            //"All" overrides are more dangerous and need to be cleaned up before they override every other condition.
            activeConditions.forEach(gain => {
                if (overrides.some(override => override.source == gain.id && override.override.name == "All")) {
                    if (conditionOverrideExists(gain)) {
                        overrides = overrides.filter(override => override.source != gain.id);
                    }
                }
            })
            //Cleanup overrides, second iteration: If any overriding condition is itself overridden, its own overrides are removed.
            activeConditions.forEach(gain => {
                if (overrides.some(override => override.source == gain.id)) {
                    if (conditionOverrideExists(gain)) {
                        overrides = overrides.filter(override => override.source != gain.id);
                    }
                }
            })
            //Sort the conditions by how many levels of parent conditions they have (conditions without parents come first).
            //This allows us to first override the parents, then their dependent children.
            activeConditions
                .map(gain => {
                    let depth: number = 0;
                    let testGain = gain;
                    while (testGain?.parentID) {
                        depth++;
                        testGain = activeConditions.find(parent => parent.id == testGain.parentID);
                    }
                    return { depth: depth, gain: gain };
                })
                .sort((a, b) => a.depth - b.depth)
                .map(set => set.gain)
                .forEach(gain => {
                    const condition = this.get_ConditionFromName(gain.name);
                    if (condition.name == gain.name) {
                        //Only process the conditions that haven't been marked for deletion.
                        if (gain.value != -1) {
                            const parentGain = activeConditions.find(otherGain => otherGain.id == gain.parentID);
                            if (conditionOverrideExists(gain)) {
                                //If any remaining condition override applies to this or all, disable this.
                                gain.apply = false;
                            } else if (parentGain && !parentGain.apply) {
                                //If the parent of this condition is disabled, disable this unless it is the source of the override.
                                gain.apply = false;
                            } else {
                                //If the condition has not been overridden, we compare it condition with all others that have the same name and deactivate it under certain circumstances
                                //Are there any other conditions with this name and value that have not been deactivated yet?
                                activeConditions.filter(otherGain =>
                                    (otherGain !== gain) &&
                                    (otherGain.name == gain.name) &&
                                    (otherGain.apply)
                                ).forEach(otherGain => {
                                    //Unlimited conditions and higher value conditions remain, same persistent damage value conditions are exclusive.
                                    if (condition.unlimited) {
                                        gain.apply = true;
                                    } else if (otherGain.value + otherGain.heightened > gain.value + gain.heightened) {
                                        gain.apply = false;
                                    } else if (otherGain.choice > gain.choice) {
                                        gain.apply = false;
                                    } else if (
                                        otherGain.value == gain.value &&
                                        otherGain.heightened == gain.heightened
                                    ) {
                                        //If the value and choice is the same:
                                        //Deactivate this condition if the other one has a longer duration (and this one is not permanent), or is permanent (no matter if this one is)
                                        //The other condition will not be deactivated because it only gets compared to the ones that aren't deactivated yet
                                        if (otherGain.durationIsPermanent || (gain.duration >= 0 && otherGain.duration >= gain.duration)) {
                                            gain.apply = false;
                                        }
                                    }
                                })
                            }
                        }
                    }
                })
            //Remove all conditions that were marked for deletion by setting its value to -1. We use while so we don't mess up the index and skip some.
            //Ignore anything that would stop the condition from being removed (i.e. lockedByParent), or we will get stuck in this loop.
            while (activeConditions.some(gain => gain.value == -1)) {
                characterService.remove_Condition(creature, activeConditions.find(gain => gain.value == -1), false, undefined, undefined, true);
            }
            this.appliedConditions[creatureIndex] = activeConditions.map(gain => Object.assign(new ConditionGain(), gain).recast());
        }
        return activeConditions
            .sort((a, b) => {
                if (a.name > b.name) {
                    return 1;
                }
                if (a.name < b.name) {
                    return -1;
                }
                return 0;
            }).sort((a, b) => {
                if (a.duration > b.duration) {
                    return 1;
                }
                if (a.duration < b.duration) {
                    return -1;
                }
                return 0;
            })
    }

    process_Condition(creature: Creature, characterService: CharacterService, effectsService: EffectsService, itemsService: ItemsService, gain: ConditionGain, condition: Condition, taken: boolean, increaseWounded: boolean = true, ignoreEndsWithConditions: boolean = false) {

        //Prepare components for refresh.
        if (condition.gainActivities.length) {
            this.refreshService.set_ToChange(creature.type, "activities");
        }
        this.refreshService.set_HintsToChange(creature, condition.hints, { characterService: characterService });

        if (taken) {
            gain.maxDuration = gain.duration;
        }

        let conditionDidSomething: boolean = false;

        //Copy the condition's ActivityGains to the ConditionGain so we can track its duration, cooldown etc.
        gain.gainActivities = condition.gainActivities.map(activityGain => Object.assign<ActivityGain, ActivityGain>(new ActivityGain(), JSON.parse(JSON.stringify(activityGain))).recast());

        //One time effects
        if (taken) {
            condition.onceEffects.forEach(effect => {
                conditionDidSomething = true;
                let tempEffect = Object.assign<EffectGain, EffectGain>(new EffectGain(), JSON.parse(JSON.stringify(effect))).recast();
                //Copy some data to allow calculations and tracking temporary HP.
                if (!tempEffect.source) {
                    tempEffect.source = condition.name;
                    tempEffect.sourceId = gain.id;
                }
                if (!tempEffect.spellSource) {
                    tempEffect.spellSource = gain.spellSource;
                }
                characterService.process_OnceEffect(creature, tempEffect, gain.value, gain.heightened, gain.choice, gain.spellCastingAbility);
            })
        }

        //One time effects when ending the condition
        if (!taken) {
            condition.endEffects.forEach(effect => {
                conditionDidSomething = true;
                let tempEffect = Object.assign<EffectGain, EffectGain>(new EffectGain(), JSON.parse(JSON.stringify(effect))).recast();
                //Copy some data to allow calculations and tracking temporary HP.
                if (!tempEffect.source) {
                    tempEffect.source = condition.name;
                    tempEffect.sourceId = gain.id;
                }
                if (!tempEffect.spellSource) {
                    tempEffect.spellSource = gain.spellSource;
                }
                characterService.process_OnceEffect(creature, tempEffect, gain.value, gain.heightened, gain.choice, gain.spellCastingAbility);
            })
        }

        //Gain other conditions if applicable
        //They are removed when this is removed in characterService.remove_Condition().
        if (taken) {
            condition.gainConditions.filter(extraCondition => !extraCondition.conditionChoiceFilter.length || extraCondition.conditionChoiceFilter.includes(gain.choice)).forEach(extraCondition => {
                conditionDidSomething = true;
                let addCondition = Object.assign<ConditionGain, ConditionGain>(new ConditionGain(), JSON.parse(JSON.stringify(extraCondition))).recast();
                if (!addCondition.heightened) {
                    addCondition.heightened = gain.heightened;
                }
                addCondition.source = gain.name;
                addCondition.parentID = gain.id;
                addCondition.apply = true;
                characterService.add_Condition(creature, addCondition, false, gain);

            })
        }

        //If this ends, remove conditions that have this listed in endsWithConditions
        if (!taken && !ignoreEndsWithConditions) {
            characterService.get_AppliedConditions(creature, "", "", true)
                .filter(conditionGain => this.get_ConditionFromName(conditionGain.name).endsWithConditions.some(endsWith => endsWith.name == condition.name && (!endsWith.source || gain.source == endsWith.source)))
                .map(conditionGain => Object.assign<ConditionGain, ConditionGain>(new ConditionGain(), JSON.parse(JSON.stringify(conditionGain))).recast())
                .forEach(conditionGain => {
                    conditionDidSomething = true;
                    characterService.remove_Condition(creature, conditionGain, false);
                })
        }

        //Remove other conditions if applicable
        if (taken) {
            condition.endConditions.forEach(end => {
                conditionDidSomething = true;
                characterService.get_AppliedConditions(creature, end.name)
                    .filter(conditionGain =>
                        conditionGain != gain &&
                        (
                            !end.sameCasterOnly ||
                            (
                                conditionGain.foreignPlayerId == gain.foreignPlayerId
                            )
                        )
                    )
                    .forEach(conditionGain => {
                        characterService.remove_Condition(creature, conditionGain, false, end.increaseWounded);
                    })
            })
        }

        //Conditions that start when this ends. This happens if there is a nextCondition value.
        if (!taken) {
            condition.nextCondition.forEach(nextCondition => {
                if (!nextCondition.conditionChoiceFilter.length || nextCondition.conditionChoiceFilter.includes(gain.choice)) {
                    conditionDidSomething = true;
                    let newGain: ConditionGain = new ConditionGain();
                    newGain.source = gain.source;
                    newGain.name = nextCondition.name;
                    newGain.duration = nextCondition.duration || -1;
                    newGain.choice = nextCondition.choice || this.get_ConditionFromName(newGain.name)?.choice || "";
                    characterService.add_Condition(creature, newGain, false);
                }
            })
        }

        //Gain Items
        if (creature && creature.type != "Familiar") {
            if (condition.gainItems.length) {
                this.refreshService.set_ToChange(creature.type, "attacks");
                this.refreshService.set_ToChange(creature.type, "inventory");
                if (taken) {
                    gain.gainItems = condition.get_HeightenedItems(gain.heightened).map(itemGain => Object.assign<ItemGain, ItemGain>(new ItemGain(), JSON.parse(JSON.stringify(itemGain))).recast());
                    gain.gainItems
                        .filter(gainItem =>
                        (
                            !gainItem.conditionChoiceFilter.length ||
                            gainItem.conditionChoiceFilter.includes(gain.choice)
                        )
                        ).forEach(gainItem => {
                            conditionDidSomething = true;
                            this.add_ConditionItem((creature as AnimalCompanion | Character), characterService, itemsService, gainItem, condition);
                        });
                } else {
                    gain.gainItems
                        .filter(gainItem =>
                        (
                            !gainItem.conditionChoiceFilter.length ||
                            gainItem.conditionChoiceFilter.includes(gain.choice)
                        )
                        ).forEach(gainItem => {
                            conditionDidSomething = true;
                            this.remove_ConditionItem((creature as AnimalCompanion | Character), characterService, itemsService, gainItem);
                        });
                    gain.gainItems = [];
                }
            }
        }

        if (condition.senses.length) {
            this.refreshService.set_ToChange(creature.type, "skills");
        }

        //Stuff that happens when your Dying value is raised or lowered beyond a limit.
        if (gain.name == "Dying") {
            conditionDidSomething = true;
            if (taken) {
                if (creature.health.dying(creature, characterService) >= creature.health.maxDying(creature, effectsService)) {
                    if (characterService.get_AppliedConditions(creature, "Dead").length == 0) {
                        characterService.add_Condition(creature, Object.assign(new ConditionGain, { name: "Dead", source: "Dying value too high" }).recast(), false);
                    }
                }
            } else {
                if (creature.health.dying(creature, characterService) == 0) {
                    if (increaseWounded) {
                        if (creature.health.wounded(creature, characterService) > 0) {
                            characterService.get_AppliedConditions(creature, "Wounded").forEach(gain => {
                                gain.value++;
                                gain.source = "Recovered from Dying";
                            });
                        } else {
                            characterService.add_Condition(creature, Object.assign(new ConditionGain, { name: "Wounded", value: 1, source: "Recovered from Dying" }).recast(), false);
                        }
                    }
                    if (creature.health.currentHP(creature, characterService, effectsService).result == 0) {
                        if (characterService.get_AppliedConditions(creature, "Unconscious", "0 Hit Points").length == 0 && characterService.get_AppliedConditions(creature, "Unconscious", "Dying").length == 0) {
                            characterService.add_Condition(creature, Object.assign(new ConditionGain, { name: "Unconscious", source: "0 Hit Points" }).recast(), false);
                        }
                    }
                }
            }
            this.refreshService.set_ToChange(creature.type, "health");
        }

        //End the condition's activity if there is one and it is active.
        if (!taken && gain.source) {
            let activityGains = characterService.get_OwnedActivities(creature, creature.level, true).filter(activityGain => activityGain.active && activityGain.name == gain.source);
            if (activityGains.length) {
                let activityGain: ActivityGain;
                //Try to find the activity with the same duration as the condition. If there isn't one, end the first one.
                if (activityGains.length > 1) {
                    activityGain = activityGains.find(activityGain => activityGain.duration == gain.duration)
                }
                if (!activityGain) {
                    activityGain = activityGains[0];
                }
                let activity = characterService.activitiesService.get_Activities(activityGain.name)[0];
                if (activity) {
                    characterService.activitiesService.activate_Activity(creature, "", characterService, characterService.conditionsService, characterService.itemsService, characterService.spellsService, activityGain, activity, false, false);
                }
            }
        }

        //End the condition's spell or activity if there is one and it is active.
        if (!taken && gain.sourceGainID) {
            let character = characterService.get_Character();
            //If no other conditions have this ConditionGain's sourceGainID, find the matching Spellgain or ActivityGain and disable it.
            if (!characterService.get_AppliedConditions(character).some(conditionGain => conditionGain !== gain && conditionGain.sourceGainID == gain.sourceGainID)) {
                character.get_SpellsTaken(characterService, 0, 20).filter(taken => taken.gain.id == gain.sourceGainID && taken.gain.active).forEach(taken => {
                    //
                    let spell = characterService.spellsService.get_Spells(taken.gain.name)[0];
                    if (spell) {
                        characterService.spellsService.process_Spell(character, taken.gain.selectedTarget, characterService, itemsService, characterService.conditionsService, null, null, taken.gain, spell, 0, false, false)
                    }
                    this.refreshService.set_ToChange("Character", "spellbook");
                });
                characterService.get_OwnedActivities(creature, 20, true).filter(activityGain => activityGain.id == gain.sourceGainID && activityGain.active).forEach(activityGain => {
                    //Tick down the duration and the cooldown.
                    let activity: Activity | ItemActivity = activityGain.get_OriginalActivity(characterService.activitiesService);
                    if (activity) {
                        characterService.activitiesService.activate_Activity(creature, activityGain.selectedTarget, characterService, characterService.conditionsService, itemsService, characterService.spellsService, activityGain, activity, false, false)
                    }
                    this.refreshService.set_ToChange("Character", "activities");
                });
            }
        }

        //Disable the condition's hints if deactivated.
        condition.hints.forEach(hint => {
            hint.active = hint.active2 = hint.active3 = hint.active4 = hint.active5 = false;
        })

        //Leave cover behind shield if the Cover condition is removed (not for Familiars).
        if (!(creature instanceof Familiar) && condition.name == "Cover" && (!taken || (gain.choice != "Greater"))) {
            characterService.defenseService.get_EquippedShield(creature as Character | AnimalCompanion).forEach(shield => {
                if (shield.takingCover) {
                    shield.takingCover = false;
                    this.refreshService.set_ToChange(creature.type, "defense");
                }
            })
        }

        //Update Health when Wounded changes.
        if (condition.name == "Wounded") {
            this.refreshService.set_ToChange(creature.type, "health");
        }

        //Update Attacks when Hunt Prey or Flurry changes.
        if (["Hunt Prey", "Hunt Prey: Flurry"].includes(condition.name)) {
            this.refreshService.set_ToChange(creature.type, "attacks");
        }

        //Update Attacks if attack restrictions apply.
        if (condition.attackRestrictions.length) {
            this.refreshService.set_ToChange(creature.type, "attacks");
        }

        //Update Defense if Defense conditions are changed.
        if (gain.source == "Defense") {
            this.refreshService.set_ToChange(creature.type, "defense");
        }

        //Update Time and Health if the condition needs attention.
        if (gain.durationIsInstant) {
            this.refreshService.set_ToChange(creature.type, "time");
            this.refreshService.set_ToChange(creature.type, "health");
        }

        //Show a notification if a new condition has no duration and did nothing, because it will be removed in the next cycle.
        if (taken && !conditionDidSomething && gain.duration == 0) {
            characterService.toastService.show("The condition <strong>" + gain.name + "</strong> was removed because it had no duration and no effect.")
        }

    }

    add_ConditionItem(creature: Character | AnimalCompanion, characterService: CharacterService, itemsService: ItemsService, gainItem: ItemGain, condition: Condition) {
        let newItem: Item = itemsService.get_CleanItems()[gainItem.type.toLowerCase()].find((item: Item) => item.name.toLowerCase() == gainItem.name.toLowerCase());
        if (newItem) {
            if (newItem.can_Stack()) {
                //For consumables, add the appropriate amount and don't track them.
                characterService.grant_InventoryItem(creature, creature.inventories[0], newItem, false, false, false, gainItem.amount);
            } else {
                //For equipment, track the ID of the newly added item for removal.
                let grantedItem = characterService.grant_InventoryItem(creature, creature.inventories[0], newItem, false, false, true);
                gainItem.id = grantedItem.id;
                if (grantedItem.get_Name) {
                    grantedItem.grantedBy = "(Granted by " + condition.name + ")";
                };
            }
        }
    }

    remove_ConditionItem(creature: Character | AnimalCompanion, characterService: CharacterService, itemsService: ItemsService, gainItem: ItemGain) {
        if (itemsService.get_Items()[gainItem.type.toLowerCase()].find((item: Item) => item.name.toLowerCase() == gainItem.name.toLowerCase())?.can_Stack()) {
            let items: Item[] = creature.inventories[0][gainItem.type.toLowerCase()].filter((item: Item) => item.name == gainItem.name);
            //For consumables, remove the same amount as previously given. This is not ideal, but you can easily add more in the inventory.
            if (items.length) {
                characterService.drop_InventoryItem(creature, creature.inventories[0], items[0], false, true, true, gainItem.amount);
            }
        } else {
            //For equipment, we have saved the ID and remove exactly that item.
            let item: Item = creature.inventories[0][gainItem.type.toLowerCase()].find((item: Item) => item.id == gainItem.id);
            if (item) {
                if ((item as Equipment).gainInventory && (item as Equipment).gainInventory.length) {
                    //If a temporary container is destroyed, return all contained items to the main inventory.
                    creature.inventories.filter(inv => inv.itemId == item.id).forEach(inv => {
                        inv.allItems().forEach(invItem => {
                            itemsService.move_InventoryItemLocally(creature, invItem, creature.inventories[0], inv, characterService);
                        });
                    });
                }
                characterService.drop_InventoryItem(creature, creature.inventories[0], item, false, true, true);
            }
            gainItem.id = "";
        }
    }

    generate_ItemConditions(creature: Creature, services: { characterService: CharacterService, effectsService: EffectsService }): void {
        //Calculate whether any items should grant a condition under the given circumstances and add or remove conditions accordingly.
        //Conditions caused by equipment are not calculated for Familiars (who don't have an inventory) or in manual mode.
        if (!(creature instanceof Familiar) && !services.characterService.get_ManualMode()) {
            let speedRune: boolean = false;
            let enfeebledRune: boolean = false;
            creature.inventories.forEach(inventory => {
                inventory.allEquipment().forEach(item => {
                    item.propertyRunes.forEach((rune: Rune) => {
                        if (rune.name == "Speed" && (item.can_Invest() ? item.invested : item.equipped)) {
                            speedRune = true;
                        }
                        if (rune instanceof WeaponRune && rune.alignmentPenalty) {
                            if (services.characterService.get_Character().alignment.toLowerCase().includes(rune.alignmentPenalty.toLowerCase())) {
                                enfeebledRune = true;
                            }
                        }
                    });
                    item.oilsApplied.forEach(oil => {
                        if (oil.runeEffect && oil.runeEffect.name == "Speed" && (item.equipped || (item.can_Invest() && item.invested))) {
                            speedRune = true;
                        }
                        if (oil.runeEffect && oil.runeEffect.alignmentPenalty) {
                            if (services.characterService.get_Character().alignment.toLowerCase().includes(oil.runeEffect.alignmentPenalty.toLowerCase())) {
                                enfeebledRune = true;
                            }
                        }
                    });
                });
            })
            function get_HaveCondition(name: string, source: string) {
                return (services.characterService.get_AppliedConditions(creature, name, source, true).length != 0)
            }
            function add_Condition(name: string, value: number, source: string) {
                services.characterService.add_Condition(creature, Object.assign(new ConditionGain, { name: name, value: value, source: source, apply: true }), false)
            }
            function remove_Condition(name: string, value: number, source: string) {
                services.characterService.remove_Condition(creature, Object.assign(new ConditionGain, { name: name, value: value, source: source, apply: true }), false)
            }
            if (creature.inventories[0].weapons.find(weapon => weapon.large && weapon.equipped) && !get_HaveCondition("Clumsy", "Large Weapon")) {
                add_Condition("Clumsy", 1, "Large Weapon");
            } else if (!creature.inventories[0].weapons.find(weapon => weapon.large && weapon.equipped) && get_HaveCondition("Clumsy", "Large Weapon")) {
                remove_Condition("Clumsy", 1, "Large Weapon");
            }
            if (speedRune && !get_HaveCondition("Quickened", "Speed Rune")) {
                add_Condition("Quickened", 0, "Speed Rune");
            } else if (!speedRune && get_HaveCondition("Quickened", "Speed Rune")) {
                remove_Condition("Quickened", 0, "Speed Rune");
            }
            if (enfeebledRune && !get_HaveCondition("Enfeebled", "Alignment Rune")) {
                add_Condition("Enfeebled", 2, "Alignment Rune");
            } else if (!enfeebledRune && get_HaveCondition("Enfeebled", "Alignment Rune")) {
                remove_Condition("Enfeebled", 2, "Alignment Rune");
            }
            //Any items that grant permanent conditions need to check if these are still applicable. 
            creature.inventories[0].allEquipment().filter(item => item.gainConditions.length).forEach(item => {
                item.gainConditions.forEach(gain => {
                    //We test alignmentFilter here, but activationPrerequisite is only tested if the condition exists and might need to be removed.
                    //This is because add_Condition includes its own test of activationPrerequisite.
                    let activate = false;
                    if (item.can_Invest() ? item.invested : item.equipped) {
                        if (gain.alignmentFilter && creature instanceof Character) {
                            if (gain.alignmentFilter.includes("!") ? !creature.alignment.toLowerCase().includes(gain.alignmentFilter.toLowerCase().replace("!", "")) : creature.alignment.toLowerCase().includes(gain.alignmentFilter.toLowerCase())) {
                                activate = true;
                            }
                        } else {
                            activate = true;
                        }
                    }
                    if (services.characterService.get_AppliedConditions(creature, gain.name, gain.source, true).length) {
                        if (!activate) {
                            services.characterService.remove_Condition(creature, gain, false);
                        } else {
                            if (gain.activationPrerequisite) {
                                let testResult = this.evaluationService.get_ValueFromFormula(gain.activationPrerequisite, { characterService: services.characterService, effectsService: services.effectsService }, { creature: creature, object: gain });
                                if (testResult == "0" || !(parseInt(testResult as string))) {
                                    services.characterService.remove_Condition(creature, gain, false);
                                }
                            }
                        }
                    } else {
                        if (activate) {
                            services.characterService.add_Condition(creature, gain, false);
                        }
                    }
                })
            });
        }
    }

    generate_BulkConditions(creature: Creature, services: { characterService: CharacterService, effectsService: EffectsService }): void {
        //Calculate whether the creature is encumbered and add or remove the condition.
        //Encumbered conditions are not calculated for Familiars (who don't have an inventory) or in manual mode.
        if (!(creature instanceof Familiar) && !services.characterService.get_ManualMode()) {
            let bulk = creature.bulk;
            let calculatedBulk = bulk.calculate((creature as Character | AnimalCompanion), services.characterService, services.effectsService);
            if (calculatedBulk.current.value > calculatedBulk.encumbered.value && services.characterService.get_AppliedConditions(creature, "Encumbered", "Bulk").length == 0) {
                services.characterService.add_Condition(creature, Object.assign(new ConditionGain, { name: "Encumbered", value: 0, source: "Bulk", apply: true }), true)
            }
            if (calculatedBulk.current.value <= calculatedBulk.encumbered.value && services.characterService.get_AppliedConditions(creature, "Encumbered", "Bulk").length > 0) {
                services.characterService.remove_Condition(creature, Object.assign(new ConditionGain, { name: "Encumbered", value: 0, source: "Bulk", apply: true }), true)
            }
        }
    }

    tick_Conditions(creature: Creature, turns: number = 10, yourTurn: number, characterService: CharacterService, itemsService: ItemsService) {
        const creatureConditions = creature.conditions;
        const conditionsService = this;
        //If any conditions are currently stopping time, these are the only ones processed.
        function StoppingTime(gain: ConditionGain): boolean {
            return gain.duration && conditionsService.get_ConditionFromName(gain.name).get_IsStoppingTime(gain);
        }
        const timeStoppingConditions = creatureConditions.filter(gain => StoppingTime(gain));
        const includedConditions = timeStoppingConditions.length ? timeStoppingConditions : creatureConditions;
        const excludedConditions = timeStoppingConditions.length ? creatureConditions.filter(gain => !includedConditions.includes(gain)) : [];
        //If for any reason the maxDuration for a condition is lower than the duration, this is corrected here.
        includedConditions.filter(gain => gain.maxDuration > 0 && gain.maxDuration < gain.duration).forEach(gain => {
            gain.maxDuration = gain.duration;
        });
        while (turns > 0) {
            function SortByShortestDuration(conditions: ConditionGain[]): ConditionGain[] {
                return conditions.sort(function (a, b) {
                    // Sort conditions by the length of either their nextstage or their duration, whichever is shorter.
                    let compareA: number[] = [];
                    if (a.nextStage > 0) { compareA.push(a.nextStage); }
                    if (a.duration > 0) { compareA.push(a.duration); }
                    let compareB: number[] = [];
                    if (b.nextStage > 0) { compareB.push(b.nextStage); }
                    if (b.duration > 0) { compareB.push(b.duration); }
                    if (!compareA.length) {
                        return 1;
                    } else if (!compareB.length) {
                        return -1;
                    } else {
                        return Math.min(...compareA) - Math.min(...compareB)
                    }
                })
            }
            if (includedConditions.some(gain => (gain.duration > 0 && gain.choice != "Onset") || gain.nextStage > 0) || includedConditions.some(gain => gain.decreasingValue && !gain.valueLockedByParent && !(gain.value == 1 && gain.lockedByParent))) {
                //Get the first condition that will run out.
                let first: number;
                //If any condition has a decreasing Value per round, step 5 (to the end of the Turn) if it is your Turn or 10 (1 turn) at most
                //Otherwise find the next step from either the duration or the nextStage of the first gain of the sorted list.
                if (includedConditions.some(gain => gain.value && gain.decreasingValue && !gain.valueLockedByParent && !(gain.value == 1 && gain.lockedByParent))) {
                    if (yourTurn == 5) {
                        first = 5;
                    } else {
                        first = 10;
                    }
                } else {
                    if (includedConditions.some(gain => (gain.duration > 0 && gain.choice != "Onset") || gain.nextStage > 0)) {
                        const firstObject: ConditionGain = SortByShortestDuration(includedConditions).find(gain => gain.duration > 0 || gain.nextStage > 0);
                        let durations: number[] = [];
                        if (firstObject.duration > 0 && firstObject.choice != "Onset") { durations.push(firstObject.duration); }
                        if (firstObject.nextStage > 0) { durations.push(firstObject.nextStage); }
                        first = Math.min(...durations);
                    }
                }
                //Either step to the next condition to run out or decrease their value or step the given turns, whichever comes first.
                const step = Math.min(first, turns);
                includedConditions.filter(gain => gain.duration > 0 && gain.choice != "Onset").forEach(gain => {
                    gain.duration -= step;
                });
                includedConditions.filter(gain => gain.nextStage > 0 && gain.duration > 0).forEach(gain => {
                    gain.nextStage -= step;
                    if (gain.nextStage <= 0) {
                        //If a condition's nextStage expires, mark it as needing attention, or move to the next stage if automaticStages is on.
                        const condition = this.get_ConditionFromName(gain.name);
                        if (condition.automaticStages) {
                            this.change_ConditionStage(creature, gain, condition, condition.get_Choices(characterService, gain.source != "Manual", gain.heightened), 1, characterService, itemsService);
                        } else {
                            gain.nextStage = -1;
                        }
                    }
                });
                //If any conditions have their value decreasing, do this now.
                if ((yourTurn == 5 && step == 5) || (yourTurn == 0 && step == 10)) {
                    includedConditions.filter(gain => gain.decreasingValue && !gain.valueLockedByParent && !(gain.value == 1 && gain.lockedByParent)).forEach(gain => {
                        gain.value--;
                    });
                }
                turns -= step;
            } else {
                turns = 0;
            }
        }
        creature.conditions = includedConditions.concat(excludedConditions);
    }

    rest(creature: Creature, characterService: CharacterService) {
        creature.conditions.filter(gain => gain.durationIsUntilRest).forEach(gain => {
            gain.duration = 0;
        });

        //After resting with full HP, the Wounded condition is removed.
        if (characterService.get_Health(creature).damage == 0) {
            creature.conditions.filter(gain => gain.name == "Wounded").forEach(gain => characterService.remove_Condition(creature, gain, false));
        }
        //If Verdant Metamorphosis is active, remove the following non-permanent conditions after resting: Drained, Enfeebled, Clumsy, Stupefied and all poisons and diseases of 19th level or lower. 
        if (characterService.effectsService.get_EffectsOnThis(creature, "Verdant Metamorphosis").length) {
            creature.conditions.filter(gain => gain.duration != -1 && !gain.lockedByParent && ["Drained", "Enfeebled", "Clumsy", "Stupefied"].includes(gain.name)).forEach(gain => { gain.value = -1 })
            creature.conditions.filter(gain => gain.duration != -1 && !gain.lockedByParent && gain.value != -1 && this.get_Conditions(gain.name)?.[0]?.type == "afflictions").forEach(gain => {
                if (!characterService.itemsService.get_CleanItems().alchemicalpoisons.some(poison => gain.name.includes(poison.name) && poison.level > 19)) {
                    gain.value = -1;
                }
            })
        }
        //After resting, the Fatigued condition is removed (unless locked by its parent), and the value of Doomed and Drained is reduced (unless locked by its parent).
        creature.conditions.filter(gain => gain.name == "Fatigued" && !gain.valueLockedByParent).forEach(gain => characterService.remove_Condition(creature, gain), false);
        creature.conditions.filter(gain => gain.name == "Doomed" && !gain.valueLockedByParent && !(gain.lockedByParent && gain.value == 1)).forEach(gain => { gain.value -= 1 });
        creature.conditions.filter(gain => gain.name == "Drained" && !gain.valueLockedByParent && !(gain.lockedByParent && gain.value == 1)).forEach(gain => {
            gain.value -= 1;
            if (gain.apply) {
                creature.health.damage += creature.level;
            }
            if (
                //If you have Fast Recovery or have activated the effect of Forge-Day's Rest, reduce the value by 2 instead of 1.
                (
                    creature.type == "Character" &&
                    characterService.get_CharacterFeatsTaken(1, creature.level, "Fast Recovery").length
                ) ||
                characterService.featsService.get_Feats([], "Forge-Day's Rest")?.[0]?.hints.some(hint => hint.active)
            ) {
                gain.value -= 1;
                if (gain.apply) {
                    creature.health.damage += creature.level;
                }
            }
        });

        //If an effect with "X After Rest" is active, the condition is added.
        characterService.effectsService.get_Effects(creature.type).all.filter(effect => !effect.ignored && effect.apply && effect.target.toLowerCase().includes(" after rest")).forEach(effect => {
            let regex = new RegExp(" after rest", "ig");
            let conditionName = effect.target.replace(regex, "");
            //Only add real conditions.
            if (this.get_Conditions(conditionName).length) {
                //Turn effect into condition:
                //- no value or setValue (i.e. only toggle) means the condition is added without a value.
                //- setValue means the condition has a value and is added with that value.
                //- value means the value is added to an existing condition with the same name.
                if (!creature.conditions.some(gain => gain.name == conditionName && gain.source == effect.source) || effect.value) {
                    let newCondition = new ConditionGain();
                    newCondition.name = conditionName;
                    newCondition.duration = -1;
                    if (effect.setValue) {
                        newCondition.value = parseInt(effect.setValue);
                    }
                    if (parseInt(effect.value)) {
                        newCondition.addValue = parseInt(effect.value);
                    }
                    newCondition.source = effect.source;
                    characterService.add_Condition(creature, newCondition, false);
                    characterService.toastService.show("Added <strong>" + conditionName + "</strong> condition to <strong>" + (creature.name || creature.type) +
                        "</strong> after resting (caused by <strong>" + effect.source + "</strong>)");
                };
            }
        });

    }

    refocus(creature: Creature, characterService: CharacterService) {
        creature.conditions.filter(gain => gain.durationIsUntilRefocus).forEach(gain => {
            gain.duration = 0;
        });
    }

    change_ConditionChoice(creature: Creature, gain: ConditionGain, condition: Condition, oldChoice: string, characterService: CharacterService, itemsService: ItemsService) {
        let conditionDidSomething: boolean = false;
        if (creature.type != "Familiar" && oldChoice != gain.choice) {
            //Remove any items that were granted by the previous choice.
            if (oldChoice) {
                gain.gainItems.filter(gainItem => gainItem.conditionChoiceFilter.includes(oldChoice)).forEach(gainItem => {
                    this.remove_ConditionItem(creature as Character | AnimalCompanion, characterService, itemsService, gainItem);
                });
            }
            //Add any items that are granted by the new choice.
            if (gain.choice) {
                gain.gainItems.filter(gainItem => gainItem.conditionChoiceFilter.includes(gain.choice)).forEach(gainItem => {
                    conditionDidSomething = true;
                    this.add_ConditionItem(creature as Character | AnimalCompanion, characterService, itemsService, gainItem, condition);
                });
            }
        }
        if (oldChoice != gain.choice) {
            //Remove any conditions that were granted by the previous choice, unless they are persistent (but still remove them if they are ignorePersistentAtChoiceChange).
            if (oldChoice) {
                condition.gainConditions.filter(extraCondition => extraCondition.conditionChoiceFilter.includes(oldChoice)).forEach(extraCondition => {
                    let addCondition: ConditionGain = Object.assign<ConditionGain, ConditionGain>(new ConditionGain(), JSON.parse(JSON.stringify(extraCondition))).recast();
                    addCondition.source = gain.name;
                    let originalCondition = characterService.get_Conditions(addCondition.name)[0];
                    if (!(addCondition.persistent || originalCondition?.persistent) || addCondition.ignorePersistentAtChoiceChange) {
                        characterService.remove_Condition(creature, addCondition, false, false, true, true, true);
                    }
                })
            }
            //Add any conditions that are granted by the new choice.
            if (gain.choice) {
                condition.gainConditions.filter(extraCondition => extraCondition.conditionChoiceFilter.includes(gain.choice)).forEach(extraCondition => {
                    conditionDidSomething = true;
                    let addCondition: ConditionGain = Object.assign<ConditionGain, ConditionGain>(new ConditionGain, JSON.parse(JSON.stringify(extraCondition))).recast();
                    if (!addCondition.heightened) {
                        addCondition.heightened = gain.heightened;
                    }
                    addCondition.source = gain.name;
                    addCondition.parentID = gain.id;
                    addCondition.apply = true;
                    characterService.add_Condition(creature, addCondition, false, gain);
                })
            }
            //If the current duration is locking the time buttons, refresh the time bar after the change.
            if (gain.durationIsInstant || gain.nextStage) {
                this.refreshService.set_ToChange("Character", "time");
            }
            //If the current duration is the default duration of the previous choice, then set the default duration for the current choice. This lets users change the choice directly after adding the condition if they made a mistake.
            if (gain.duration == condition.get_DefaultDuration(oldChoice, gain.heightened).duration) {
                gain.duration = condition.get_DefaultDuration(gain.choice, gain.heightened).duration;
                //Also set the maxDuration to the new value as we have effectively restarted the counter.
                gain.maxDuration = gain.duration;
            } else if (gain.duration == condition.get_DefaultDuration(oldChoice, gain.heightened).duration + 2) {
                //If the current duration is the default duration of the previous choice PLUS 2, then set the default duration for the current choice, plus 2.
                //Only apply if the duration is a multiple of half turns, not for special durations like 1.
                let addition = 0;
                if (gain.duration >= 0 && gain.duration % 5 == 0) {
                    addition = 2;
                }
                gain.duration = condition.get_DefaultDuration(gain.choice, gain.heightened).duration + addition;
                //Also set the maxDuration to the new value as we have effectively restarted the counter.
                gain.maxDuration = gain.duration;
            }
            //If the new duration is locking the time buttons, refresh the time bar after the change.
            if (gain.durationIsInstant) {
                this.refreshService.set_ToChange("Character", "time");
            }
            //Show a notification if the new condition has no duration and did nothing, because it will be removed in the next cycle.
            if (!conditionDidSomething && gain.duration == 0) {
                characterService.toastService.show("The condition <strong>" + gain.name + "</strong> was removed because it had no duration and no effect.")
            }

        }
        this.refreshService.set_ToChange(creature.type, "effects");
        if (condition.attackRestrictions.length) {
            this.refreshService.set_ToChange(creature.type, "attacks");
        }
        if (condition.senses.length) {
            this.refreshService.set_ToChange(creature.type, "skills");
        }
        gain.showChoices = false;
        this.refreshService.set_HintsToChange(creature, condition.hints, { characterService: characterService });
    }

    change_ConditionStage(creature: Creature, gain: ConditionGain, condition: Condition, choices: string[], change: number, characterService: CharacterService, itemsService: ItemsService) {
        if (change == 0) {
            //If no change, the condition remains, but the onset is reset.
            gain.nextStage = condition.get_ChoiceNextStage(gain.choice);
            this.refreshService.set_ToChange(creature.type, "time");
            this.refreshService.set_ToChange(creature.type, "health");
            this.refreshService.set_ToChange(creature.type, "effects");
        } else {
            let newIndex = choices.indexOf(gain.choice) + change;
            if (condition.circularStages) {
                while (newIndex < 0) {
                    newIndex += choices.length;
                }
                newIndex %= choices.length;
            }
            const newChoice = choices[newIndex];
            if (newChoice) {
                gain.nextStage = condition.get_ChoiceNextStage(newChoice);
                if (gain.nextStage) {
                    this.refreshService.set_ToChange(creature.type, "time");
                    this.refreshService.set_ToChange(creature.type, "health");
                }
                let oldChoice = gain.choice;
                gain.choice = newChoice;
                this.change_ConditionChoice(creature, gain, condition, oldChoice, characterService, itemsService);
            }
        }
    }

    still_loading() {
        return (this.loading);
    }

    initialize() {
        //Initialize conditions only once, but cleanup active effects everytime thereafter.
        if (!this.conditions.length) {
            this.loading = true;
            this.load_Conditions();
            this.conditionsMap.clear();
            this.conditions.forEach(condition => {
                this.conditionsMap.set(condition.name.toLowerCase(), condition);
            })
            this.loading = false;
        } else {
            //Disable any active hint effects when loading a character.
            this.conditions.forEach(condition => {
                condition.hints.forEach(hint => {
                    hint.active = false;
                })
            })
        }
    }

    load_Conditions() {
        this.conditions = [];
        let data = this.extensionsService.extend(json_conditions, "conditions");
        Object.keys(data).forEach(key => {
            this.conditions.push(...data[key].map((obj: Condition) => Object.assign(new Condition(), obj).recast()));
        });
        this.conditions = this.extensionsService.cleanup_Duplicates(this.conditions, "name", "conditions");
    }

}