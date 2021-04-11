import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CharacterService } from '../character.service';
import { SpellsService } from '../spells.service';
import { SpellChoice } from '../SpellChoice';
import { SpellCasting } from '../SpellCasting';
import { NgbPopoverConfig, NgbTooltipConfig } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-spells',
    templateUrl: './spells.component.html',
    styleUrls: ['./spells.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpellsComponent implements OnInit {

    public showSpell: string = "";
    public showChoice: string = "";
    public allowHeightened: boolean = false;
    public allowBorrow: boolean = false;
    public prepared: boolean = false;
    private showContent: SpellChoice = null;
    private showSpellCasting: SpellCasting = null;
    private showContentLevelNumber: number = 0;
    

    constructor(
        private changeDetector: ChangeDetectorRef,
        private characterService: CharacterService,
        private spellsService: SpellsService,
        popoverConfig: NgbPopoverConfig,
        tooltipConfig: NgbTooltipConfig
    ) {
        popoverConfig.autoClose = "outside";
        popoverConfig.container = "body";
        //For touch compatibility, this openDelay prevents the popover from closing immediately on tap because a tap counts as hover and then click;
        popoverConfig.openDelay = 1;
        popoverConfig.placement = "auto";
        popoverConfig.popoverClass = "list-item sublist";
        popoverConfig.triggers = "hover:click";
        tooltipConfig.container = "body";
        //For touch compatibility, this openDelay prevents the tooltip from closing immediately on tap because a tap counts as hover and then click;
        tooltipConfig.openDelay = 1;
        tooltipConfig.triggers = "hover:click";
    }

    minimize() {
        this.characterService.get_Character().settings.spellsMinimized = !this.characterService.get_Character().settings.spellsMinimized;
    }

    toggle_TileMode() {
        this.get_Character().settings.spellsTileMode = !this.get_Character().settings.spellsTileMode;
        this.characterService.set_ToChange("Character", "spellchoices");
        this.characterService.process_ToChange();
    }

    get_Minimized() {
        return this.characterService.get_Character().settings.spellsMinimized;
    }

    get_TileMode() {
        return this.characterService.get_Character().settings.spellsTileMode;
    }

    toggleSpellMenu() {
        this.characterService.toggle_Menu("spells");
    }

    get_SpellsMenuState() {
        return this.characterService.get_SpellsMenuState();
    }

    toggle_Spell(name: string) {
        if (this.showSpell == name) {
            this.showSpell = "";
        } else {
            this.showSpell = name;
        }
    }

    toggle_Choice(name: string, levelNumber: number = 0, content: SpellChoice = null, casting: SpellCasting = null) {
        //Set the currently shown list name, level number and content so that the correct choice with the correct data can be shown in the choice area.
        if (this.showChoice == name &&
            (!levelNumber || this.showContentLevelNumber == levelNumber) &&
            (!content || JSON.stringify(this.showContent) == JSON.stringify(content))) {
            this.showChoice = "";
            this.showContentLevelNumber = 0;
            this.showContent = null;
            this.showSpellCasting = null;
        } else {
            this.showChoice = name;
            this.showContentLevelNumber = levelNumber;
            this.showContent = content;
            this.showSpellCasting = casting;
            this.reset_ChoiceArea();
        }
    }

    reset_ChoiceArea() {
        document.getElementById("spells-choiceArea-top").scrollIntoView({ behavior: 'smooth' });
    }

    receive_ChoiceMessage(message: { name: string, levelNumber: number, choice: SpellChoice, casting: SpellCasting }) {
        this.toggle_Choice(message.name, message.levelNumber, message.choice, message.casting);
    }

    receive_SpellMessage(name: string) {
        this.toggle_Spell(name);
    }

    get_ShowSpell() {
        return this.showSpell;
    }

    get_ShowChoice() {
        return this.showChoice;
    }

    get_ActiveChoiceContent() {
        //Get the currently shown spell choice with levelNumber and spellcasting.
        //Also get the currently shown list name for compatibility.
        if (this.showContent) {
            return [{ name: this.get_ShowChoice(), levelNumber: this.showContentLevelNumber, choice: this.showContent, casting: this.showSpellCasting }];
        }
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    trackByID(index: number, obj: any): any {
        //Track spell choices by id, so that when the selected choice changes, the choice area content is updated.
        // The choice area content is only ever one choice, so the index would always be 0.
        return obj.choice.id;
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    need_Spellbook(casting: SpellCasting) {
        return casting.castingType == "Prepared" && casting.className == "Wizard";
    }

    apply_SpellSubstitution(casting: SpellCasting) {
        return casting.castingType == "Prepared" &&
            casting.className == "Wizard" &&
            this.get_Character().get_FeatsTaken(1, this.get_Character().level, "Spell Substitution").length > 0;
    }

    apply_ReprepareSpell(casting: SpellCasting) {
        return casting.castingType == "Prepared" &&
            casting.className == "Wizard" &&
            this.get_Character().get_FeatsTaken(1, this.get_Character().level, "Reprepare Spell").length > 0;
    }

    get_Spells(name: string = "", type: string = "", tradition: string = "") {
        return this.spellsService.get_Spells(name, type, tradition);
    }

    get_MaxSpellLevel() {
        return this.get_Character().get_SpellLevel();
    }

    get_SpellCastings() {
        let character = this.get_Character();
        return character.class.spellCasting.filter(casting => casting.charLevelAvailable && casting.charLevelAvailable <= character.level)
            .sort(function (a, b) {
                if (a.tradition > b.tradition) {
                    return 1;
                }
                if (a.tradition < b.tradition) {
                    return -1;
                }
                return 0;
            }).sort(function (a, b) {
                if (a.className > b.className) {
                    return 1;
                }
                if (a.className < b.className) {
                    return -1;
                }
                return 0;
            }).sort(function (a, b) {
                if (a.castingType > b.castingType || (b.castingType == "Innate" ? a.castingType != "Innate" : false)) {
                    return 1;
                }
                if (a.castingType < b.castingType || (a.castingType == "Innate" ? b.castingType != "Innate" : false)) {
                    return -1;
                }
                return 0;
            })
    }

    get_DynamicLevel(casting: SpellCasting, choice: SpellChoice) {
        return this.spellsService.get_DynamicSpellLevel(casting, choice, this.characterService);
    }

    get_SpellChoices(casting: SpellCasting, levelNumber: number) {
        //Get all spellchoices that have this spell level and are available at this character level.
        return casting.spellChoices.filter(choice => choice.charLevelAvailable <= this.get_Character().level && !choice.showOnSheet &&
            ((choice.level == levelNumber && !choice.dynamicLevel) || (choice.dynamicLevel && this.get_DynamicLevel(casting, choice) == levelNumber))
        )
    }

    get_SpellsTaken(minLevelNumber: number, maxLevelNumber: number, spellLevel: number, spellName: string, casting: SpellCasting, source: string = "", sourceId: string = "", locked: boolean = undefined) {
        let cantripAllowed: boolean = (spellLevel == 0);
        return this.get_Character().get_SpellsTaken(this.characterService, minLevelNumber, maxLevelNumber, spellLevel, spellName, casting, "", "", "", source, sourceId, locked, false, cantripAllowed);
    }

    still_loading() {
        return this.characterService.still_loading();
    }

    finish_Loading() {
        if (this.still_loading()) {
            setTimeout(() => this.finish_Loading(), 500)
        } else {
            this.characterService.get_Changed()
                .subscribe((target) => {
                    if (["spells", "all", "character"].includes(target.toLowerCase())) {
                        this.changeDetector.detectChanges();
                    }
                });
            this.characterService.get_ViewChanged()
                .subscribe((view) => {
                    if (view.creature.toLowerCase() == "character" && ["spells", "all"].includes(view.target.toLowerCase())) {
                        this.changeDetector.detectChanges();
                    }
                });
            return true;
        }
    }

    ngOnInit() {
        this.finish_Loading();
    }

}