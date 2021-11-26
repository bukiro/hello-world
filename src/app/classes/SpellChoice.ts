import { SpellGain } from 'src/app/classes/SpellGain';
import { v4 as uuidv4 } from 'uuid';

export class SpellChoice {
        //This is a list of all the attributes that should not be discarded when saving the character.
    //For SpellChoices, if the choice is part of a class, the class may designate this choice as a signature spell.
    //A regular SpellChoice does not do that, so if you disable the signature spell on the choice, it is false == false and gets discarded.
    //Loading the character recreates the class and overwrites attributes that aren't set, so the SpellChoice will be a signature spell again.
    public readonly save = [
        "signatureSpell"
    ];
    public available: number = 0;
    //Dynamic Available gets evaluated in the spellchoice component instead of available if it is set.
    public dynamicAvailable: string = "";
    //className is used to identify the proper SpellCasting to sort this into
    //If "", the main class is used.
    public alwaysShowHeightened: boolean = false;
    public className: string = "";
    public cooldown: number = 0;
    public frequency: string = "";
    public filter: string[] = [];
    public traitFilter: string[] = [];
    public id = uuidv4();
    //If insertClass is set, this SpellChoice is only granted by a feat if the character class name matches this name.
    // This is especially useful for class choices (hunter's edge, rogue racket, bloodline etc.) that don't give certain benefits when multiclassing.
    public insertClass: string = "";
    public level: number = 0;
    //For spell choices that are "three levels below your highest spell level"
    //Example: "character.get_SpellLevel() - 3"
    public dynamicLevel: string = "";
    //Don't display this choice or its spells if the character level is lower than charLevelAvailable.
    //If a feat adds a spellChoice with charLevelAvailable = 0, it gets set to the level the feat was taken
    //If a feat adds a spellChoice with a lower charLevelAvailable as the level the feat was taken, it get set to the feat level instead
    public charLevelAvailable: number = 0;
    //The CastingType is mostly there to identify the proper SpellCasting to sort this into if it comes from a feat.
    public castingType: "Focus" | "Innate" | "Spontaneous" | "Prepared" | "Default";
    //Spell Combination is for wizards and designates this spell choice as one that fits two spells in one spell slot.
    public spellCombinationAllowed: boolean = false;
    //You can choose to use a combination slot for a spell combination, which changes the available spells.
    public spellCombination: boolean = false;
    //The spells chosen must match the tradition of the spell choice, if one is given, or otherwise the tradition of the spellcasting or nothing.
    public tradition: string = "";
    public source: string = "";
    //If showOnSheet is set, this choice is intended to be made on the character sheet instead of while building the character.
    // This is relevant for features like Infinite Possibilities.
    public showOnSheet: boolean = false;
    public singleTarget: boolean = false;
    //Only allow spells from your spellbook.
    public spellBookOnly: boolean = false;
    public spells: SpellGain[] = [];
    //Spell Blending is for Wizards and tracks spell blending choices for this spell choice. It contains three numbers.
    //The numbers are:
    // [0]: Number of spell slots traded away for cantrips
    // [1]: Number of spell slots traded away for a spell slot 1 level higher
    // [2]: Number of spell slots traded away for a spell slot 2 levels higher
    public spellBlending: number[] = [0, 0, 0]
    //Infinite Possibilities is for Wizards and tracks whether one of the spell slots of this choice has been traded away for an Infinite Possibilities slot.
    public infinitePossibilities: boolean = false;
    //Adapted Cantrip tracks whether one of the spell slots of this choice has been traded away for an Adapted Cantrip slot.
    public adaptedCantrip: boolean = false;
    //Adaptive Adept tracks whether one of the spell slots of this choice has been traded away for an Adaptive Adept slot.
    public adaptiveAdept: boolean = false;
    //Crossblooded Evolution tracks whether one of the spell slots of this choice can be filled with a spell from another tradition.
    public crossbloodedEvolution: boolean = false;
    //If this spellchoice is resonant, you can only use it while the granting aeon stone is slotted in a wayfinder.
    public resonant: boolean = false;
    //If target is set to "Others", you can only choose spells with target != "self".
    //If target is set to "Caster", you can only choose spells with target "self".
    //If target is set to "Allies", you can only choose spells with target "ally".
    //If target is set to "Enemies", you can only choose spells with no target property (so it's likely not beneficial).
    public target: string = "";
    recast() {
        this.spells = this.spells.map(obj => Object.assign(new SpellGain(), obj).recast());
        return this;
    }
}