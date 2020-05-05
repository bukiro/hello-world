import { CharacterService } from './character.service';
import { EffectsService } from './effects.service';
import { Character } from './Character';
import { AnimalCompanion } from './AnimalCompanion';
import { Familiar } from './Familiar';

export class Speed {
    public readonly _className = this.constructor.name;
    constructor (
        public name: string = ""
    ) {};
    effects(creature: Character|AnimalCompanion|Familiar, effectsService: EffectsService) {
        return effectsService.get_EffectsOnThis(creature, this.name);
    }
    bonus(creature: Character|AnimalCompanion|Familiar, effectsService: EffectsService) {
        return effectsService.get_BonusesOnThis(creature, this.name).concat(effectsService.get_BonusesOnThis(creature, "Speed"));
    }
    penalty(creature: Character|AnimalCompanion|Familiar, effectsService: EffectsService) {
        return effectsService.get_PenaltiesOnThis(creature, this.name).concat(effectsService.get_PenaltiesOnThis(creature, "Speed"));
    }
    baseValue(creature: Character|AnimalCompanion|Familiar, characterService: CharacterService, effectsService: EffectsService) {
    //Gets the basic speed and adds all effects
        if (characterService.still_loading()) { return 0; }
        let sum = 0;
        let explain: string = "";
        //Penalties cannot lower a speed below 5. We need to track if one ever reaches 5, then never let it get lower again.
        let above5 = false;
        //Get the base land speed from the ancestry
        if (this.name == "Land Speed" && creature.class.ancestry.name) {
            sum = creature.class.ancestry.speed;
            explain = "\n"+creature.class.ancestry.name+" base speed: "+sum;
        }
        //Incredible Movement adds 10 to Land Speed on Level 3 and 5 on every fourth level after, provided you are unarmored.
        if (creature.type == "Character") {
            let character = creature as Character;
            if (this.name == "Land Speed" && character.get_FeatsTaken(1, character.level, "Incredible Movement").length) {
                let equippedArmor = creature.inventory.armors.filter(armor => armor.equipped)
                if (equippedArmor.length && equippedArmor[0].get_Prof() == "Unarmored") {
                    let incredibleMovementBonus = 5 + (character.level + 1 - ((character.level + 1) % 4)) / 4 * 5;
                    sum += incredibleMovementBonus;
                    explain += "\nIncredible Movement: "+incredibleMovementBonus;
                }
            }
        }
        this.effects(creature, effectsService).forEach(effect => {
            if (sum > 5) {
                above5 = true
            }
            if (above5) {
                sum = Math.max(sum + parseInt(effect.value), 5);
                explain += "\n"+effect.source+": "+effect.value;
            } else {
                sum += parseInt(effect.value);
                explain += "\n"+effect.source+": "+effect.value;
            }
        });
        explain = explain.substr(1);
        return [sum, explain];
    }
    value(creature: Character|AnimalCompanion|Familiar, characterService: CharacterService, effectsService: EffectsService): [number, string] {
        //If there is a general speed penalty (or bonus), it applies to all speeds. We apply it to the base speed here so we can still
        // copy the base speed for effects (e.g. "You gain a climb speed equal to your land speed") and not apply the general penalty twice.
        let sum = this.baseValue(creature, characterService, effectsService)[0];
        let explain: string = this.baseValue(creature, characterService, effectsService)[1];
        let above5 = false;
        if (this.name != "Speed") {
            effectsService.get_EffectsOnThis(creature, "Speed").forEach(effect => {
                if (sum > 5) {
                    above5 = true
                }
                if (above5) {
                    sum = Math.max(sum + parseInt(effect.value), 5);
                    explain += "\n"+effect.source+": "+effect.value;
                } else {
                    sum += parseInt(effect.value);
                    explain += "\n"+effect.source+": "+effect.value;
                }
            });
        }
        return [sum, explain];
    }
}