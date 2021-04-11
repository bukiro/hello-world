import { Injectable } from '@angular/core';
import { Spell } from './Spell';
import { CharacterService } from './character.service';
import { ItemsService } from './items.service';
import { SpellGain } from './SpellGain';
import { ConditionGain } from './ConditionGain';
import { Item } from './Item';
import { ItemGain } from './ItemGain';
import { AnimalCompanion } from './AnimalCompanion';
import { Character } from './Character';
import { SpellCasting } from './SpellCasting';
import { ConditionsService } from './conditions.service';
import * as json_spells from '../assets/json/spells';
import { Creature } from './Creature';
import { SpellChoice } from './SpellChoice';

@Injectable({
    providedIn: 'root'
})
export class SpellsService {

    private spells: Spell[] = [];
    private loading: boolean = false;

    constructor() { }

    get_Spells(name: string = "", type: string = "", tradition: string = "") {
        if (!this.still_loading()) {
            return this.spells.filter(spell =>
                (spell.name.toLowerCase() == (name.toLowerCase()) || name == "") &&
                (spell.traits.includes(type) || type == "") &&
                (spell.traditions.includes(tradition) || tradition == "")
            );
        } else {
            return [new Spell()];
        }
    }

    get_DynamicSpellLevel(casting: SpellCasting, choice: SpellChoice, characterService: CharacterService) {
        //highestSpellLevel is used in the eval() process.
        let highestSpellLevel = 1;
        let Character = characterService.get_Character();
        function Skill_Level(name: string) {
            return characterService.get_Skills(Character, name)[0]?.level(Character, characterService);
        }
        //Get the available spell level of this casting. This is the highest spell level of the spell choices that are available at your character level (and don't have a dynamic level).
        highestSpellLevel = Math.max(...casting.spellChoices.filter(spellChoice => spellChoice.charLevelAvailable <= Character.level).map(spellChoice => spellChoice.level));
        try {
            return parseInt(eval(choice.dynamicLevel));
        } catch (e) {
            console.log("Error parsing spell level requirement (" + choice.dynamicLevel + "): " + e)
            return 1;
        }
    }

    process_Spell(creature: Creature, target: string = "", characterService: CharacterService, itemsService: ItemsService, conditionsService: ConditionsService, casting: SpellCasting, gain: SpellGain, spell: Spell, level: number, activated: boolean, manual: boolean = false, changeAfter: boolean = true) {

        //Cantrips and Focus spells are automatically heightened to your maximum available spell level.
        //If a spell is cast with a lower level than its minimum, the level is raised to the minimum.
        let spellLevel: number = spell.get_EffectiveSpellLevel(creature, level, characterService, characterService.effectsService);

        //If this spell was cast by an activity, it may have a specified duration. Keep that here before the duration is changed to keep the spell active (or not).
        let customDuration: number = 0;
        if (activated && gain.duration) {
            customDuration = gain.duration;
        }

        if (activated) {
            //Start cooldown
            if (gain.cooldown && !gain.activeCooldown) {
                gain.activeCooldown = gain.cooldown;
                characterService.set_ToChange(creature.type, "spellbook");
            }
        }

        if (activated && spell.sustained) {
            gain.active = true;
            if (spell.sustained) {
                gain.duration = customDuration || spell.sustained;
                characterService.set_ToChange(creature.type, "spellbook");
            }
            gain.target = target;
        } else {
            gain.active = false;
            gain.duration = 0;
            gain.target = "";
        }

        //Find out if target was given. If no target is set, most effects will not be applied.
        let targetCreature: Creature | null = null;
        switch (target) {
            case "Character":
                targetCreature = characterService.get_Character();
                break;
            case "Companion":
                targetCreature = characterService.get_Companion();
                break;
            case "Familiar":
                targetCreature = characterService.get_Familiar();
                break;
        }

        //Apply conditions.
        //Remove conditions only if the spell was deactivated manually, i.e. if you want the condition to end.
        //If the spell ends by the time running out, the condition will also have a timer and run out by itself.
        //This allows us to manually change the duration for a condition and keep it running when the spell runs out
        //  (because it's much more difficult to change the spell duration -and- the condition duration).
        if (spell.get_HeightenedConditions(spellLevel)) {
            if (activated) {
                let choicesIndex = 0;
                spell.get_HeightenedConditions(spellLevel).forEach(conditionGain => {
                    let newConditionGain = Object.assign(new ConditionGain(), conditionGain);
                    let condition = conditionsService.get_Conditions(conditionGain.name)[0]
                    //If this condition has choices, and the gain has choices prepared, apply the choice from the gain.
                    // The order of gain.choices maps directly onto the order of the spell conditions that have choices.
                    if (gain.choices.length >= choicesIndex - 1) {
                        if (condition?.get_Choices(characterService, true, spellLevel).length && condition.$choices.includes(gain.choices[choicesIndex])) {
                            newConditionGain.choice = gain.choices[choicesIndex];
                            choicesIndex++;
                        }
                    }
                    //If there is a choiceBySubType value, and you have a feat with superType == choiceBySubType, set the choice to that feat's subType as long as it's a valid choice for the condition. This overrides any manual choice.
                    if (newConditionGain.choiceBySubType) {
                        let subType = (characterService.get_FeatsAndFeatures(newConditionGain.choiceBySubType, "", true, true).find(feat => feat.superType == newConditionGain.choiceBySubType && feat.have(creature, characterService, creature.level, false)));
                        if (subType && condition.choices.map(choice => choice.name).includes(subType.subType)) {
                            newConditionGain.choice = subType.subType;
                        }
                    }
                    //Pass the spell level in case that condition effects change with level
                    newConditionGain.heightened = spellLevel;
                    //Pass the spellcasting ability in case the condition needs to use the modifier
                    if (casting) {
                        newConditionGain.spellCastingAbility = casting.ability;
                    }
                    newConditionGain.spellSource = gain?.source || "";
                    newConditionGain.spellGainID = gain?.id || "";
                    //If this spell was cast by an activity, it may have a specified duration. Apply that here.
                    if (customDuration) {
                        newConditionGain.duration = customDuration;
                    }
                    let conditionTarget = targetCreature;
                    if (conditionGain.targetFilter == "caster") {
                        conditionTarget = creature;
                    }
                    //Form Control changes the duration of the Wild Shape spell and the condition in various ways.
                    if (spell.name == "Wild Shape") {
                        //If Form Control is activated,
                        // 1. The duration is permanent if you have Perfect Form Control
                        // 2. Otherwise, the duration is 1 hour
                        if (conditionsService.get_AppliedConditions(creature, characterService, creature.conditions, true).some(gain => gain.name == "Form Control")) {
                            if (creature.type == "Character" && (creature as Character).get_FeatsTaken(1, creature.level, "Perfect Form Control").length) {
                                gain.duration = -1;
                                newConditionGain.duration = gain.duration;
                            } else {
                                gain.duration = 6000;
                                newConditionGain.duration = gain.duration;
                            }
                        //Without Form Control, Pest Form is 10 minutes, and every other form remains at 1 minute.
                        } else {
                            if (newConditionGain.choice == "Pest Form") {
                                gain.duration = 1000;
                                newConditionGain.duration = gain.duration;
                            }
                        }
                        //If you have Insect Shape and use wild shape to polymorph into the non-flying insect form listed in pest form, the duration is 24 hours instead of 10 minutes.
                        if (gain.duration != -1 && creature.type == "Character" && (creature as Character).get_FeatsTaken(1, creature.level, "Insect Shape").length) {
                            if (newConditionGain.choice == "Pest Form (non-flying insect)") {
                                gain.duration = 144000;
                                newConditionGain.duration = gain.duration;
                            }
                        }
                    }
                    if (conditionTarget) {
                        characterService.add_Condition(conditionTarget, newConditionGain, false);
                    }
                });
            } else if (manual) {
                spell.get_HeightenedConditions(spellLevel).forEach(conditionGain => {
                    let conditionTarget = targetCreature;
                    if (conditionGain.targetFilter == "caster") {
                        conditionTarget = creature;
                    }
                    if (conditionTarget) {
                        characterService.get_AppliedConditions(conditionTarget, conditionGain.name)
                            .filter(existingConditionGain => existingConditionGain.source == conditionGain.source)
                            .forEach(existingConditionGain => {
                                characterService.remove_Condition(conditionTarget, existingConditionGain, false);
                            });
                    }
                })
            }
        }

        if (changeAfter) {
            characterService.process_ToChange();
        }
    }

