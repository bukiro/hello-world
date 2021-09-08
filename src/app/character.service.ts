import { Injectable, isDevMode } from '@angular/core';
import { Character } from './Character';
import { Skill } from './Skill';
import { Observable, BehaviorSubject } from 'rxjs';
import { Item } from './Item';
import { Class } from './Class';
import { AbilitiesService } from './abilities.service';
import { SkillsService } from './skills.service';
import { Level } from './Level';
import { ClassesService } from './classes.service';
import { ItemCollection } from './ItemCollection';
import { Armor } from './Armor';
import { Weapon } from './Weapon';
import { FeatsService } from './feats.service';
import { TraitsService } from './traits.service';
import { Ancestry } from './Ancestry';
import { HistoryService } from './history.service';
import { Heritage } from './Heritage';
import { Background } from './Background';
import { ItemsService } from './items.service';
import { Feat } from './Feat';
import { ConditionsService } from './conditions.service';
import { ConditionGain } from './ConditionGain';
import { ActivitiesService } from './activities.service';
import { Activity } from './Activity';
import { ActivityGain } from './ActivityGain';
import { SpellsService } from './spells.service';
import { EffectsService } from './effects.service';
import { Consumable } from './Consumable';
import { TimeService } from './time.service';
import { DefenseService } from './defense.service';
import { Equipment } from './Equipment';
import { EffectGain } from './EffectGain';
import { ItemGain } from './ItemGain';
import { ItemActivity } from './ItemActivity';
import { Rune } from './Rune';
import { DeitiesService } from './deities.service';
import { Deity } from './Deity';
import { AnimalCompanionsService } from './animalcompanions.service';
import { AnimalCompanion } from './AnimalCompanion';
import { Familiar } from './Familiar';
import { SavegameService } from './savegame.service';
import { FamiliarsService } from './familiars.service';
import { FeatChoice } from './FeatChoice';
import { Oil } from './Oil';
import { WornItem } from './WornItem';
import { Savegame } from './Savegame';
import { ArmorRune } from './ArmorRune';
import { Ammunition } from './Ammunition';
import { Shield } from './Shield';
import { AlchemicalBomb } from './AlchemicalBomb';
import { Snare } from './Snare';
import { AlchemicalPoison } from './AlchemicalPoison';
import { OtherConsumableBomb } from './OtherConsumableBomb';
import { AdventuringGear } from './AdventuringGear';
import { Hint } from './Hint';
import { Creature } from './Creature';
import { LanguageGain } from './LanguageGain';
import { ConfigService } from './config.service';
import { SpellTarget } from './SpellTarget';
import { PlayerMessage } from './PlayerMessage';
import { MessageService } from './message.service';
import { ToastService } from './toast.service';
import { Material } from './Material';
import { WeaponRune } from './WeaponRune';
import { NgbPopoverConfig, NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';
import { ConditionSet } from './ConditionSet';
import { ExtensionsService } from './extensions.service';
import { AnimalCompanionAncestry } from './AnimalCompanionAncestry';
import { AnimalCompanionSpecialization } from './AnimalCompanionSpecialization';

@Injectable({
    providedIn: 'root'
})
export class CharacterService {

    private me: Character = new Character();
    public characterChanged$: Observable<string>;
    public viewChanged$: Observable<{ creature: string, target: string, subtarget: string }>;
    private loader = [];
    private loading: boolean = false;
    private basicItems: (Weapon | Armor)[] = [];
    private toChange: { creature: string, target: string, subtarget: string }[] = [];
    private changed: BehaviorSubject<string> = new BehaviorSubject<string>("");
    private viewChanged: BehaviorSubject<{ creature: string, target: string, subtarget: string }> = new BehaviorSubject<{ creature: string, target: string, subtarget: string }>({ target: "", creature: "", subtarget: "" });
    private firstTime: boolean = true;

    itemsMenuState: string = 'out';
    itemsMenuTarget: string = 'Character';
    craftingMenuState: string = 'out';
    characterMenuState: string = 'in';
    companionMenuState: string = 'out';
    familiarMenuState: string = 'out';
    spellsMenuState: string = 'out';
    spelllibraryMenuState: string = 'out';
    conditionsMenuState: string = 'out';
    diceMenuState: string = 'out';

    constructor(
        private configService: ConfigService,
        private extensionsService: ExtensionsService,
        private savegameService: SavegameService,
        public abilitiesService: AbilitiesService,
        private skillsService: SkillsService,
        public classesService: ClassesService,
        public featsService: FeatsService,
        public traitsService: TraitsService,
        private historyService: HistoryService,
        public conditionsService: ConditionsService,
        public activitiesService: ActivitiesService,
        public itemsService: ItemsService,
        public spellsService: SpellsService,
        public effectsService: EffectsService,
        public timeService: TimeService,
        public defenseService: DefenseService,
        public deitiesService: DeitiesService,
        public animalCompanionsService: AnimalCompanionsService,
        public familiarsService: FamiliarsService,
        private messageService: MessageService,
        public toastService: ToastService,
        popoverConfig: NgbPopoverConfig,
        tooltipConfig: NgbTooltipConfig,
    ) {
        popoverConfig.autoClose = "outside";
        popoverConfig.container = "body";
        popoverConfig.openDelay = 100;
        popoverConfig.placement = "auto";
        popoverConfig.popoverClass = "list-item sublist";
        popoverConfig.triggers = "hover:click";
        tooltipConfig.placement = "auto";
        tooltipConfig.container = "body";
        tooltipConfig.openDelay = 100;
        tooltipConfig.triggers = "hover:click";
    }

    still_loading() {
        return this.loading;
    }

    get_Changed(): Observable<string> {
        return this.characterChanged$;
    }

    get_ViewChanged(): Observable<{ creature: string, target: string, subtarget: string }> {
        return this.viewChanged$;
    }

    set_ToChange(creature: string = "Character", target: string = "all", subtarget: string = "") {
        target = target || "all";
        this.toChange.push({ creature: creature, target: target, subtarget: subtarget });
    }

    set_HintsToChange(creature: string, hints: Hint[] = []) {
        //For transition between single showon strings and multiple hints, we are currently doing both.
        hints.forEach(hint => {
            //Update the tags for every element that is named here.
            hint.showon.split(",").forEach(subtarget => {
                this.set_ToChange(creature, "tags", subtarget.trim())
            })
            //If any activities are named, also update the activities area.
            if (this.get_OwnedActivities(this.get_Creature(creature), this.get_Creature(creature).level).find(activity => hint.showon.includes(activity.name))) {
                this.set_ToChange(creature, "activities")
            }
        })
        this.set_ToChange(creature, "character-sheet");
    }

    set_TagsToChange(creature: string, showonString: string = "") {
        //For transition between single showon strings and multiple hints, we are currently doing both.
        //  Ideally, we can eventually delete this function and clean up every place that uses it.

        //Update the tags for every element that is named here.
        showonString.split(",").forEach(subtarget => {
            this.set_ToChange(creature, "tags", subtarget.trim())
        })
        //If any activities are named, also update the activities area.
        if (this.get_OwnedActivities(this.get_Creature(creature), this.get_Creature(creature).level).find(activity => showonString.includes(activity.name))) {
            this.set_ToChange(creature, "activities")
        }
        this.set_ToChange(creature, "character-sheet");
    }

    set_AbilityToChange(creature: string, ability: string) {
        //Set refresh commands for all components of the application depending this ability.
        let abilities: string[] = ["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"];
        let attacks: string[] = ["Dexterity", "Strength"];
        let defense: string[] = ["Constitution", "Dexterity", "Wisdom"];
        let general: string[] = ["Strength", "Dexterity", "Intelligence", "Wisdom", "Charisma"];
        let health: string[] = ["Constitution"];
        let inventory: string[] = ["Strength"];
        let spells: string[] = ["Intelligence", "Charisma", "Wisdom"];

        //Prepare changes for everything that should be updated according to the ability.
        this.set_ToChange(creature, "abilities");
        if (abilities.includes(ability)) {
            this.set_ToChange(creature, "abilities");
            this.set_ToChange(creature, "individualskills", ability);
        }
        if (attacks.includes(ability)) {
            this.set_ToChange(creature, "attacks");
        }
        if (defense.includes(ability)) {
            this.set_ToChange(creature, "defense");
        }
        if (general.includes(ability)) {
            this.set_ToChange(creature, "general");
        }
        if (health.includes(ability)) {
            this.set_ToChange(creature, "health");
        }
        if (inventory.includes(ability)) {
            this.set_ToChange(creature, "inventory");
        }
        if (spells.includes(ability)) {
            this.set_ToChange(creature, "spells");
            this.set_ToChange(creature, "spellbook");
            this.set_ToChange(creature, "spellchoices");
        }
        this.set_ToChange(creature, "effects");
        this.set_ToChange("Character", "charactersheet")
        if (ability == "Intelligence") {
            this.set_ToChange("Character", "skillchoices")
            this.update_LanguageList();
        }
    }

    process_ToChange() {
        ["Character", "Companion", "Familiar"].forEach(creature => {
            if (this.toChange.find(view => view.creature == creature && view.target == "all")) {
                this.clear_ToChange(creature);
                this.set_ViewChanged({ creature: creature, target: "all", subtarget: "" });
            } else {
                //Process effects first, as effects may stack up more of the others.
                let uniqueEffectsStrings = this.toChange.filter(view => view.creature.toLowerCase() == creature.toLowerCase() && view.target.toLowerCase() == "effects").map(view => JSON.stringify(view))
                let uniqueEffects = Array.from(new Set(uniqueEffectsStrings)).map(view => JSON.parse(view));
                uniqueEffects.forEach(view => {
                    this.set_ViewChanged(view);
                });
                //For the rest, copy the toChange list and clear it, so we don't get a loop if set_ViewChanged() causes more calls of process_ToChange().
                let uniqueOthersStrings = this.toChange.filter(view => view.creature.toLowerCase() == creature.toLowerCase() && view.target.toLowerCase() != "effects").map(view => JSON.stringify(view))
                let uniqueOthers = Array.from(new Set(uniqueOthersStrings)).map(view => JSON.parse(view));
                this.clear_ToChange(creature);
                uniqueOthers.forEach(view => {
                    this.set_ViewChanged(view);
                });
            }
        })
    }

    clear_ToChange(creature: string = "all") {
        this.toChange = this.toChange.filter(view => view.creature.toLowerCase() != creature.toLowerCase() && creature.toLowerCase() != "all")
    }

    set_ViewChanged(view: { creature: string, target: string, subtarget: string }) {
        this.viewChanged.next(view);
    }

    set_Changed(target: string = "all") {
        target = target || "all";
        if (["Character", "Companion", "Familiar", "all"].includes(target)) {
            this.clear_ToChange(target);
        }
        this.changed.next(target);
    }

    get_Darkmode() {
        if (!this.still_loading()) {
            return this.get_Character().settings.darkmode;
        } else {
            return false;
        }
    }

    get_FirstTime() {
        return this.firstTime;
    }

    toggle_Menu(menu: string = "") {
        this.firstTime = false;
        let characterMenuState = this.characterMenuState;
        let companionMenuState = this.companionMenuState;
        let familiarMenuState = this.familiarMenuState;
        let itemsMenuState = this.itemsMenuState;
        let craftingMenuState = this.craftingMenuState;
        let spellsMenuState = this.spellsMenuState;
        let spelllibraryMenuState = this.spelllibraryMenuState;
        let conditionsMenuState = this.conditionsMenuState;
        let diceMenuState = this.diceMenuState;
        this.characterMenuState = (menu == "character" && (this.characterMenuState == 'out')) ? 'in' : 'out';
        //Companion and Familiar menus don't need to close if the dice menu opens.
        if (menu != "dice") {
            this.companionMenuState = (menu == "companion" && (this.companionMenuState == 'out')) ? 'in' : 'out';
            this.familiarMenuState = (menu == "familiar" && (this.familiarMenuState == 'out')) ? 'in' : 'out';
        }
        this.itemsMenuState = (menu == "items" && (this.itemsMenuState == 'out')) ? 'in' : 'out';
        this.craftingMenuState = (menu == "crafting" && (this.craftingMenuState == 'out')) ? 'in' : 'out';
        this.spellsMenuState = (menu == "spells" && (this.spellsMenuState == 'out')) ? 'in' : 'out';
        this.spelllibraryMenuState = (menu == "spelllibrary" && (this.spelllibraryMenuState == 'out')) ? 'in' : 'out';
        this.conditionsMenuState = (menu == "conditions" && (this.conditionsMenuState == 'out')) ? 'in' : 'out';
        this.diceMenuState = (menu == "dice" && (this.diceMenuState == 'out')) ? 'in' : 'out';
        if (this.characterMenuState != characterMenuState) {
            if (this.characterMenuState == 'in') {
                this.set_Changed("charactersheet");
            } else {
                setTimeout(() => {
                    this.set_Changed("charactersheet");
                }, 400);
            }
        }
        if (this.companionMenuState != companionMenuState) {
            if (this.companionMenuState == 'in') {
                this.set_Changed("Companion");
            } else {
                setTimeout(() => {
                    this.set_Changed("Companion");
                }, 400);
            }
        }
        if (this.familiarMenuState != familiarMenuState) {
            if (this.familiarMenuState == 'in') {
                this.set_Changed("Familiar");
            } else {
                setTimeout(() => {
                    this.set_Changed("Familiar");
                }, 400);
            }
        }
        if (this.itemsMenuState != itemsMenuState) {
            if (this.itemsMenuState == 'in') {
                this.set_Changed("items");
            } else {
                setTimeout(() => {
                    this.set_Changed("items");
                }, 400);
            }
        }
        if (this.craftingMenuState != craftingMenuState) {
            if (this.craftingMenuState == 'in') {
                this.set_Changed("crafting");
            } else {
                setTimeout(() => {
                    this.set_Changed("crafting");
                }, 400);
            }
        }
        if (this.spellsMenuState != spellsMenuState) {
            if (this.spellsMenuState == 'in') {
                this.set_Changed("spells");
            } else {
                setTimeout(() => {
                    this.set_Changed("spells");
                }, 400);
            }
        }
        if (this.spelllibraryMenuState != spelllibraryMenuState) {
            if (this.spelllibraryMenuState == 'in') {
                this.set_Changed("spelllibrary");
            } else {
                setTimeout(() => {
                    this.set_Changed("spelllibrary");
                }, 400);
            }
        }
        if (this.conditionsMenuState != conditionsMenuState) {
            if (this.conditionsMenuState == 'in') {
                this.set_Changed("conditions");
            } else {
                setTimeout(() => {
                    this.set_Changed("conditions");
                }, 400);
            }
        }
        if (this.diceMenuState != diceMenuState) {
            if (this.diceMenuState == 'in') {
                this.set_Changed("dice");
            } else {
                setTimeout(() => {
                    this.set_Changed("dice");
                }, 400);
            }
        }
        this.set_Changed("top-bar");
        if (this.toChange.length) {
            this.process_ToChange();
        }
    }

    get_CharacterMenuState() {
        return this.characterMenuState;
    }

    get_CompanionMenuState() {
        return this.companionMenuState;
    }

    get_FamiliarMenuState() {
        return this.familiarMenuState;
    }

    get_ItemsMenuState() {
        return this.itemsMenuState;
    }

    get_CraftingMenuState() {
        return this.craftingMenuState;
    }

    get_SpellsMenuState() {
        return this.spellsMenuState;
    }

    get_SpellLibraryMenuState() {
        return this.spelllibraryMenuState;
    }

    get_ConditionsMenuState() {
        return this.conditionsMenuState;
    }

    get_DiceMenuState() {
        return this.diceMenuState;
    }

    get_ItemsMenuTarget() {
        return this.itemsMenuTarget;
    }

    set_ItemsMenuTarget(target: string = "Character") {
        this.itemsMenuTarget = target;
        this.set_Changed("itemstore");
    }

    get_Level(number: number) {
        return this.get_Character().class.levels[number];
    }

    get_Creature(type: string) {
        switch (type) {
            case "Character":
                return this.get_Character();
            case "Companion":
                return this.get_Companion();
            case "Familiar":
                return this.get_Familiar();
            default:
                return new Character();
        }
    }

    get_Character() {
        if (!this.still_loading()) {
            return this.me;
        } else { return new Character() }
    }

    get_IsBlankCharacter() {
        //The character is blank if textboxes haven't been used, no class and no basevalues have been chosen, and no items have been added other than the starter items.
        let character = this.get_Character();
        return (
            !character.class?.name &&
            !character.name &&
            !character.partyName &&
            !character.experiencePoints &&
            !character.alignment &&
            !character.baseValues.length &&
            character.inventories.length <= 2 &&
            //The character is not blank if the inventory has more than 0 items (more than 2 for the first) or if any item is not one of the basic items.
            !character.inventories.some((inv, index) => inv.allItems().length > (index ? 0 : 2) || inv.allItems().some((item: Item) => !this.basicItems.some(basicItem => basicItem.id == item.refId)))
        )
    }

    get_GMMode() {
        return this.get_Character().GMMode;
    }

    get_ManualMode() {
        return this.get_Character().settings.manualMode;
    }

    get_CompanionAvailable(charLevel: number = this.get_Character().level) {
        //Return any feat that grants an animal companion that you own.
        return this.get_CharacterFeatsAndFeatures().find(feat => feat.gainAnimalCompanion == "Young" && feat.have(this.get_Character(), this, charLevel));
    }

    get_FamiliarAvailable(charLevel: number = this.get_Character().level) {
        //Return any feat that grants an animal companion that you own.
        return this.get_CharacterFeatsAndFeatures().find(feat => feat.gainFamiliar && feat.have(this.get_Character(), this, charLevel));
    }

    get_Companion() {
        return this.get_Character().class?.animalCompanion || new AnimalCompanion();
    }

    get_Familiar() {
        return this.get_Character().class?.familiar || new Familiar();
    }

    get_Creatures(companionAvailable: boolean = undefined, familiarAvailable: boolean = undefined) {
        if (!this.still_loading()) {
            if (companionAvailable == undefined) {
                companionAvailable = this.get_CompanionAvailable() != null;
            }
            if (familiarAvailable == undefined) {
                familiarAvailable = this.get_FamiliarAvailable() != null;
            }
            if (companionAvailable && familiarAvailable) {
                return ([] as (Creature)[]).concat(this.get_Character()).concat(this.get_Companion()).concat(this.get_Familiar());
            } else if (companionAvailable) {
                return ([] as (Creature)[]).concat(this.get_Character()).concat(this.get_Companion());
            } else if (familiarAvailable) {
                return ([] as (Creature)[]).concat(this.get_Character()).concat(this.get_Familiar());
            } else {
                return ([] as (Creature)[]).concat(this.get_Character());
            }
        } else { return [new Character()] }
    }

    reset_Character(id: string = "", loadAsGM: boolean = false) {
        this.loading = true;
        this.initialize(id, loadAsGM);
    }

    get_Accent() {
        if (!this.still_loading()) {
            function hexToRgb(hex) {
                if (hex.length == 4) {
                    var result = /^#?([a-f\d]{1})([a-f\d]{1})([a-f\d]{1})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1] + result[1], 16),
                        g: parseInt(result[2] + result[2], 16),
                        b: parseInt(result[3] + result[3], 16),
                    } : null;
                } else if (hex.length == 7) {
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                        r: parseInt(result[1], 16),
                        g: parseInt(result[2], 16),
                        b: parseInt(result[3], 16),
                    } : null;
                }
            }
            let original = this.get_Character().settings.accent;
            if (original.length == 4 || original.length == 7) {
                try {
                    let rgba = hexToRgb(original)
                    let result = rgba.r + "," + rgba.g + "," + rgba.b;
                    return result;
                }
                catch (error) {
                    return "25, 118, 210"
                }
            } else {
                return "25, 118, 210";
            }
        }
    }

    set_Accent() {
        document.documentElement.style.setProperty('--accent', this.get_Accent());
    }

    set_Darkmode() {
        if (this.get_Darkmode()) {
            document.body.classList.add('darkmode');
        } else {
            document.body.classList.remove('darkmode');
        }
    }

    get_Classes(name: string) {
        return this.classesService.get_Classes(name);
    }

    get_Ancestries(name: string) {
        this.historyService.get_Ancestries(name)
    }

    get_Deities(name: string = "") {
        return this.deitiesService.get_Deities(name);
    }

    get_CharacterDeities(character: Character, source: string = "", level: number = character.level) {
        return this.deitiesService.get_CharacterDeities(character, source, level);
    }

    get_Speeds(creature: Creature, name: string = "") {
        return creature.speeds.filter(speed => speed.name == name || name == "");
    }

    update_LanguageList() {
        //Ensure that the language list is always as long as ancestry languages + INT + any relevant feats and bonuses.
        //This function is called by the effects service after generating effects, so that new languages aren't thrown out before the effects are generated.
        //Don't call this function in situations where effects are going to change, but haven't been generated yet - or you may lose languages.
        let character = this.get_Character();
        if (character.class.name) {
            //Collect everything that gives you free languages, and the level on which it happens. This will allow us to mark languages as available depending on their level.
            let languageSources: { name: string, level: number, amount: number }[] = [];

            //Free languages from your ancestry
            let ancestryLanguages: number = character.class.ancestry.baseLanguages - character.class.ancestry.languages.length;
            if (ancestryLanguages) {
                languageSources.push({ name: "Ancestry", level: 0, amount: ancestryLanguages });
            }

            //Free languages from your base intelligence
            let baseIntelligence: number = this.get_Abilities("Intelligence")[0]?.baseValue(character, this, 0)?.result;
            let baseInt: number = Math.floor((baseIntelligence - 10) / 2);
            if (baseInt > 0) {
                languageSources.push({ name: "Intelligence", level: 0, amount: baseInt })
            }
            //Build an array of int per level for comparison between the levels, starting with the base at 0.
            let int: number[] = [baseInt]

            //Collect all feats you have that grant extra free languages, then note on which level you have them.
            //Also add more languages if INT has been raised (and is positive).
            let languageFeats: string[] = this.get_CharacterFeatsAndFeatures().filter(feat => feat.effects.some(effect => effect.affected == "Max Languages")).map(feat => feat.name);
            character.class.levels.forEach(level => {
                character.get_FeatsTaken(level.number, level.number).filter(taken => languageFeats.includes(taken.name)).forEach(taken => {
                    //The amount will be added later by effects.
                    languageSources.push({ name: taken.name, level: level.number, amount: 0 })
                })
                //Compare INT on this level with INT on the previous level. Don't do this on Level 0, obviously.
                if (level.number > 0) {
                    let levelIntelligence: number = this.get_Abilities("Intelligence")[0]?.baseValue(character, this, level.number)?.result;
                    int.push(Math.floor((levelIntelligence - 10) / 2));
                    let diff = int[level.number] - int[level.number - 1];
                    if (diff > 0 && int[level.number] > 0) {
                        languageSources.push({ name: "Intelligence", level: level.number, amount: Math.min(diff, int[level.number]) })
                    }
                }
            })

            //Never apply absolute effects or negative effects to Max Languages. This should not happen in the game,
            // and it could delete your chosen languages.
            //Apply the relative effects by finding a language source fitting the effect and changing its amount accordingly.
            // Only change sources that have no amount yet.
            // If a source cannot be found, the effect is not from a feat and should be treated as temporary (level -2).
            this.effectsService.get_RelativesOnThis(this.get_Character(), "Max Languages").forEach(effect => {
                if (parseInt(effect.value) > 0) {
                    let source = languageSources.find(source => source.name == effect.source && source.amount == 0);
                    if (source) {
                        source.amount = parseInt(effect.value);
                    } else {
                        languageSources.push({ name: effect.source, level: -2, amount: parseInt(effect.value) })
                    }
                }
            })

            //If the current INT is positive and higher than the base INT for the current level (e.g. because of an item bonus), add another language source.
            let currentInt = this.get_Abilities("Intelligence")[0]?.mod(character, this, this.effectsService)?.result;
            let diff = currentInt - int[character.level];
            if (diff > 0 && currentInt > 0) {
                languageSources.push({ name: "Intelligence", level: -2, amount: Math.min(diff, currentInt) })
            }

            //Remove all free languages that have not been filled.
            character.class.languages = character.class.languages.sort().filter(language => !(language.name == "" && !language.locked));
            //Make a new list of all the free languages. We will pick and sort the free languages from here into the character language list.
            let tempLanguages: LanguageGain[] = character.class.languages.filter(language => !language.locked).map(language => Object.assign(new LanguageGain(), JSON.parse(JSON.stringify(language))));
            //Reduce the character language list to only the locked ones.
            character.class.languages = character.class.languages.filter(language => language.locked);

            //Add free languages based on the sources and the copied language list:
            // - For each source, find a language that has the same source and the same level.
            // - If not available, find a language that has the same source and no level (level -1).
            // (This is mainly for the transition from the old language calculations. Languages should not have level -1 in the future.)
            // - If not available, add a new blank language.
            languageSources.forEach(languageSource => {
                for (let index = 0; index < languageSource.amount; index++) {
                    let existingLanguage = tempLanguages.find(language => language.source == languageSource.name && language.level == languageSource.level && !language.locked)
                    if (existingLanguage) {
                        character.class.languages.push(existingLanguage);
                        tempLanguages.splice(tempLanguages.indexOf(existingLanguage), 1);
                    } else {
                        existingLanguage = tempLanguages.find(language => language.source == languageSource.name && language.level == -1 && !language.locked)
                        if (existingLanguage) {
                            let newLanguage = Object.assign(new LanguageGain(), JSON.parse(JSON.stringify(tempLanguages)));
                            newLanguage.level = languageSource.level;
                            character.class.languages.push(newLanguage);
                            tempLanguages.splice(tempLanguages.indexOf(existingLanguage), 1);
                        } else {
                            character.class.languages.push(Object.assign(new LanguageGain(), { name: "", source: languageSource.name, locked: false, level: languageSource.level }));
                        }
                    }
                }
            })

            //If any languages are left in the temporary list, assign them to any blank languages, preferring same source, Intelligence and then Multilingual as sources.
            tempLanguages.forEach(lostLanguage => {
                let targetLanguage = character.class.languages
                    .find(freeLanguage =>
                        !freeLanguage.locked &&
                        freeLanguage.name == "" &&
                        (freeLanguage.source == lostLanguage.source || freeLanguage.source == "Intelligence" || freeLanguage.source == "Multilingual" || true)
                    )
                if (targetLanguage) {
                    targetLanguage.name = lostLanguage.name;
                }
            })

            //Sort languages by locked > level > source > name.
            character.class.languages = character.class.languages
                .sort(function (a, b) {
                    if (a.name > b.name) {
                        return 1;
                    }
                    if (a.name < b.name) {
                        return -1;
                    }
                    return 0;
                })
                .sort(function (a, b) {
                    if (a.source > b.source) {
                        return 1;
                    }
                    if (a.source < b.source) {
                        return -1;
                    }
                    return 0;
                })
                .sort(function (a, b) {
                    if (a.level > b.level) {
                        return 1;
                    }
                    if (a.level < b.level) {
                        return -1;
                    }
                    return 0;
                })
                .sort(function (a, b) {
                    if (!a.locked && b.locked) {
                        return 1;
                    }
                    if (a.locked && !b.locked) {
                        return -1;
                    }
                    return 0;
                })
        }
    }

    change_Class($class: Class) {
        //Cleanup Heritage, Ancestry, Background and class skills
        let character = this.get_Character();
        character.class.on_ChangeHeritage(this);
        character.class.on_ChangeAncestry(this);
        character.class.on_ChangeBackground(this);
        character.class.on_ChangeClass(this);
        character.class = Object.assign(new Class(), JSON.parse(JSON.stringify($class)));
        character.class = this.reassign(character.class);
        character.class.on_NewClass(this, this.itemsService);
        this.set_Changed();
    }

    change_Ancestry(ancestry: Ancestry, itemsService: ItemsService) {
        let character = this.get_Character();
        this.change_Heritage(new Heritage());
        character.class.on_ChangeAncestry(this);
        character.class.ancestry = new Ancestry();
        character.class.ancestry = Object.assign(new Ancestry(), JSON.parse(JSON.stringify(ancestry)))
        character.class.ancestry = this.reassign(character.class.ancestry);
        character.class.on_NewAncestry(this, itemsService);
        this.update_LanguageList();
    }

    change_Deity(deity: Deity) {
        let character = this.get_Character();
        character.class.deity = deity.name;
        this.deitiesService.clear_CharacterDeities();
        this.set_ToChange("Character", "general");
        this.set_ToChange("Character", "spells", "clear");
        this.set_ToChange("Character", "spellchoices");
        this.set_ToChange("Character", "featchoices");
        this.set_ToChange("Character", "attacks");
    }

    change_Heritage(heritage: Heritage, index: number = -1, source: string = "") {
        let character = this.get_Character();
        character.class.on_ChangeHeritage(this, index);
        if (index == -1) {
            character.class.heritage = new Heritage();
            character.class.heritage = Object.assign(new Heritage(), JSON.parse(JSON.stringify(heritage)))
            character.class.heritage = this.reassign(character.class.heritage);
        } else {
            character.class.additionalHeritages[index] = new Heritage();
            character.class.additionalHeritages[index] = Object.assign(new Heritage(), JSON.parse(JSON.stringify(heritage)))
            character.class.additionalHeritages[index] = this.reassign(character.class.additionalHeritages[index]);
            character.class.additionalHeritages[index].source = source;
        }
        character.class.on_NewHeritage(this, this.itemsService, index);
    }

    change_Background(background: Background) {
        let character = this.get_Character();
        character.class.on_ChangeBackground(this);
        character.class.background = new Background();
        character.class.background = Object.assign(new Background(), JSON.parse(JSON.stringify(background)));
        character.class.background = this.reassign(character.class.background);
        character.class.on_NewBackground(this);
    }

    get_CleanItems() {
        return this.itemsService.get_CleanItems();
    }

    get_Inventories(creature: Creature) {
        if (!this.still_loading()) {
            return creature.inventories;
        } else { return [new ItemCollection()] }
    }

    get_Specializations(group: string = "") {
        return this.itemsService.get_Specializations(group);
    }

    get_InvestedItems(creature: Creature) {
        return creature.inventories[0]?.allEquipment().filter(item => item.invested && item.traits.includes("Invested")) || [];
    }

    create_WeaponFeats(weapons: Weapon[] = []) {
        //This function depends on the feats and items being loaded, and it will wait forever for them!
        // They should usually be running at this time, but just in case...
        if (this.featsService.still_loading() || this.itemsService.still_loading()) {
            setTimeout(() => {
                this.create_WeaponFeats(weapons);
            }, 500)
        } else {
            if (!weapons.length) {
                weapons = this.itemsService.get_ItemsOfType("weapons");
            }
            let weaponFeats = this.get_Feats().filter(feat => feat.weaponfeatbase);
            weaponFeats.forEach(feat => {
                let featweapons = weapons;
                //These filters are hardcoded according to the needs of the weaponfeatbase feats. There is "Advanced Weapon", "Uncommon Ancestry Weapon" and "Uncommon Ancestry Advanced Weapon" so far.
                if (feat.subType.includes("Uncommon")) {
                    featweapons = featweapons.filter(weapon => weapon.traits.includes("Uncommon"));
                }
                if (feat.subType.includes("Simple")) {
                    featweapons = featweapons.filter(weapon => weapon.prof == "Simple Weapons");
                } else if (feat.subType.includes("Martial")) {
                    featweapons = featweapons.filter(weapon => weapon.prof == "Martial Weapons");
                } else if (feat.subType.includes("Advanced")) {
                    featweapons = featweapons.filter(weapon => weapon.prof == "Advanced Weapons");
                }
                if (feat.subType.includes("Ancestry")) {
                    let ancestries: string[] = this.historyService.get_Ancestries().map(ancestry => ancestry.name);
                    featweapons = featweapons.filter(weapon => weapon.traits.some(trait => ancestries.includes(trait)));
                }
                featweapons.forEach(weapon => {
                    let replacementString = feat.subType;
                    let oldFeat = this.get_Feats().find(libraryFeat => libraryFeat.name == feat.name.replace(replacementString, weapon.name));
                    if (oldFeat) {
                        this.remove_CustomFeat(oldFeat);
                    }
                    let regex = new RegExp(replacementString, "g")
                    let featString = JSON.stringify(feat);
                    featString = featString.replace(regex, weapon.name);
                    let replacedFeat = Object.assign(new Feat(), JSON.parse(featString))
                    let newLength = this.add_CustomFeat(replacedFeat);
                    let newFeat = this.get_Character().customFeats[newLength - 1];
                    newFeat.hide = false;
                    newFeat.weaponfeatbase = false;
                })
            })
        }
    }

    verify_Feats() {
        //run meetsSpecialReq for every feat once, so that we can see in the console if a specialReq isn't working.
        this.featsService.get_Feats(this.me.customFeats).filter(feat => feat.specialreq).forEach(feat => {
            feat.meetsSpecialReq(this);
        })
    }

    grant_InventoryItem(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Item, resetRunes: boolean = true, changeAfter: boolean = true, equipAfter: boolean = true, amount: number = 1, newId: boolean = true, expiration: number = 0) {
        this.set_ToChange(creature.type, "inventory");
        this.set_ToChange(creature.type, "effects");
        this.set_ToChange("Character", "top-bar");
        let newInventoryItem = this.itemsService.initialize_Item(item, false, newId);
        //Assign the library's item id as the new item's refId. This allows us to read the default information from the library later.
        if (!newInventoryItem.refId) {
            newInventoryItem.refId = item.id;
        }
        let returnedItem: Item;
        //Check if this item already exists in the inventory, and if it is stackable and doesn't expire. Don't make that check if this item expires.
        let existingItems: Item[] = [];
        if (!expiration && newInventoryItem.can_Stack()) {
            existingItems = inventory[item.type].filter((existing: Item) =>
                existing.name == newInventoryItem.name && newInventoryItem.can_Stack() && !item.expiration
            );
        }
        //If any existing, stackable items are found, try parsing the amount (set it to 1 if failed), then raise the amount on the first of the existing items.
        //The amount must be parsed because it could be set to anything during custom item creation.
        //If no items are found, add the new item to the inventory.
        //Set returnedInventoryItem to either the found or the new item for further processing.
        if (existingItems.length) {
            let intAmount: number = 1
            try {
                intAmount = parseInt(amount.toString())
            } catch (error) {
                intAmount = 1
            }
            existingItems[0].amount += intAmount;
            returnedItem = existingItems[0];
            //Update gridicons of the expanded item.
            this.set_ToChange("Character", returnedItem.id);
        } else {
            let newInventoryLength = inventory[newInventoryItem.type].push(newInventoryItem);
            let newItem = inventory[newInventoryItem.type][newInventoryLength - 1];
            if (amount > 1) {
                newItem.amount = amount;
            }
            if (expiration) {
                newItem.expiration = expiration;
            }
            returnedItem = this.process_GrantedItem(creature, newItem, inventory, equipAfter, resetRunes)
        }
        if (changeAfter) {
            this.process_ToChange();
        }
        return returnedItem;
    }

    process_GrantedItem(creature: Character | AnimalCompanion, item: Item, inventory: ItemCollection, equip: boolean = true, resetRunes: boolean = true, skipGrantedItems: boolean = false, skipGainedInventories: boolean = false) {
        this.set_ToChange(creature.type, "inventory");
        //Disable and refresh activities on equipment and runes.
        if (((item instanceof Equipment) || (item instanceof Rune)) && item.activities?.length) {
            item.activities.forEach(activity => {
                activity.active = false;
                activity.hints?.forEach((hint: Hint) => {
                    this.set_TagsToChange(creature.type, hint.showon);
                })
            });
            this.set_ToChange(creature.type, "activities");
        }
        if ((item instanceof Equipment) || (item instanceof Rune) || (item instanceof Oil)) {
            item.hints.forEach((hint: Hint) => {
                this.set_TagsToChange(creature.type, hint.showon);
            })
        }
        if (item instanceof Equipment) {
            if (item.gainActivities?.length) {
                item.gainActivities.forEach(gain => {
                    gain.active = false;
                });
                this.set_ToChange(creature.type, "activities");
            }
            if (equip && Object.keys(item).includes("equipped") && item.equippable) {
                this.onEquip(creature, inventory, item, true, false);
            }
            if (item instanceof Weapon && item.prof == "Advanced Weapons") {
                this.create_WeaponFeats([item]);
            }
            if (resetRunes && item.moddable) {
                item.potencyRune = item.strikingRune = item.resilientRune = item.propertyRunes.length = 0;
            }
            item.propertyRunes.filter(rune => rune.loreChoices?.length).forEach(rune => {
                this.add_RuneLore(rune);
            });
            if (!skipGainedInventories) {
                //Add all Inventories that you get from this item.
                if (item.gainInventory) {
                    item.gainInventory.forEach(gain => {
                        let newLength = creature.inventories.push(new ItemCollection());
                        let newInventory = creature.inventories[newLength - 1];
                        newInventory.itemId = item.id;
                        newInventory.bulkLimit = gain.bulkLimit;
                        newInventory.bulkReduction = gain.bulkReduction;
                    })
                }
            }
            if (!skipGrantedItems) {
                //Add all Items that you get from being granted this one
                if (item.gainItems.length) {
                    item.gainItems.filter(gainItem => gainItem.on == "grant" && gainItem.amount > 0).forEach(gainItem => {
                        let extraItem: Item = this.get_CleanItems()[gainItem.type].find((libraryItem: Item) => libraryItem.name.toLowerCase() == gainItem.name.toLowerCase());
                        if (extraItem.can_Stack()) {
                            this.grant_InventoryItem(creature, inventory, extraItem, true, false, false, gainItem.amount + (gainItem.amountPerLevel * creature.level));
                        } else {
                            let equip = true;
                            //Don't equip the new item if it's a shield or armor and this one is too - only one shield or armor can be equipped
                            if ((extraItem instanceof Armor || extraItem instanceof Shield) && extraItem instanceof item.constructor) {
                                equip = false;
                            }
                            extraItem = this.grant_InventoryItem(creature, inventory, extraItem, true, false, equip);
                            gainItem.id = extraItem.id;
                            if (!extraItem.can_Stack()) {
                                extraItem.grantedBy = "(Granted by " + item.name + ")";
                            };
                        }
                    });
                }
            }
        }
        if (item instanceof AlchemicalBomb || item instanceof OtherConsumableBomb || item instanceof Ammunition || item instanceof Snare) {
            this.set_ToChange(creature.type, "attacks");
        }
        return item;
    }

    drop_InventoryItem(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Item, changeAfter: boolean = true, equipBasicItems: boolean = true, including: boolean = true, amount: number = 1) {
        //Don't handle items that are already being dropped.
        if (item.markedForDeletion) {
            return false;
        }
        item.markedForDeletion = true;
        this.set_ToChange(creature.type, "inventory");
        this.set_ToChange(creature.type, "effects");
        this.set_ToChange("Character", "top-bar");
        this.set_ItemViewChanges(creature, item);
        if (amount < item.amount) {
            item.amount -= amount;
            this.set_ToChange("Character", item.id);
        } else {
            if ((item instanceof Equipment) || (item instanceof Rune) || (item instanceof Oil)) {
                item.hints?.forEach((hint: Hint) => {
                    this.set_TagsToChange(creature.type, hint.showon);
                })
            }
            if ((item instanceof Equipment) || (item instanceof Rune)) {
                item.activities.forEach(activity => {
                    if (activity.active) {
                        this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, activity, activity, false);
                    }
                })
            }
            if (item instanceof Equipment) {
                if (item.equipped) {
                    this.onEquip(creature, inventory, item as Equipment, false, false);
                } else if (item.invested && item.can_Invest()) {
                    this.on_Invest(creature, inventory, item as Equipment, false, false);
                }
                if (item.propertyRunes) {
                    item.propertyRunes.filter((rune: Rune) => rune.loreChoices.length).forEach((rune: Rune) => {
                        this.remove_RuneLore(rune);
                    })
                }
                if (item.gainActivities) {
                    item.gainActivities.forEach(gain => {
                        if (gain.active) {
                            this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, gain, this.activitiesService.get_Activities(gain.name)[0], false);
                        }
                    })
                }
                if (item.gainInventory?.length) {
                    creature.inventories.filter(existingInventory => existingInventory.itemId == item.id).forEach(gainedInventory => {
                        gainedInventory.allItems().forEach(inventoryItem => {
                            this.drop_InventoryItem(creature, gainedInventory, inventoryItem, false, false, including);
                        })
                    });
                    creature.inventories = creature.inventories.filter(existingInventory => existingInventory.itemId != item.id);
                }
                if (including) {
                    item.gainItems.filter((gainItem: ItemGain) => gainItem.on == "grant").forEach(gainItem => {
                        this.lose_GainedItem(creature, gainItem);
                    });
                }
            }
            item.oilsApplied.filter((oil: Oil) => oil.runeEffect.loreChoices.length).forEach((oil: Oil) => {
                this.remove_RuneLore(oil.runeEffect);
            })

            inventory[item.type] = inventory[item.type].filter((any_item: Item) => any_item !== item);
            if (equipBasicItems) {
                this.equip_BasicItems(creature);
            }
        }
        //If the item still exists at this point, unmark it for deletion, so it doesn't become un-droppable.
        item.markedForDeletion = false;
        if (item instanceof AlchemicalBomb || item instanceof OtherConsumableBomb || item instanceof Ammunition || item instanceof Snare) {
            this.set_ToChange(creature.type, "attacks");
        }
        if (changeAfter) {
            this.process_ToChange()
        }
        this.set_Changed(item.id);
    }

    add_RuneLore(rune: Rune) {
        //Go through all the loreChoices (usually only one)
        rune.loreChoices.forEach(choice => {
            //Check if only one (=this) item's rune has this lore (and therefore no other item has already created it on the character), and if so, create it.
            if (
                this.get_Character().inventories[0]?.allEquipment()
                    .filter(item => item.propertyRunes
                        .some(propertyRune => propertyRune.loreChoices
                            .some(otherchoice => otherchoice.loreName == choice.loreName)
                        )
                    ).length +
                this.get_Character().inventories[0]?.allEquipment()
                    .filter(item => item.oilsApplied
                        .some(oil => oil.runeEffect && oil.runeEffect.loreChoices
                            .some(otherchoice => otherchoice.loreName == choice.loreName)
                        )
                    ).length == 1) {
                this.get_Character().add_Lore(this, choice);
            }
        });
    }

    remove_RuneLore(rune: Rune) {
        //Iterate through the loreChoices (usually only one)
        rune.loreChoices.forEach(choice => {
            //Check if only one item's rune has this lore (and therefore no other rune still needs it created), and if so, remove it.
            if (this.get_Character().inventories[0]?.allEquipment()
                .filter(item => item.propertyRunes
                    .filter(propertyRune => propertyRune.loreChoices
                        .filter(otherchoice => otherchoice.loreName == choice.loreName)
                        .length)
                    .length)
                .length +
                this.get_Character().inventories[0]?.allEquipment()
                    .filter(item => item.oilsApplied
                        .filter(oil => oil.runeEffect && oil.runeEffect.loreChoices
                            .filter(otherchoice => otherchoice.loreName == choice.loreName)
                            .length)
                        .length)
                    .length == 1) {
                this.get_Character().remove_Lore(this, choice);
            }
        });
    }

    change_Cash(multiplier: number = 1, sum: number, plat: number = 0, gold: number = 0, silver: number = 0, copper: number = 0) {
        if (sum) {
            //Resolve a sum (in copper) into platinum, gold, silver and copper.
            // Gold is prioritised - only gold amounts over 1000 are exchanged for platinum.
            plat = gold = silver = copper = 0;
            plat = Math.floor(sum / 100000) * 100;
            sum %= 100000;
            gold = Math.floor(sum / 100);
            sum %= 100;
            silver = Math.floor(sum / 10);
            sum %= 10;
            copper = sum;
        }
        if (copper) {
            this.get_Character().cash[3] += (copper * multiplier);
            if (this.get_Character().cash[3] < 0) {
                if (this.get_Character().cash[2] > 0 || this.get_Character().cash[1] > 0 || this.get_Character().cash[0] > 0) {
                    silver += Math.floor(this.get_Character().cash[3] / 10) * multiplier;
                    this.get_Character().cash[3] -= Math.floor(this.get_Character().cash[3] / 10) * 10;
                }
            };
        }
        if (silver) {
            this.get_Character().cash[2] += (silver * multiplier);
            if (this.get_Character().cash[2] < 0) {
                if (this.get_Character().cash[1] > 0 || this.get_Character().cash[0] > 0) {
                    gold += Math.floor(this.get_Character().cash[2] / 10) * multiplier;
                    this.get_Character().cash[2] -= Math.floor(this.get_Character().cash[2] / 10) * 10;
                }
            };
        }
        if (gold) {
            this.get_Character().cash[1] += (gold * multiplier);
            if (this.get_Character().cash[1] < 0) {
                if (this.get_Character().cash[0] > 0) {
                    plat += Math.floor(this.get_Character().cash[1] / 10) * multiplier;
                    this.get_Character().cash[1] -= Math.floor(this.get_Character().cash[1] / 10) * 10;
                }
            };
        }
        if (plat) {
            this.get_Character().cash[0] += (plat * multiplier);
            if (this.get_Character().cash[0] < 0) {
                this.sort_Cash();
            }
        }
        if (this.get_Character().cash[0] < 0 || this.get_Character().cash[1] < 0 || this.get_Character().cash[2] < 0) {
            this.sort_Cash();
        }
        this.set_ToChange("Character", "inventory");
    }

    sort_Cash() {
        let sum = (this.get_Character().cash[0] * 1000) + (this.get_Character().cash[1] * 100) + (this.get_Character().cash[2] * 10) + (this.get_Character().cash[3]);
        this.get_Character().cash = [0, 0, 0, 0];
        this.change_Cash(1, sum);
    }

    set_ItemViewChanges(creature: Character | AnimalCompanion, item: Item) {
        if (item instanceof AlchemicalBomb || item instanceof OtherConsumableBomb || item instanceof AlchemicalPoison || item instanceof Ammunition || item instanceof Snare) {
            this.set_ToChange(creature.type, "attacks");
        }
        if (item instanceof Equipment || item instanceof Rune || item instanceof Oil) {
            item.hints?.forEach((hint: Hint) => {
                this.set_TagsToChange(creature.type, hint.showon);
                if (hint.effects.length) {
                    this.set_ToChange(creature.type, "effects");
                }
            })
        }
        if (item instanceof Equipment || item instanceof ArmorRune) {
            if (item.effects?.length) {
                this.set_ToChange(creature.type, "effects");
            }
        }
        if (item instanceof Equipment) {
            this.set_EquipmentViewChanges(this.get_Character(), item as Equipment);
        }
    }

    set_EquipmentViewChanges(creature: Character | AnimalCompanion, item: Equipment) {
        //Prepare refresh list according to the item's properties.
        if (item instanceof Shield || item instanceof Armor || item instanceof Weapon) {
            this.set_ToChange(creature.type, "defense");
            //There are effects that are based on your currently equipped armor and shield.
            //That means we have to check the effects whenever we equip or unequip one of those.
            this.set_ToChange(creature.type, "effects");
        }
        if (item instanceof Weapon || (item instanceof WornItem && item.isHandwrapsOfMightyBlows)) {
            this.set_ToChange(creature.type, "attacks");
            //There are effects that are based on your currently weapons.
            //That means we have to check the effects whenever we equip or unequip one of those.
            this.set_ToChange(creature.type, "effects");
        }
        item.hints.forEach(hint => {
            this.set_TagsToChange(creature.type, hint.showon);
        })
        item.traits.map(trait => this.traitsService.get_Traits(trait)[0])?.filter(trait => trait?.hints?.length).forEach(trait => {
            trait.hints.forEach(hint => {
                this.set_TagsToChange(creature.type, hint.showon);
            })
        })
        if (item.effects.length) {
            this.set_ToChange(creature.type, "effects");
        }
        if (item.gainConditions.length) {
            this.set_ToChange(creature.type, "effects");
        }
        if (item.activities?.length) {
            this.set_ToChange(creature.type, "activities");
        }
        if (item.gainActivities?.length) {
            this.set_ToChange(creature.type, "activities");
        }
        item.propertyRunes.forEach((rune: Rune) => {
            if (item instanceof Armor) {
                rune.hints?.forEach(hint => {
                    this.set_TagsToChange(creature.type, hint.showon);
                })
                if ((rune as ArmorRune).effects?.length) {
                    this.set_ToChange(creature.type, "effects");
                }
            }
            if (rune.activities?.length) {
                this.set_ToChange(creature.type, "activities");
            }
        });
        if (item instanceof AdventuringGear) {
            if (item.isArmoredSkirt) {
                this.set_ToChange(creature.type, "inventory");
                this.set_ToChange(creature.type, "defense");
            }
        }
        if (item instanceof WornItem) {
            if (item.isDoublingRings) {
                this.set_ToChange(creature.type, "inventory");
                this.set_ToChange(creature.type, "attacks");
            }
            if (item.isHandwrapsOfMightyBlows) {
                this.set_ToChange(creature.type, "inventory");
                this.set_ToChange(creature.type, "attacks");
            }
        }
    }

    onEquip(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Equipment, equipped: boolean = true, changeAfter: boolean = true, equipBasicItems: boolean = true) {
        //Only allow equipping or unequipping for items that the creature can wear. Only allow equipping items in inventories that aren't containers.
        //Unequip any item that lands here and can't be equipped.
        let oldequipped = item.equipped;
        if ((creature.type == "Character" && !item.traits.includes("Companion")) || (creature.type == "Companion" && item.traits.includes("Companion")) || item.name == "Unarmored" && !inventory.itemId) {
            item.equipped = equipped;
        } else {
            item.equipped = false;
        }
        this.set_ToChange(creature.type, "inventory");
        this.set_EquipmentViewChanges(creature, item);
        if (!oldequipped && item.equipped) {
            if (item instanceof Armor || item instanceof Shield) {
                let allOfType = inventory[item.type];
                //If you equip a shield that is already raised, preserve that status (e.g. for the Shield spell).
                let raised = false;
                if (item instanceof Shield && item.raised) {
                    raised = true;
                }
                allOfType.forEach(typeItem => {
                    this.onEquip(creature, inventory, typeItem, false, false, false);
                });
                item.equipped = true;
                if (item instanceof Shield) {
                    item.raised = raised;
                }
            }
            //If you get an Activity from an item that doesn't need to be invested, immediately invest it in secret so the Activity is gained
            if ((item.gainActivities || item.activities) && !item.can_Invest()) {
                this.on_Invest(creature, inventory, item, true, false);
            }
            //Add all Items that you get from equipping this one
            if (item.gainItems && item.gainItems.length) {
                item.gainItems.filter((gainItem: ItemGain) => gainItem.on == "equip").forEach(gainItem => {
                    let newItem: Item = this.itemsService.get_Items()[gainItem.type].find((libraryItem: Item) => libraryItem.name.toLowerCase() == gainItem.name.toLowerCase());
                    if (newItem.can_Stack()) {
                        this.grant_InventoryItem(creature, inventory, newItem, false, false, false, gainItem.amount + (gainItem.amountPerLevel * creature.level));
                    } else {
                        let equip = true;
                        //Don't equip the new item if it's a shield or armor and this one is too - only one shield or armor can be equipped
                        if ((item instanceof Armor || item instanceof Shield) && newItem.type == item.type) {
                            equip = false;
                        }
                        let grantedItem = this.grant_InventoryItem(creature, inventory, newItem, false, false, equip);
                        gainItem.id = grantedItem.id;
                        if (grantedItem.get_Name) {
                            grantedItem.grantedBy = "(Granted by " + item.name + ")"
                        };
                    }
                });
            }
        } else if (oldequipped && !item.equipped) {
            if (equipBasicItems) {
                this.equip_BasicItems(creature);
            }
            //If you are unequipping a shield, you should also be lowering it and losing cover
            if (item instanceof Shield) {
                if (item.takingCover) {
                    this.get_AC().set_Cover(creature, 0, item, this, this.conditionsService);
                    item.takingCover = false;
                }
                item.raised = false;
            }
            //If the item was invested, it isn't now.
            if (item.invested) {
                this.on_Invest(creature, inventory, item, false, false);
            }
            if (item.gainItems?.length) {
                item.gainItems.filter((gainItem: ItemGain) => gainItem.on == "equip").forEach(gainItem => {
                    this.lose_GainedItem(creature, gainItem);
                });
            }
            item.propertyRunes?.forEach(rune => {
                //Deactivate any active toggled activities of inserted runes.
                rune.activities.filter(activity => activity.toggle && activity.active).forEach(activity => {
                    this.activitiesService.activate_Activity(this.get_Character(), "Character", this, this.conditionsService, this.itemsService, this.spellsService, activity, activity, false);
                })
            })
        }
        if (changeAfter) {
            this.process_ToChange();
        }
    }

    lose_GainedItem(creature: Character | AnimalCompanion, gainedItem: ItemGain) {
        let toDrop: number = gainedItem.amount;
        creature.inventories.forEach(inventory => {
            //Find items that either have this ItemGain's id or, if stackable, its name.
            //Then drop as many of them as the amount demands.
            inventory[gainedItem.type].filter(invItem => invItem.id == gainedItem.id || (invItem.can_Stack() && invItem.name == gainedItem.name)).forEach(invItem => {
                if (toDrop) {
                    let dropped = Math.min(toDrop, invItem.amount);
                    toDrop -= dropped;
                    this.drop_InventoryItem(creature, inventory, invItem, false, false, true, dropped);
                }
            })
        })
        gainedItem.id = "";
    }

    on_Invest(creature: Character | AnimalCompanion, inventory: ItemCollection, item: Equipment, invested: boolean = true, changeAfter: boolean = true) {
        item.invested = invested;
        this.set_ToChange(creature.type, "inventory");
        if (item instanceof WornItem && item.gainSpells.length) {
            this.set_ToChange(creature.type, "spellbook");
        }
        if (item.invested) {
            if (!item.equipped) {
                this.onEquip(creature, inventory, item, true, false);
            } else {
                this.set_EquipmentViewChanges(creature, item);
            }
        } else {
            item.gainActivities.filter(gainActivity => gainActivity.active).forEach((gainActivity: ActivityGain) => {
                let libraryActivity = this.activitiesService.get_Activities(gainActivity.name)[0];
                if (libraryActivity) {
                    this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, gainActivity, libraryActivity, false);
                }
            });
            item.activities.filter(itemActivity => itemActivity.active).forEach((itemActivity: ItemActivity) => {
                this.activitiesService.activate_Activity(creature, "", this, this.conditionsService, this.itemsService, this.spellsService, itemActivity, itemActivity, false);
            })
            this.set_EquipmentViewChanges(creature, item);
        }
        if (changeAfter) {
            this.process_ToChange();
        }
    }

    on_ConsumableUse(creature: Character | AnimalCompanion, item: Consumable, preserveItem: boolean = false) {
        if (!preserveItem) {
            item.amount--
        }
        this.itemsService.process_Consumable(creature, this, this.itemsService, this.conditionsService, this.spellsService, item);
        this.set_ItemViewChanges(creature, item);
        this.set_ToChange(creature.type, "inventory");
    }

    grant_BasicItems() {
        //This function depends on the items being loaded, and it will wait forever for them!
        if (this.itemsService.still_loading()) {
            setTimeout(() => {
                this.grant_BasicItems();
            }, 500)
        } else {
            this.basicItems = [];
            let newBasicWeapon: Weapon = Object.assign(new Weapon(), this.itemsService.get_ItemsOfType("weapons", "Fist")[0]);
            this.basicItems.push(newBasicWeapon);
            let newBasicArmor: Armor;
            newBasicArmor = Object.assign(new Armor(), this.itemsService.get_ItemsOfType("armors", "Unarmored")[0]);
            this.basicItems.push(newBasicArmor);
            this.equip_BasicItems(this.get_Character(), false)
            this.equip_BasicItems(this.get_Companion(), false)
        }
    }

    equip_BasicItems(creature: Character | AnimalCompanion, changeAfter: boolean = true) {
        if (!this.still_loading() && this.basicItems.length) {
            if (!creature.inventories[0].weapons.length && creature.type == "Character") {
                this.grant_InventoryItem(creature, creature.inventories[0], this.basicItems[0], true, false, false);
            }
            if (!creature.inventories[0].armors.length) {
                this.grant_InventoryItem(creature, creature.inventories[0], this.basicItems[1], true, false, false);
            }
            if (!creature.inventories[0].weapons.some(weapon => weapon.equipped == true)) {
                if (creature.inventories[0].weapons.length) {
                    this.onEquip(creature, creature.inventories[0], creature.inventories[0].weapons[0], true, changeAfter);
                }
            }
            if (!creature.inventories[0].armors.some(armor => armor.equipped == true)) {
                this.onEquip(creature, creature.inventories[0], creature.inventories[0].armors[0], true, changeAfter);
            }
        }
    }

    add_CustomSkill(skillName: string, type: string, abilityName: string, locked: boolean = false, recallKnowledge: boolean = false) {
        this.get_Character().customSkills.push(new Skill(abilityName, skillName, type, locked, recallKnowledge));
    }

    remove_CustomSkill(oldSkill: Skill) {
        this.get_Character().customSkills = this.get_Character().customSkills.filter(skill => skill !== oldSkill);
    }

    add_CustomFeat(newFeat: Feat) {
        let newLength = this.get_Character().customFeats.push(Object.assign(new Feat(), JSON.parse(JSON.stringify(newFeat))));
        this.get_Character().customFeats[newLength - 1] = this.savegameService.reassign(this.get_Character().customFeats[newLength - 1]);
        this.set_ToChange("Character", "charactersheet");
        return newLength;
    }

    remove_CustomFeat(oldFeat: Feat) {
        this.get_Character().customFeats = this.get_Character().customFeats.filter(skill => skill !== oldFeat);
    }

    get_Conditions(name: string = "", type: string = "") {
        return this.conditionsService.get_Conditions(name, type);
    }

    get_AppliedConditions(creature: Creature, name: string = "", source: string = "", readonly: boolean = false) {
        //Returns ConditionGain[] with apply=true/false for each
        return this.conditionsService.get_AppliedConditions(creature, this, creature.conditions, readonly).filter(condition =>
            (condition.name == name || name == "") &&
            (condition.source == source || source == "")
        );
    }

    add_Condition(creature: Creature, originalConditionGain: ConditionGain, reload: boolean = true, parentConditionGain: ConditionGain = null) {
        let activate: boolean = true;
        let conditionGain: ConditionGain = Object.assign(new ConditionGain(), JSON.parse(JSON.stringify(originalConditionGain)));
        let originalCondition = this.get_Conditions(conditionGain.name)[0];
        if (originalCondition) {
            if (conditionGain.heightened < originalCondition.minLevel) {
                conditionGain.heightened = originalCondition.minLevel;
            }
            //If the condition has an activationPrerequisite, test that first and only activate if it evaluates to a nonzero number.
            if (conditionGain.activationPrerequisite) {
                let testConditionGain: any = Object.assign(new ConditionGain(), JSON.parse(JSON.stringify(conditionGain)));
                let testEffectGain: EffectGain = new EffectGain();
                testEffectGain.value = conditionGain.activationPrerequisite;
                testConditionGain.effects = [testEffectGain];
                let effects = this.effectsService.get_SimpleEffects(creature, this, testConditionGain, "", parentConditionGain);
                if (effects?.[0]?.value == "0" || !(parseInt(effects?.[0]?.value))) {
                    activate = false;
                }
            }
            if (activate) {
                //If the conditionGain has duration -5, use the default duration depending on spell level and effect choice.
                if (conditionGain.duration == -5) {
                    conditionGain.duration = originalCondition.get_DefaultDuration(conditionGain.choice, conditionGain.heightened).duration;
                }
                //If there are choices, and the choice is not set by the gain, take the default or the first choice.
                if (originalCondition.choices.length && !conditionGain.choice) {
                    conditionGain.choice = originalCondition.choice || originalCondition.choices[0].name;
                }
                //If there is a choice, check if there is a nextStage value of that choice.
                if (conditionGain.choice) {
                    conditionGain.nextStage = originalCondition.choices.find(choice => choice.name == conditionGain.choice)?.nextStage || 0;
                }
                if (conditionGain.nextStage) {
                    this.set_ToChange(creature.type, "time");
                    this.set_ToChange(creature.type, "health");
                }
                if (conditionGain.heightened < originalCondition.minLevel) {
                    conditionGain.heightened = originalCondition.minLevel
                }
                if (!conditionGain.radius) {
                    conditionGain.radius = originalCondition.radius;
                }
                //Set persistent if the condition is, unless ignorePersistent is set. Don't just set gain.persistent = condition.persistent, because condition.persistent could be false.
                if (originalCondition.persistent && !conditionGain.ignorePersistent) {
                    conditionGain.persistent = true;
                }
                conditionGain.decreasingValue = originalCondition.decreasingValue;
                conditionGain.notes = originalCondition.notes;
                conditionGain.showNotes = conditionGain.notes && true;
                let newLength: number = 0;
                if (conditionGain.addValue) {
                    let existingConditions = creature.conditions.filter(gain => gain.name == conditionGain.name);
                    if (existingConditions.length) {
                        existingConditions.forEach(gain => {
                            gain.value += conditionGain.addValue;
                            if (conditionGain.addValueUpperLimit) {
                                gain.value = Math.min(gain.value, conditionGain.addValueUpperLimit);
                            }
                            if (conditionGain.addValueLowerLimit) {
                                gain.value = Math.max(gain.value, conditionGain.addValueLowerLimit);
                            }
                            //If this condition gain has both locked properties and addValue, transfer these properties and change the parentID to this one, but only if the existing gain does not have them.
                            if (conditionGain.lockedByParent && !gain.lockedByParent) {
                                gain.lockedByParent = true;
                                gain.parentID = conditionGain.parentID;
                            }
                            if (conditionGain.valueLockedByParent && !gain.valueLockedByParent) {
                                gain.valueLockedByParent = true;
                                gain.parentID = conditionGain.parentID;
                            }
                            if (conditionGain.persistent) {
                                gain.persistent = true;
                            }
                        })
                        this.set_ToChange(creature.type, "effects");
                    } else {
                        if (!conditionGain.value) {
                            conditionGain.value = conditionGain.addValue;
                            if (conditionGain.addValueUpperLimit) {
                                conditionGain.value = Math.min(conditionGain.value, conditionGain.addValueUpperLimit);
                            }
                            if (conditionGain.addValueLowerLimit) {
                                conditionGain.value = Math.max(conditionGain.value, conditionGain.addValueLowerLimit);
                            }
                        }
                        if (conditionGain.value > 0) {
                            newLength = creature.conditions.push(conditionGain);
                        }
                    }
                } else {
                    //Don't add permanent persistent conditions without a value if the same condition already exists with these parameters.
                    if (!(!conditionGain.value && conditionGain.persistent && conditionGain.duration == -1 && this.get_AppliedConditions(creature, "", "", true).some(existingGain => existingGain.name == conditionGain.name && !existingGain.value && existingGain.persistent && existingGain.duration == -1))) {
                        newLength = creature.conditions.push(conditionGain);
                    }
                }
                if (newLength) {
                    this.conditionsService.process_Condition(creature, this, this.effectsService, this.itemsService, conditionGain, this.conditionsService.get_Conditions(conditionGain.name)[0], true);
                    this.set_ToChange(creature.type, "effects");
                    this.set_ToChange(creature.type, "effects-component");
                    if (reload) {
                        this.process_ToChange();
                    }
                    return newLength;
                }
            }
        }
        return 0;
    }

    remove_Condition(creature: Creature, conditionGain: ConditionGain, reload: boolean = true, increaseWounded: boolean = true, keepPersistent: boolean = true, ignoreLockedByParent: boolean = false, ignoreEndsWithConditions: boolean = false) {
        //Find the correct condition gain to remove. This can be the exact same as the conditionGain parameter, but if it isn't, find the most similar one:
        //- Find all condition gains with similar name, value and source, then if there are more than one of those:
        //-- Try finding one that has the exact same attributes.
        //-- If none is found, find one that has the same duration.
        //- If none is found or the list has only one, take the first.
        let oldConditionGain: ConditionGain = creature.conditions.find(gain => gain === conditionGain);
        if (!oldConditionGain) {
            let oldConditionGains: ConditionGain[] = creature.conditions.filter(gain => gain.name == conditionGain.name && gain.value == conditionGain.value && gain.source == conditionGain.source);
            if (oldConditionGains.length > 1) {
                oldConditionGain = oldConditionGains.find(gain => JSON.stringify(gain) == JSON.stringify(conditionGain))
                if (!oldConditionGain) {
                    oldConditionGain = oldConditionGains.find(gain => gain.duration == conditionGain.duration)
                }
            }
            if (!oldConditionGain) {
                oldConditionGain = oldConditionGains[0]
            }
        }
        let originalCondition = this.get_Conditions(conditionGain.name)[0];
        //If this condition is locked by its parent, it can't be removed.
        if (oldConditionGain && (ignoreLockedByParent || !oldConditionGain.lockedByParent)) {
            if (oldConditionGain.nextStage || oldConditionGain.duration == 1) {
                this.set_ToChange(creature.type, "time");
                this.set_ToChange(creature.type, "health");
            }
            //Remove the parent lock for all conditions locked by this, so that they can be removed in the next step or later (if persistent).
            this.remove_LockedByParent(creature, oldConditionGain.id);
            this.get_AppliedConditions(creature, "", oldConditionGain.name, true).filter(gain =>
                gain.parentID == oldConditionGain.id
            ).forEach(extraCondition => {
                if (!(keepPersistent && extraCondition.persistent)) {
                    //Remove child conditions that are not persistent, or remove all if keepPersistent is false.
                    this.remove_Condition(creature, extraCondition, false, increaseWounded, keepPersistent, ignoreLockedByParent, ignoreEndsWithConditions);
                } else if (extraCondition.persistent) {
                    //If this condition adds persistent conditions, don't remove them, but remove the persistent flag as its parent is gone.
                    this.remove_Persistent(creature, extraCondition);
                }
            })
            creature.conditions.splice(creature.conditions.indexOf(oldConditionGain), 1);
            this.conditionsService.process_Condition(creature, this, this.effectsService, this.itemsService, oldConditionGain, originalCondition, false, increaseWounded, ignoreEndsWithConditions);
            if (oldConditionGain.source == "Quick Status") {
                this.set_ToChange(creature.type, "defense");
                this.set_ToChange(creature.type, "attacks");
            }
            this.set_ToChange(creature.type, "effects");
            this.set_ToChange(creature.type, "effects-component");
            if (reload) {
                this.process_ToChange();
            }
            return true;
        }
        return false;
    }

    remove_Persistent(creature: Creature, conditionGain: ConditionGain) {
        //This function removes the persistent attribute from a condition gain, allowing it to be removed normally.
        //Find the correct condition to remove the persistent attribute:
        //- Find all persistent condition gains with similar name, value and source, then if there are more than one of those:
        //-- Try finding one that has the exact same attributes.
        //-- If none is found, find one that has the same duration.
        //- If none is found or the list has only one, take the first.
        let oldConditionGain: ConditionGain;
        let oldConditionGains: ConditionGain[] = creature.conditions.filter(gain => gain.name == conditionGain.name && gain.source == conditionGain.source && gain.persistent);
        if (oldConditionGains.length > 1) {
            oldConditionGain = oldConditionGains.find(gain => JSON.stringify(gain) == JSON.stringify(conditionGain))
            if (!oldConditionGain) {
                oldConditionGain = oldConditionGains.find(gain => gain.duration == conditionGain.duration)
            }
        }
        if (!oldConditionGain) {
            oldConditionGain = oldConditionGains[0]
        }
        if (oldConditionGain) {
            oldConditionGain.persistent = false;
        }
    }

    remove_LockedByParent(creature: Creature, id: string) {
        //This function removes the lockedByParent and lockedByID attributes from all condition gains locked by the given ID.
        creature.conditions.filter(gain => gain.parentID == id).forEach(gain => {
            gain.lockedByParent = false;
            gain.valueLockedByParent = false;
        });
    }

    get_MessageCreature(message: PlayerMessage) {
        return this.get_Creatures().find(creature => creature.id == message.targetId);
    }

    get_MessageSender(message: PlayerMessage) {
        return this.savegameService.get_Savegames().find(savegame => savegame.id == message.senderId)?.name;
    }

    send_TurnChangeToPlayers() {
        //Don't send messages in GM mode or manual mode.
        if (this.get_GMMode() || this.get_ManualMode()) {
            return false;
        }
        let timeStamp: number = 0;
        let character = this.get_Character();
        let targets = this.savegameService.get_Savegames().filter(savegame => savegame.partyName == character.partyName && savegame.id != character.id);
        this.messageService.get_Time().subscribe((result: string[]) => {
            timeStamp = result["time"];
            let messages: PlayerMessage[] = [];
            targets.forEach(target => {
                let message = new PlayerMessage();
                message.recipientId = target.id;
                message.senderId = character.id;
                message.targetId = "";
                let date = new Date();
                message.time = date.getHours() + ":" + date.getMinutes();
                message.timeStamp = timeStamp;
                message.turnChange = true;
                messages.push(message);
            })
            if (messages.length) {
                this.messageService.send_Messages(messages).subscribe((result) => {
                    //Don't notify the user that a turn change was sent. It proved more annoying than useful.
                    //this.toastService.show("Sent turn change to " + (messages.length) + " targets.", [], this);
                }, (error) => {
                    this.toastService.show("An error occurred while sending effects. See console for more information.", [], this);
                    console.log('Error saving effect messages to database: ' + error.message);
                });;
            }
        }, (error) => {
            this.toastService.show("An error occurred while sending effects. See console for more information.", [], this);
            console.log('Error saving effect messages to database: ' + error.message);
        });
    }

    apply_TurnChangeMessage(messages: PlayerMessage[]) {
        //Don't receive messages in manual mode.
        if (this.get_ManualMode()) {
            return false;
        }
        //For each senderId that you have a turnChange message from, remove all conditions that came from this sender and have duration 2.
        Array.from(new Set(messages.filter(message => message.selected).map(message => message.senderId))).forEach(senderId => {
            let removed: boolean = false;
            this.get_Creatures().forEach(creature => {
                this.get_AppliedConditions(creature)
                    .filter(existingConditionGain => existingConditionGain.foreignPlayerId == senderId && existingConditionGain.duration == 2)
                    .forEach(existingConditionGain => {
                        removed = this.remove_Condition(creature, existingConditionGain, false);
                        if (removed) {
                            let senderName = this.savegameService.get_Savegames().find(savegame => savegame.id == senderId)?.name || "Unknown";
                            this.toastService.show("Automatically removed <strong>" +
                                existingConditionGain.name + (existingConditionGain.choice ? ": " + existingConditionGain.choice : "") + "</strong> condition from <strong>" +
                                (creature.name || creature.type) + "</strong> on turn of <strong>" + senderName + "</strong>", [], this);
                            this.set_ToChange(creature.type, "effects");
                        }
                    });
            })
        })
        messages.forEach(message => {
            this.messageService.mark_MessageAsIgnored(this, message);
        })
    }

    send_ConditionToPlayers(targets: SpellTarget[], conditionGain: ConditionGain, activate: boolean = true) {
        //Don't send messages in GM mode or manual mode.
        if (this.get_GMMode() || this.get_ManualMode()) {
            return false;
        }
        let timeStamp: number = 0;
        let creatures = this.get_Creatures();
        this.messageService.get_Time().subscribe((result: string[]) => {
            timeStamp = result["time"];
            let messages: PlayerMessage[] = [];
            targets.forEach(target => {
                if (creatures.some(creature => creature.id == target.id)) {
                    //Catch any messages that go to your own creatures
                    this.add_Condition(this.get_Creature(target.type), conditionGain);
                } else {
                    //Build a message to the correct player and creature, with the timestamp just received from the database connector.
                    let message = new PlayerMessage();
                    message.recipientId = target.playerId;
                    message.senderId = this.get_Character().id;
                    message.targetId = target.id;
                    let date = new Date();
                    message.time = date.getHours() + ":" + date.getMinutes();
                    message.timeStamp = timeStamp;
                    message.gainCondition.push(Object.assign(new ConditionGain(), JSON.parse(JSON.stringify(conditionGain))));
                    if (message.gainCondition.length) {
                        message.gainCondition[0].foreignPlayerId = message.senderId;
                    }
                    message.activateCondition = activate;
                    messages.push(message);
                }
            })
            if (messages.length) {
                this.messageService.send_Messages(messages).subscribe((result) => {
                    //If messages were sent, send a summary toast.
                    this.toastService.show("Sent effects to " + (messages.length) + " targets.", [], this);
                }, (error) => {
                    this.toastService.show("An error occurred while sending effects. See console for more information.", [], this);
                    console.log('Error saving effect messages to database: ' + error.message);
                });;
            }
        }, (error) => {
            this.toastService.show("An error occurred while sending effects. See console for more information.", [], this);
            console.log('Error saving effect messages to database: ' + error.message);
        });
    }

    apply_MessageConditions(messages: PlayerMessage[]) {
        //Don't receive messages in manual mode.
        if (this.get_ManualMode()) {
            return false;
        }
        //Iterate through all messages that have a gainCondition (only one per message will be applied) and either add or remove the appropriate conditions.
        //The ConditionGains have a foreignPlayerId that allows us to recognize that they came from this player.
        messages.forEach(message => {
            if (message.selected) {
                let targetCreature = this.get_MessageCreature(message);
                if (message.activateCondition) {
                    if (targetCreature && message.gainCondition.length) {
                        let conditionGain: ConditionGain = message.gainCondition[0];
                        let newLength = this.add_Condition(targetCreature, conditionGain, false, null)
                        if (newLength) {
                            let senderName = this.get_MessageSender(message);
                            //If a condition was created, send a toast to inform the user.
                            this.toastService.show("Added <strong>" +
                                conditionGain.name + (conditionGain.choice ? ": " + conditionGain.choice : "") + "</strong> condition to <strong>" +
                                (targetCreature.name || targetCreature.type) + "</strong> (sent by <strong>" + senderName.trim() + "</strong>)", [], this);
                        }
                    }
                } else {
                    if (targetCreature && message.gainCondition.length) {
                        let conditionGain: ConditionGain = message.gainCondition[0];
                        let removed: boolean = false
                        this.get_AppliedConditions(targetCreature, message.gainCondition[0].name)
                            .filter(existingConditionGain => existingConditionGain.foreignPlayerId == message.senderId && existingConditionGain.source == message.gainCondition[0].source)
                            .forEach(existingConditionGain => {
                                removed = this.remove_Condition(targetCreature, existingConditionGain, false);
                            });
                        if (removed) {
                            let senderName = this.get_MessageSender(message);
                            //If a condition was removed, send a toast to inform the user.
                            this.toastService.show("Removed <strong>" +
                                conditionGain.name + (conditionGain.choice ? ": " + conditionGain.choice : "") + "</strong> condition from <strong>" +
                                (targetCreature.name || targetCreature.type) + "</strong> (added by <strong>" + senderName.trim() + "</strong>)", [], this);
                        }
                    }
                }
            }
            this.messageService.mark_MessageAsIgnored(this, message);
        })
    }

    send_ItemsToPlayer(sender: Character | AnimalCompanion, target: SpellTarget, item: Item, amount: number = 0) {
        //Don't send messages in GM mode or manual mode.
        if (this.get_GMMode() || this.get_ManualMode()) {
            return false;
        }
        if (!amount) {
            amount == item.amount;
        }
        item = this.itemsService.update_GrantingItem(sender, item);
        let included: { items: Item[], inventories: ItemCollection[] } = this.itemsService.pack_GrantingItem(sender, item);
        let timeStamp: number = 0;
        this.messageService.get_Time().subscribe((result: string[]) => {
            timeStamp = result["time"];
            //Build a message to the correct player and creature, with the timestamp just received from the database connector.
            let message = new PlayerMessage();
            message.recipientId = target.playerId;
            message.senderId = this.get_Character().id;
            message.targetId = target.id;
            let date = new Date();
            message.time = date.getHours() + ":" + date.getMinutes();
            message.timeStamp = timeStamp;
            message.offeredItem.push(Object.assign(new Item(), JSON.parse(JSON.stringify(item))));
            message.itemAmount = amount;
            message.includedItems = included.items;
            message.includedInventories = included.inventories;
            this.messageService.send_Messages([message]).subscribe((result) => {
                //If the message was sent, send a summary toast.
                this.toastService.show("Sent item offer to <strong>" + target.name + "</strong>.", [], this);
            }, (error) => {
                this.toastService.show("An error occurred while sending item. See console for more information.", [], this);
                console.log('Error saving item message to database: ' + error.message);
            });;
        }, (error) => {
            this.toastService.show("An error occurred while sending item. See console for more information.", [], this);
            console.log('Error saving item message to database: ' + error.message);
        });
    }

    apply_MessageItems(messages: PlayerMessage[]) {
        //Don't receive messages in manual mode.
        if (this.get_ManualMode()) {
            return false;
        }
        //Iterate through all messages that have an offeredItem (only one per message will be applied) and add the items.
        messages.forEach(message => {
            let targetCreature = this.get_MessageCreature(message);
            if (message.selected) {
                let sender = this.get_MessageSender(message);
                if (targetCreature && message.offeredItem.length) {
                    //We can't use grant_InventoryItem, because these items are initialized and possibly bringing their own inventories and gained items.
                    //We have to process the item directly here.
                    if (targetCreature instanceof Character || targetCreature instanceof AnimalCompanion) {
                        let targetInventory = targetCreature.inventories[0];
                        let addedPrimaryItem: Item;
                        message.offeredItem.concat(message.includedItems).forEach(item => {
                            if (item === message.offeredItem[0]) {
                                item.amount = message.itemAmount;
                            }
                            let existingItems = targetInventory[item.type].filter((existing: Item) => existing.name == item.name && existing.can_Stack() && !item.expiration);
                            //If any existing, stackable items are found, add this item's amount on top and finish.
                            //If no items are found, add the new item to the inventory and process it as a new item (skipping gained items and gained inventories).
                            if (existingItems.length) {
                                existingItems[0].amount += item.amount;
                                if (item.id === message.offeredItem[0].id) {
                                    addedPrimaryItem = existingItems[0];
                                }
                                this.set_ToChange(targetCreature.type, "inventory");
                                this.set_Changed(existingItems[0].id);
                            } else {
                                item = this.reassign(item);
                                let newLength = targetInventory[item.type].push(item);
                                let addedItem = targetInventory[item.type][newLength - 1];
                                this.set_ToChange(targetCreature.type, "inventory");
                                if (item.id === message.offeredItem[0].id) {
                                    addedPrimaryItem = addedItem;
                                }
                                addedItem = this.process_GrantedItem((targetCreature as Character | AnimalCompanion), addedItem, targetInventory, true, false, true, true);
                            }
                        })
                        //Add included inventories and process all items inside them.
                        message.includedInventories.forEach(inventory => {
                            inventory = this.reassign(inventory)
                            let newLength = targetCreature.inventories.push(inventory);
                            let newInventory = targetCreature.inventories[newLength - 1];
                            newInventory.allItems().forEach(invItem => {
                                invItem = this.process_GrantedItem((targetCreature as Character | AnimalCompanion), invItem, newInventory, true, false, true, true);
                            })
                        })
                        if (addedPrimaryItem) {
                            //Build a toast message and send it.
                            let text = "Received <strong>";
                            if (message.itemAmount > 1) {
                                text += message.itemAmount + " ";
                            }
                            text += addedPrimaryItem.get_Name();
                            if (sender) {
                                text += "</strong> from <strong>" + sender + "</strong>";
                            }
                            if (message.includedItems.length || message.includedInventories.length) {
                                text += ", including ";
                                let includedText: string[] = [];
                                if (message.includedItems.length) {
                                    includedText.push(message.includedItems.length + " extra items")
                                }
                                if (message.includedInventories.length) {
                                    includedText.push(message.includedInventories.length + " containers")
                                }
                                text += includedText.join(" and ");
                            }
                            text += ".";
                            this.toastService.show(text, [], this);
                            //Build a response message that lets the other player know that the item has been accepted.
                            this.send_ItemAcceptedMessage(message);
                        }
                    }
                }
            } else {
                //Build a response message that lets the other player know that the item has been rejected.
                this.send_ItemAcceptedMessage(message, false);
            }
            this.messageService.mark_MessageAsIgnored(this, message);
        })
    }

    send_ItemAcceptedMessage(message: PlayerMessage, accepted: boolean = true) {
        //Don't send messages in GM mode or manual mode.
        if (this.get_GMMode() || this.get_ManualMode()) {
            return false;
        }
        let timeStamp: number = 0;
        this.messageService.get_Time().subscribe((result: string[]) => {
            timeStamp = result["time"];
            //Build a message to the correct player and creature, with the timestamp just received from the database connector.
            let response = new PlayerMessage();
            response.recipientId = message.senderId;
            response.senderId = this.get_Character().id
            response.targetId = message.senderId;
            let target = this.get_MessageSender(message) || "sender";
            let date = new Date();
            response.time = date.getHours() + ":" + date.getMinutes();
            response.timeStamp = timeStamp;
            response.itemAmount = message.itemAmount;
            if (accepted) {
                response.acceptedItem = message.offeredItem[0].id;
            } else {
                response.rejectedItem = message.offeredItem[0].id;
            }
            this.messageService.send_Messages([response]).subscribe((result) => {
                //If the message was sent, send a summary toast.
                if (accepted) {
                    this.toastService.show("Sent acceptance response to <strong>" + target + "</strong>.", [], this);
                } else {
                    this.toastService.show("Sent rejection response to <strong>" + target + "</strong>.", [], this);
                }
            }, (error) => {
                this.toastService.show("An error occurred while sending response. See console for more information.", [], this);
                console.log('Error saving response message to database: ' + error.message);
            });;
        }, (error) => {
            this.toastService.show("An error occurred while sending response. See console for more information.", [], this);
            console.log('Error saving response message to database: ' + error.message);
        });
    }

    apply_ItemAcceptedMessages(messages: PlayerMessage[]) {
        //Don't receive messages in manual mode.
        if (this.get_ManualMode()) {
            return false;
        }
        //Iterate through all messages that have an offeredItem (only one per message will be applied) and add the items.
        messages.forEach(message => {
            let sender = this.get_MessageSender(message) || "The player ";
            if (message.acceptedItem || message.rejectedItem) {
                let foundItem: Item;
                let foundInventory: ItemCollection;
                let foundCreature: Creature;
                let itemName = "item";
                this.get_Creatures().filter(creature => !(creature instanceof Familiar)).forEach(creature => {
                    if (!(creature instanceof Familiar)) {
                        creature.inventories.forEach(inventory => {
                            if (!foundItem) {
                                foundItem = inventory.allItems().find(invItem => invItem.id == (message.acceptedItem || message.rejectedItem));
                                foundInventory = inventory;
                                foundCreature = creature;
                            }
                        })
                    }
                })
                if (foundItem) {
                    itemName = foundItem.get_Name();
                }
                if (message.acceptedItem) {
                    this.toastService.show("<strong>" + sender + "</strong> has accepted the <strong>" + itemName + "</strong>. The item is dropped from your inventory.", [], this);
                    if (foundItem) {
                        this.drop_InventoryItem(foundCreature as Character | AnimalCompanion, foundInventory, foundItem, false, true, true, message.itemAmount);
                    }
                } else if (message.rejectedItem) {
                    this.toastService.show("<strong>" + sender + "</strong> has rejected the <strong>" + itemName + "</strong>. The item will remain in your inventory.", [], this);
                }
            }
            this.messageService.mark_MessageAsIgnored(this, message);
        })
        this.process_ToChange();
    }

    process_OnceEffect(creature: Creature, effectGain: EffectGain, conditionValue: number = 0, conditionHeightened: number = 0, conditionChoice: string = "", conditionSpellCastingAbility: string = "") {
        let value = 0;
        try {
            //we eval the effect value by sending this effect gain to get_SimpleEffects() and receive the resulting effect.
            let effects = this.effectsService.get_SimpleEffects(this.get_Character(), this, { effects: [effectGain], spellSource: effectGain.spellSource, value: conditionValue, heightened: conditionHeightened, choice: conditionChoice, spellCastingAbility: conditionSpellCastingAbility });
            if (effects.length) {
                let effect = effects[0];
                if (effect?.value != "0" && (parseInt(effect.value) || parseFloat(effect.value))) {
                    //I don't understand why this is done. I guess we don't want floats, but why not simply take the int?
                    if (parseFloat(effect.value) == parseInt(effect.value)) {
                        value = parseInt(effect.value);
                    }
                }
            } else {
                value = 0;
            }
        } catch (error) {
            value = 0;
        }
        switch (effectGain.affected) {
            case "Focus Points":
                if (value) {
                    this.get_Character().class.focusPoints = Math.min(this.get_Character().class.focusPoints, this.get_MaxFocusPoints());
                    //We intentionally add the point after we set the limit. This allows us to gain focus points with feats and raise the current points
                    // before the limit is increased. The focus points are automatically limited in the spellbook component, where they are displayed, and when casting focus spells.
                    (creature as Character).class.focusPoints += value;
                    if (value >= 0) {
                        this.toastService.show("You gained " + value + " focus point" + (value == 1 ? "" : "s") + ".", [], this);
                    } else {
                        this.toastService.show("You lost " + value * -1 + " focus point" + (value == 1 ? "" : "s") + ".", [], this);
                    }
                    this.set_ToChange("Character", "spellbook");
                }
                break;
            case "Temporary HP":
                //When you get temporary HP, some things to process:
                //- If you already have temporary HP, add this amount to the selection. The player needs to choose one amount; they are not cumulative.
                //- If you are setting temporary HP manually, or if the current amount is 0, skip the selection and remove all the other options.
                //- If you are losing temporary HP, lose only those that come from the same source.
                //-- If that's the current effective amount, remove all other options (if you are "using" your effective temporary HP, we assume that you have made the choice for this amount). 
                //--- If the current amount is 0 after loss, reset the temporary HP.
                //-- Remove it if it's not the effective amount.
                if (value > 0) {
                    if (effectGain.source == "Manual") {
                        creature.health.temporaryHP[0] = { amount: value, source: effectGain.source, sourceId: "" };
                        creature.health.temporaryHP.length = 1;
                        this.toastService.show("You gained " + value + " temporary HP.", [], this);
                    } else if (creature.health.temporaryHP[0].amount == 0) {
                        creature.health.temporaryHP[0] = { amount: value, source: effectGain.source, sourceId: effectGain.sourceId };
                        creature.health.temporaryHP.length = 1;
                        this.toastService.show("You gained " + value + " temporary HP from " + effectGain.source + ".", [], this);
                    } else {
                        creature.health.temporaryHP.push({ amount: value, source: effectGain.source, sourceId: effectGain.sourceId });
                        this.toastService.show("You gained " + value + " temporary HP from " + effectGain.source + ". You already had temporary HP and must choose which amount to keep.", [], this);
                    }
                } else if (value < 0) {
                    let targetTempHPSet = creature.health.temporaryHP.find(tempHPSet => ((tempHPSet.source == "Manual") && (effectGain.source == "Manual")) || tempHPSet.sourceId == effectGain.sourceId)
                    if (targetTempHPSet) {
                        targetTempHPSet.amount += value;
                        if (targetTempHPSet === creature.health.temporaryHP[0]) {
                            creature.health.temporaryHP.length = 1;
                            if (targetTempHPSet.amount <= 0) {
                                creature.health.temporaryHP[0] = { amount: 0, source: "", sourceId: "" };
                            }
                            this.toastService.show("You lost " + value * -1 + " temporary HP.", [], this);
                        } else {
                            if (targetTempHPSet.amount <= 0) {
                                creature.health.temporaryHP.splice(creature.health.temporaryHP.indexOf(targetTempHPSet), 1);
                            }
                            this.toastService.show("You lost " + value * -1 + " of the temporary HP gained from " + effectGain.source + ". This is not the set of temporary HP that you are currently using.", [], this);
                        }
                    }
                }
                this.set_ToChange(creature.type, "health");
                //Update Health and Time because having multiple temporary HP keeps you from ticking time and resting.
                this.set_ToChange("Character", "health");
                this.set_ToChange("Character", "time");
                break;
            case "HP":
                if (value > 0) {
                    let result = creature.health.heal(creature, this, this.effectsService, value, true);
                    let results: string = ""
                    if (result.unconsciousRemoved) {
                        results = " This removed your Unconscious condition."
                    }
                    if (result.dyingRemoved) {
                        results = " This removed your Dying condition."
                    }
                    this.toastService.show("You gained " + value + " HP from " + effectGain.source + "." + results, [], this);
                } else if (value < 0) {
                    let result = creature.health.takeDamage(creature, this, this.effectsService, -value, false);
                    let results: string = ""
                    if (result.unconsciousAdded) {
                        results = " You are now Unconscious."
                    }
                    if (result.dyingAdded) {
                        results = " You are now Dying " + result.dyingAdded + "."
                    }
                    if (result.wokeUp) {
                        results = " This removed your Unconscious condition."
                    }
                    this.toastService.show("You lost " + value * -1 + " HP from " + effectGain.source + "." + results, [], this);
                }
                this.set_ToChange(creature.type, "health");
                this.set_ToChange(creature.type, "effects");
                break;
            case "Raise Shield":
                let shield = this.get_Character().inventories[0].shields.find(shield => shield.equipped);
                if (shield) {
                    if (value > 0) {
                        shield.raised = true;
                        this.toastService.show("Your shield was raised.", [], this);
                    } else {
                        shield.raised = false;
                        this.toastService.show("Your shield was lowered.", [], this);
                    }
                    this.set_ToChange(creature.type, "defense");
                    this.set_ToChange(creature.type, "effects");
                }
                break;
            case "Cover":
                this.defenseService.get_AC().set_Cover(creature, value, null, this, this.conditionsService);
                switch (value) {
                    case 0:
                        this.toastService.show("You are no longer taking cover.", [], this);
                        break;
                    case 1:
                        this.toastService.show("You now have lesser cover.", [], this);
                        break;
                    case 2:
                        this.toastService.show("You now have standard cover.", [], this);
                        break;
                    case 4:
                        this.toastService.show("You now have greater cover.", [], this);
                        break;
                }
                break;
        }
    }

    have_Trait(object: any, traitName: string) {
        return this.traitsService.have_Trait(this, object, traitName);
    }

    get_Abilities(name: string = "") {
        return this.abilitiesService.get_Abilities(name)
    }

    get_Skills(creature: Creature, name: string = "", type: string = "", locked: boolean = undefined) {
        return this.skillsService.get_Skills(creature.customSkills, name, type, locked)
    }

    get_SkillLevelName(level: number, short: boolean = false) {
        return this.skillsService.get_SkillLevelName(level, short);
    }

    get_Feats(name: string = "", type: string = "") {
        return this.featsService.get_Feats(this.get_Character().customFeats, name, type);
    }

    get_Features(name: string = "") {
        return this.featsService.get_Features(name);
    }

    get_FeatsAndFeatures(name: string = "", type: string = "", includeSubTypes: boolean = false, includeCountAs: boolean = false) {
        //Use this function very sparingly! See get_All() for details.
        return this.featsService.get_All(this.get_Character().customFeats, name, type, includeSubTypes, includeCountAs);
    }

    get_CharacterFeatsAndFeatures(name: string = "", type: string = "", includeSubTypes: boolean = false, includeCountAs: boolean = false) {
        return this.featsService.get_CharacterFeats(this.get_Character().customFeats, name, type, includeSubTypes, includeCountAs);
    }

    get_Health(creature: Creature) {
        return creature.health;
    }

    get_AnimalCompanionLevels() {
        return this.animalCompanionsService.get_CompanionLevels();
    }

    get_Senses(creature: Creature, charLevel: number = this.get_Character().level) {
        let senses: string[] = [];

        let ancestrySenses: string[];
        if (creature.type == "Familiar") {
            ancestrySenses = (creature as Familiar).senses;
        } else {
            ancestrySenses = (creature as AnimalCompanion | Character).class?.ancestry?.senses;
        }
        if (ancestrySenses.length) {
            senses.push(...ancestrySenses)
        }
        if (creature.type == "Character") {
            let character = creature as Character;
            let heritageSenses = character.class.heritage.senses
            if (heritageSenses.length) {
                senses.push(...heritageSenses)
            }
            this.get_CharacterFeatsAndFeatures()
                .filter(feat => feat.senses?.length && feat.have(character, this, charLevel))
                .forEach(feat => {
                    senses.push(...feat.senses);
                });
        }
        if (creature.type == "Familiar") {
            let familiar = creature as Familiar;
            familiar.abilities.feats.map(gain => this.familiarsService.get_FamiliarAbilities(gain.name)[0]).filter(ability => ability?.senses.length).forEach(ability => {
                senses.push(...ability.senses);
            })
        }
        this.get_AppliedConditions(creature).filter(gain => gain.apply).forEach(gain => {
            let condition = this.conditionsService.get_Conditions(gain.name)[0]
            if (condition?.senses.length) {
                senses.push(...condition.senses.filter(sense => !sense.conditionChoiceFilter || sense.conditionChoiceFilter == gain.choice).map(sense => sense.name))
            }
        });
        return Array.from(new Set(senses));
    }

    process_Feat(creature: Character | Familiar, feat: Feat, featName: string, choice: FeatChoice, level: Level, taken: boolean) {
        this.featsService.process_Feat(creature, this, feat, featName, choice, level, taken);
    }

    get_FeatsShowingOn(objectName: string = "all") {
        return this.get_CharacterFeatsAndFeatures().filter(feat =>
            feat.hints.find(hint =>
                (hint.minLevel ? this.get_Character().level >= hint.minLevel : true) &&
                hint.showon?.split(",").find(showon =>
                    objectName.toLowerCase() == "all" ||
                    showon.trim().toLowerCase() == objectName.toLowerCase() ||
                    (
                        (
                            objectName.toLowerCase().includes("lore:") ||
                            objectName.toLowerCase().includes(" lore")
                        ) &&
                        showon.trim().toLowerCase() == "lore"
                    )
                )
            ) && feat.have(this.get_Character(), this, this.get_Character().level)
        )
    }

    get_CompanionShowingOn(objectName: string = "all") {
        //Get showon elements from Companion Ancestry and Specialization
        return []
            .concat(
                [this.get_Companion().class.ancestry]
                    .filter(ancestry =>
                        ancestry.hints
                            .find(hint =>
                                (hint.minLevel ? this.get_Character().level >= hint.minLevel : true) &&
                                hint.showon?.split(",")
                                    .find(showon =>
                                        objectName == "all" ||
                                        showon.trim().toLowerCase() == objectName.toLowerCase()
                                    )
                            )
                    )
            )
            .concat(
                this.get_Companion().class.specializations
                    .filter(spec =>
                        spec.hints
                            .find(hint =>
                                (hint.minLevel ? this.get_Character().level >= hint.minLevel : true) &&
                                hint.showon?.split(",")
                                    .find(showon =>
                                        objectName == "all" ||
                                        showon.trim().toLowerCase() == objectName.toLowerCase()
                                    )
                            )
                    )
            )
            //Return any feats that include e.g. Companion:Athletics
            .concat(
                this.get_FeatsShowingOn("Companion:" + objectName)
            ) as (AnimalCompanionAncestry | AnimalCompanionSpecialization | Feat)[];
    }

    get_FamiliarShowingOn(objectName: string = "all") {
        //Get showon elements from Familiar Abilities
        return this.familiarsService.get_FamiliarAbilities().filter(feat =>
            feat.hints.find(hint =>
                (hint.minLevel ? this.get_Character().level >= hint.minLevel : true) &&
                hint.showon?.split(",").find(showon =>
                    objectName.toLowerCase() == "all" ||
                    showon.trim().toLowerCase() == objectName.toLowerCase() ||
                    (
                        (
                            objectName.toLowerCase().includes("lore:") ||
                            objectName.toLowerCase().includes(" lore")
                        ) &&
                        showon.trim().toLowerCase() == "lore"
                    )
                )
            ) && feat.have(this.get_Familiar(), this)
            //Return any feats that include e.g. Companion:Athletics
        ).concat(this.get_FeatsShowingOn("Familiar:" + objectName))
    }

    get_ConditionsShowingOn(creature: Creature, objectName: string = "all") {
        return this.get_AppliedConditions(creature)
            .filter(conditionGain => conditionGain.apply)
            .map(conditionGain => { return Object.assign(new ConditionSet, { gain: conditionGain, condition: this.get_Conditions(conditionGain.name)[0] }) })
            .filter(conditionSet =>
                conditionSet.condition?.hints.find(hint =>
                    (hint.minLevel ? this.get_Character().level >= hint.minLevel : true) &&
                    hint.showon?.split(",").find(showon =>
                        objectName.trim().toLowerCase() == "all" ||
                        showon.trim().toLowerCase() == objectName.toLowerCase() ||
                        (
                            (
                                objectName.toLowerCase().includes("lore:") ||
                                objectName.toLowerCase().includes(" lore")
                            ) &&
                            showon.trim().toLowerCase() == "lore"
                        )
                    )
                )
            )
    }

    get_OwnedActivities(creature: Creature, levelNumber: number = creature.level, all: boolean = false) {
        let activities: (ActivityGain | ItemActivity)[] = []
        if (!this.still_loading()) {
            if (creature.type == "Character") {
                activities.push(...(creature as Character).class.activities.filter(gain => gain.level <= levelNumber));
            }
            if (creature.type == "Companion") {
                activities.push(...(creature as AnimalCompanion).class?.ancestry?.activities.filter(gain => gain.level <= levelNumber));
            }
            //Get all applied condition gains' activity gains. These were copied from the condition when it was added.
            this.get_AppliedConditions(creature, "", "", true).filter(gain => gain.apply).forEach(gain => {
                activities.push(...gain.gainActivities);
            });
            //With the all parameter, get all activities of all items regardless of whether they are equipped or invested or slotted.
            // This is used for ticking down cooldowns.
            if (all) {
                creature.inventories.forEach(inv => {
                    inv.allEquipment().forEach(item => {
                        //Get external activity gains from items.
                        if (item.gainActivities.length) {
                            if (item instanceof Shield && item.emblazonArmament?.length) {
                                //Only get Emblazon Armament activities if the blessing applies.
                                activities.push(...item.gainActivities.filter(gain =>
                                    (item._emblazonEnergy ? true : gain.source != "Emblazon Energy") &&
                                    (item._emblazonAntimagic ? true : gain.source != "Emblazon Antimagic")
                                ));
                            } else {
                                activities.push(...item.gainActivities);
                            }
                        }
                        if (item.activities.length) {
                            activities.push(...item.activities);
                        }
                        //Get activities from runes.
                        if (item.propertyRunes) {
                            item.propertyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from runes.
                        if (item.bladeAllyRunes) {
                            item.bladeAllyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from Oils emulating runes.
                        if (item.oilsApplied) {
                            item.oilsApplied.filter(oil => oil.runeEffect && oil.runeEffect.activities).forEach(oil => {
                                activities.push(...oil.runeEffect.activities);
                            });
                        }
                        //Get activities from slotted Aeon Stones.
                        if ((item as WornItem).aeonStones) {
                            (item as WornItem).aeonStones.filter(stone => stone.activities.length).forEach(stone => {
                                activities.push(...stone.activities);
                            })
                        }
                    })
                    inv.allRunes().forEach(rune => {
                        if (rune.activities.length) {
                            activities.push(...rune.activities);
                        }
                    })
                })
            } else {
                //Without the all parameter, get activities only from equipped and invested items and their slotted items.
                creature.inventories[0]?.allEquipment()
                    .filter(item =>
                        (item.equippable ? item.equipped : true) &&
                        (item.can_Invest() ? item.invested : true) &&
                        !item.broken
                    ).forEach((item: Equipment) => {
                        if (item.gainActivities.length) {
                            activities.push(...item.gainActivities);
                        }
                        //DO NOT get resonant activities at this point
                        if (item.activities.length) {
                            activities.push(...item.activities.filter(activity => !activity.resonant || all));
                        }
                        //Get activities from runes
                        if (item.propertyRunes) {
                            item.propertyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from blade ally runes
                        if ((item instanceof Weapon || item instanceof WornItem) && item.bladeAllyRunes && item.bladeAlly) {
                            item.bladeAllyRunes.filter(rune => rune.activities.length).forEach(rune => {
                                activities.push(...rune.activities);
                            });
                        }
                        //Get activities from oils emulating runes
                        if (item.oilsApplied) {
                            item.oilsApplied.filter(oil => oil.runeEffect && oil.runeEffect.activities).forEach(oil => {
                                activities.push(...oil.runeEffect.activities);
                            });
                        }
                        //Get activities from slotted aeon stones, including resonant activities
                        if (item instanceof WornItem && item.aeonStones.length) {
                            item.aeonStones.filter(stone => stone.activities.length).forEach(stone => {
                                activities.push(...stone.activities);
                            })
                        }
                    })
            }
        }
        return activities.sort(function (a, b) {
            if (a.name > b.name) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            return 0;
        })
    }

    get_ActivitiesShowingOn(creature: Creature, objectName: string = "all") {
        return this.get_OwnedActivities(creature)
            //Conflate ActivityGains and their respective Activities into one object...
            .map(gain => gain instanceof ItemActivity ? [gain, gain] : [gain, this.activitiesService.get_Activities(gain.name)[0]])
            //...so that we can find the activities where the gain is active or the activity doesn't need to be toggled...
            .filter((gainAndActivity: [ActivityGain | ItemActivity, Activity]) => gainAndActivity[1] && (gainAndActivity[0].active || !gainAndActivity[1].toggle))
            //...and then keep only the activities.
            .map((gainAndActivity: [ActivityGain | ItemActivity, Activity]) => gainAndActivity[1])
            .filter(activity =>
                activity?.hints.find(hint =>
                    hint.showon?.split(",").find(showon =>
                        objectName.trim().toLowerCase() == "all" ||
                        showon.trim().toLowerCase() == objectName.toLowerCase() ||
                        (
                            (
                                objectName.toLowerCase().includes("lore:") ||
                                objectName.toLowerCase().includes(" lore")
                            ) &&
                            showon.trim().toLowerCase() == "lore"
                        )
                    )
                )
            )
    }

    get_ItemsShowingOn(creature: Creature, objectName: string = "all") {
        let returnedItems: (Item | Material)[] = [];
        //Prepare function to add items whose hints match the objectName.
        function get_Hints(item: Equipment | Oil | WornItem | ArmorRune | WeaponRune | Material, allowResonant: boolean) {
            if (item.hints
                .some(hint =>
                    (allowResonant || !hint.resonant) &&
                    hint.showon?.split(",").find(showon =>
                        objectName.trim().toLowerCase() == "all" ||
                        showon.trim().toLowerCase() == objectName.toLowerCase() ||
                        (
                            objectName.toLowerCase().includes("lore") &&
                            showon.trim().toLowerCase() == "lore"
                        ) ||
                        (
                            //Show Emblazon Energy or Emblazon Antimagic Shield Block hint on Shield Block if the shield's blessing applies.
                            item instanceof Shield && item.emblazonArmament.length &&
                            (
                                (
                                    item._emblazonEnergy &&
                                    objectName == "Shield Block" &&
                                    showon == "Emblazon Energy Shield Block"
                                ) || (
                                    item._emblazonAntimagic &&
                                    objectName == "Shield Block" &&
                                    showon == "Emblazon Antimagic Shield Block"
                                )
                            )
                        )
                    )
                )
            ) {
                returnedItems.push(item);
            }
        }
        creature.inventories.forEach(inventory => {
            inventory.allEquipment().filter(item => (item.equippable ? item.equipped : true) && item.amount && !item.broken && (item.can_Invest() ? item.invested : true)).forEach(item => {
                get_Hints(item, false);
                item.oilsApplied.forEach(oil => {
                    get_Hints(oil, false);
                });
                if ((item as WornItem).aeonStones) {
                    (item as WornItem).aeonStones.forEach(stone => {
                        get_Hints(stone, true);
                    });
                }
                if ((item instanceof Weapon || (item instanceof WornItem && item.isHandwrapsOfMightyBlows)) && item.propertyRunes) {
                    item.propertyRunes.forEach(rune => {
                        get_Hints(rune as WeaponRune, false);
                    });
                }
                if (item instanceof Armor && item.propertyRunes) {
                    (item as Equipment).propertyRunes.forEach(rune => {
                        get_Hints(rune as ArmorRune, false);
                    });
                }
                if (item.moddable && (item as Equipment).material) {
                    (item as Equipment).material.forEach(material => {
                        get_Hints(material, false);
                    });
                }
            });
        });
        return returnedItems;
    }

    get_ArmorSpecializationsShowingOn(creature: Creature, objectName: string = "all") {
        if (creature.type == "Character") {
            return creature.inventories[0].armors.find(armor => armor.equipped).get_ArmorSpecialization(creature, this)
                .filter(spec =>
                    spec?.hints
                        .find(hint =>
                            hint.showon.split(",")
                                .find(showon =>
                                    objectName.trim().toLowerCase() == "all" ||
                                    showon.trim().toLowerCase() == objectName.toLowerCase() ||
                                    (
                                        (
                                            objectName.toLowerCase().includes("lore:") ||
                                            objectName.toLowerCase().includes(" lore")
                                        ) &&
                                        showon.trim().toLowerCase() == "lore"
                                    )
                                )
                        )
                )
        } else {
            return [];
        }
    }

    get_MaxFocusPoints() {
        let focusPoints: number = 0;
        this.effectsService.get_AbsolutesOnThis(this.get_Character(), "Focus Pool").forEach(effect => {
            focusPoints = parseInt(effect.setValue);
        })
        this.effectsService.get_RelativesOnThis(this.get_Character(), "Focus Pool").forEach(effect => {
            focusPoints += parseInt(effect.value);
        })
        return Math.min(focusPoints, 3);
    }

    get_AC() {
        return this.defenseService.get_AC();
    }

    initialize_AnimalCompanion() {
        let character = this.get_Character();
        if (character.class.animalCompanion) {
            character.class.animalCompanion = Object.assign(new AnimalCompanion(), character.class.animalCompanion);
            character.class.animalCompanion = this.reassign(character.class.animalCompanion);
            character.class.animalCompanion.class.reset_levels(this);
            character.class.animalCompanion.set_Level(this);
            this.equip_BasicItems(character.class.animalCompanion);
            this.set_ToChange("Companion", "all");
        }
    }

    cleanup_Familiar() {
        this.get_Familiar().abilities.feats.forEach(gain => {
            this.get_Character().take_Feat(this.get_Familiar(), this, undefined, gain.name, false, this.get_Familiar().abilities, undefined);
        })
    }

    initialize_Familiar() {
        let character = this.get_Character();
        if (character.class.familiar) {
            character.class.familiar = Object.assign(new Familiar(), character.class.familiar);
            character.class.familiar = this.reassign(character.class.familiar);
            this.set_ToChange("Familiar", "all");
        }
    }

    initialize(id: string, loadAsGM: boolean = false) {
        this.set_Changed("top-bar");
        this.loading = true;
        this.extensionsService.initialize();
        this.configService.initialize();
        this.continue_Initialize(id, loadAsGM);
    }

    continue_Initialize(id: string, loadAsGM: boolean) {
        if (this.extensionsService.still_loading() || this.configService.still_loading()) {
            setTimeout(() => {
                this.continue_Initialize(id, loadAsGM);
            }, 500)
        } else {
            this.traitsService.initialize();
            this.abilitiesService.initialize();
            this.activitiesService.initialize();
            this.featsService.initialize();
            this.historyService.initialize();
            this.classesService.initialize();
            this.conditionsService.initialize();
            this.spellsService.initialize();
            this.skillsService.initialize()
            this.itemsService.initialize();
            this.deitiesService.initialize();
            this.animalCompanionsService.initialize();
            this.familiarsService.initialize();
            this.savegameService.initialize(this);
            this.messageService.initialize(this);
            //EffectsService will wait for the character to be loaded before initializing.
            this.effectsService.initialize(this);
            if (id) {
                this.load_CharacterFromDB(id)
                    .subscribe((results: string[]) => {
                        this.loader = results;
                        if (this.loader) {
                            this.finish_Loading(loadAsGM)
                        } else {
                            this.toastService.show("The character could not be found in the database.", [], this);
                            this.cancel_Loading();
                        }
                    }, (error) => {
                        this.toastService.show("An error occurred while loading the character. See console for more information.", [], this);
                        console.log('Error loading character from database: ' + error.message);
                    });
            } else {
                this.me = new Character();
                this.finish_Loading();
            }
        }
    }

    load_CharacterFromDB(id: string, loadAsGM: boolean = false): Observable<string[]> {
        return this.savegameService.load_CharacterFromDB(id);
    }

    delete_Character(savegame: Savegame) {
        this.savegameService.delete_CharacterFromDB(savegame).subscribe((results) => {
            this.toastService.show("Deleted " + (savegame.name || "character") + " from database.", [], this);
            this.savegameService.initialize(this);
        }, (error) => {
            this.toastService.show("An error occurred while deleting the character. See console for more information.", [], this);
            console.log('Error deleting from database: ' + error.message);
        });
    }

    reassign(object: any) {
        return this.savegameService.reassign(object, "", this.itemsService);
    }

    finish_Loading(loadAsGM: boolean = false) {
        if (this.loader) {
            this.me = Object.assign(new Character(), JSON.parse(JSON.stringify(this.loader)));
            this.me.GMMode = loadAsGM;
            this.loader = [];
            this.finalize_Character();
        }
    }

    cancel_Loading() {
        this.loader = [];
        if (this.loading) { this.loading = false; }
        this.trigger_FinalChange();
    }

    finalize_Character() {
        if (this.itemsService.still_loading() || this.animalCompanionsService.still_loading() || this.featsService.still_loading()) {
            setTimeout(() => {
                this.finalize_Character();
            }, 500)
        } else {
            //Use this.me here instead of this.get_Character() because we're still_loading().
            this.me = this.savegameService.load_Character(this.me, this, this.itemsService, this.classesService, this.historyService, this.animalCompanionsService)
            if (this.loading) { this.loading = false; }
            //Now that the character is loaded, do some things that require everything to be in working order:
            //Give the character a Fist and an Unarmored© if they have nothing else, and keep those ready if they should drop their last weapon or armor.
            this.grant_BasicItems();
            //Create feats that are based on all weapons in the store and in your inventory.
            this.create_WeaponFeats();
            //Prepare the update variables that everything subscribes to.
            this.characterChanged$ = this.changed.asObservable();
            this.viewChanged$ = this.viewChanged.asObservable();
            //Check that every feat's specialreq makes sense. This is a debugging thing and should only run in development.
            if (isDevMode) {
                this.verify_Feats();
            }
            //Set your turn state according to the saved state.
            this.timeService.set_YourTurn(this.get_Character().yourTurn);
            //Fill a runtime variable with all the feats the character has taken.
            this.featsService.build_CharacterFeats(this.get_Character());
            //Set accent color and dark mode according to the settings.
            this.set_Accent();
            this.set_Darkmode();
            this.trigger_FinalChange();
        }
    }

    trigger_FinalChange() {
        //Wait for the important services to finish loading.
        if (
            this.traitsService.still_loading() ||
            this.featsService.still_loading() ||
            this.historyService.still_loading() ||
            this.classesService.still_loading() ||
            this.conditionsService.still_loading() ||
            this.spellsService.still_loading() ||
            this.itemsService.still_loading()
        ) {
            setTimeout(() => {
                this.trigger_FinalChange();
            }, 500)
        } else {
            //Update everything once, then effects, and then the player can take over.
            this.set_Changed();
            this.set_ToChange("Character", "effects");
            this.process_ToChange();
        }
    }

    save_Character() {
        this.get_Character().yourTurn = this.timeService.get_YourTurn();
        this.savegameService.save_Character(this.get_Character(), this.itemsService, this.classesService, this.historyService, this.animalCompanionsService).subscribe((result) => {
            if (result["lastErrorObject"] && result["lastErrorObject"].updatedExisting) {
                this.toastService.show("Saved " + (this.get_Character().name || "character") + ".", [], this);
            } else {
                this.toastService.show("Created " + (this.get_Character().name || "character") + ".", [], this);
            }
            this.savegameService.initialize(this);
        }, (error) => {
            this.toastService.show("An error occurred while saving the character. See console for more information.", [], this);
            console.log('Error saving to database: ' + error.message);
        });

    }

}