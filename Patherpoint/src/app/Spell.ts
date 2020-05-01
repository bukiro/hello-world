import { SpellDesc } from './SpellDesc';
import { CharacterService } from './character.service';
import { SpellGain } from './SpellGain';
import { ConditionGain } from './ConditionGain';
import { ItemGain } from './ItemGain';

export class Spell {
    public name: string = "";
    public levelreq: number = 1;
    public traditions: string[] = [];
    public duration: number = 0;
    public range: string = "";
    public area: string = "";
    public targets: string = "";
    //target is used internally to determine whether you can cast this spell on yourself or your companion/familiar
    //Should be "", "self", "companion" or "ally"
    //For "companion", it can only be cast on the companion, for "self" only on yourself
    //For "ally", it can be cast on companion, self and others
    //For "", the spell button will just say "Cast"
    public target: string = "";
    public actions: string = "1";
    public castType: string = "";
    public shortDesc: string = "";
    public desc: string = "";
    public desc1: SpellDesc[] = [];
    public desc2: SpellDesc[] = [];
    public desc3: SpellDesc[] = [];
    public desc4: SpellDesc[] = [];
    public desc5: SpellDesc[] = [];
    public desc6: SpellDesc[] = [];
    public desc7: SpellDesc[] = [];
    public desc8: SpellDesc[] = [];
    public desc9: SpellDesc[] = [];
    public desc10: SpellDesc[] = [];
    public heightened = [];
    public savingthrow: string = "";
    public critsuccess: string = "";
    public success: string = "";
    public failure: string = "";
    public critfailure: string = "";
    public gainConditions: ConditionGain[] = [];
    public gainItems: ItemGain[] = [];
    public sustained: boolean = false;
    public traits: string[] = [];
    get_Actions() {
        switch (this.actions) {
            case "Free":
                return "(Free Action)";
            case "Reaction":
                return "(Reaction)";
            case "1":
                return "(1 Action)";
            case "2":
                return "(2 Actions)";
            case "3":
                return "(3 Actions)";
            default:
                return "("+this.actions+")";
        }
    }
    get_DescriptionSet(levelNumber: number) {
        //This descends from levelnumber downwards and returns the first available description.
        switch (levelNumber) {
            case 10: 
                if (this.desc10.length) { return this.desc10; }
            case 9: 
                if (this.desc9.length) { return this.desc9; }
            case 8: 
                if (this.desc8.length) { return this.desc8; }
            case 7: 
                if (this.desc7.length) { return this.desc7; }
            case 6: 
                if (this.desc6.length) { return this.desc6; }
            case 5: 
                if (this.desc5.length) { return this.desc5; }
            case 4: 
                if (this.desc4.length) { return this.desc4; }
            case 3: 
                if (this.desc3.length) { return this.desc3; }
            case 2: 
                if (this.desc2.length) { return this.desc2; }
            case 1:
                if (this.desc1.length) { return this.desc1; }
            default:
                return [];
            }
    }
    get_Heightened(desc: string, levelNumber: number) {
        this.get_DescriptionSet(levelNumber).forEach((descVar: SpellDesc) => {
            desc = desc.replace(descVar.variable, descVar.value);
        })
        return desc;
    }
    meetsLevelReq(characterService: CharacterService, spellLevel: number = Math.ceil(characterService.get_Character().level / 2)) {
        //If the spell has a levelreq, check if the level beats that.
        //Returns [requirement met, requirement description]
        let result: {met:boolean, desc:string};
        if (this.levelreq && this.traits.indexOf("Cantrip") == -1) {
            if (spellLevel >= this.levelreq) {
                result = {met:true, desc:"Level "+this.levelreq};
                } else {
                result = {met:false, desc:"Level "+this.levelreq};
            }
        } else {
            result = {met:true, desc:""};
        }
        return result;
    }
    canChoose(characterService: CharacterService, spellLevel: number = Math.ceil(characterService.get_Character().level / 2)) {
        if (characterService.still_loading()) { return false }
        let levelreq: boolean = this.meetsLevelReq(characterService, spellLevel).met;
        return levelreq;
    }
    have(characterService: CharacterService, spellLevel = this.levelreq) {
        if (characterService.still_loading()) { return false }
        let character = characterService.get_Character();
        let spellsTaken = character.get_SpellsTaken(1, 20, spellLevel, this.name)
        return spellsTaken.length;
    }
    can_Cast(characterService: CharacterService, gain: SpellGain) {
        if (gain.tradition.indexOf("Focus") > -1) {
            return characterService.get_Character().class.focusPoints > 0 || gain.active;
        } else {
            //check spell slots and prepared spell here
            return true;
        }
    }
}