    rest(character: Character, characterService: CharacterService) {
        //Get all owned spell gains that have a cooldown active.
        //If its cooldown is exactly one day or until rest (-2), the spell gain's cooldown is reset.
        character.get_SpellsTaken(characterService, 0, 20).filter(taken => taken.gain.activeCooldown).forEach(taken => {
            if ([-2, 144000].includes(taken.gain.cooldown)) {
                taken.gain.activeCooldown = 0;
            }
        });
        character.class.spellCasting.filter(casting => casting.castingType == "Prepared").forEach(casting => {
            casting.spellChoices.forEach(choice => {
                choice.spells.forEach(gain => {
                    gain.prepared = true;
                });
            });
        });
        character.class.spellCasting.filter(casting => casting.className == "Sorcerer" && casting.castingType == "Spontaneous").forEach(casting => {
            casting.spellChoices.filter(choice => choice.source == "Feat: Occult Evolution").forEach(choice => {
                choice.spells.length = 0;
                characterService.set_ToChange("Character", "spellchoices");
            })
        })
        characterService.set_ToChange("Character", "spellbook");
    }

    refocus(character: Character, characterService: CharacterService) {
        //Get all owned spell gains that have a cooldown active.
        //If its cooldown is until refocus (-3), the spell gain's cooldown is reset.
        character.get_SpellsTaken(characterService, 0, 20).filter(taken => taken.gain.activeCooldown).forEach(taken => {
            if (taken.gain.cooldown == -3) {
                taken.gain.activeCooldown = 0;
            }
        });
        characterService.set_ToChange("Character", "spellbook");
    }

    tick_Spells(character: Character, characterService: CharacterService, itemsService: ItemsService, conditionsService: ConditionsService, turns: number = 10) {
        character.get_SpellsTaken(characterService, 0, 20).filter(taken => taken.gain.activeCooldown || taken.gain.duration).forEach(taken => {
            //Tick down the duration and the cooldown.
            if (taken.gain.duration > 0) {
                taken.gain.duration = Math.max(taken.gain.duration - turns, 0)
                if (taken.gain.duration == 0) {
                    let spell: Spell = this.get_Spells(taken.gain.name)[0];
                    if (spell) {
                        this.process_Spell(character, taken.gain.target, characterService, itemsService, conditionsService, null, taken.gain, spell, 0, false, false)
                    }
                }
            }
            characterService.set_ToChange("Character", "spellbook");
            if (taken.gain.activeCooldown) {
                taken.gain.activeCooldown = Math.max(taken.gain.activeCooldown - turns, 0)
            }
        });
    }

    still_loading() {
        return (this.loading);
    }

    initialize() {
        if (!this.spells.length) {
            this.loading = true;
            this.load_Spells();
            this.loading = false;
        }
    }

    load_Spells() {
        this.spells = [];
        Object.keys(json_spells).forEach(key => {
            this.spells.push(...json_spells[key].map(obj => Object.assign(new Spell(), obj)));
        });
    }

}