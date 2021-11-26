import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Activity } from 'src/app/classes/Activity';
import { ActivityGain } from 'src/app/classes/ActivityGain';
import { CharacterService } from 'src/app/services/character.service';
import { ConditionGain } from 'src/app/classes/ConditionGain';
import { ConditionsService } from 'src/app/services/conditions.service';
import { Feat } from 'src/app/classes/Feat';
import { ItemActivity } from 'src/app/classes/ItemActivity';
import { RefreshService } from 'src/app/services/refresh.service';
import { SavegameService } from 'src/app/services/savegame.service';
import { Spell } from 'src/app/classes/Spell';
import { SpellCasting } from 'src/app/classes/SpellCasting';
import { SpellGain } from 'src/app/classes/SpellGain';
import { SpellTarget } from 'src/app/classes/SpellTarget';
import { TimeService } from 'src/app/services/time.service';

@Component({
    selector: 'app-spellTarget',
    templateUrl: './spellTarget.component.html',
    styleUrls: ['./spellTarget.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpellTargetComponent implements OnInit {

    @Input()
    creature: string;
    @Input()
    spell: Spell;
    @Input()
    activity: Activity | ItemActivity;
    @Input()
    gain: SpellGain | ActivityGain | ItemActivity;
    @Input()
    parentActivityGain: ActivityGain | ItemActivity = null;
    @Input()
    casting: SpellCasting = null;
    @Input()
    cannotCast: string = "";
    @Input()
    effectiveSpellLevel: number = 0;
    @Input()
    bloodMagicFeats: Feat[] = [];
    @Input()
    phrase: string = "Cast";
    @Input()
    showActions: boolean = false;
    @Input()
    showDismiss: boolean = false;
    @Input()
    dismissPhrase: boolean = false;
    @Output()
    castMessage = new EventEmitter<{ target: string, activated: boolean }>();

    constructor(
        private changeDetector: ChangeDetectorRef,
        private characterService: CharacterService,
        private refreshService: RefreshService,
        private conditionsService: ConditionsService,
        private timeService: TimeService,
        private savegameService: SavegameService,
        private modalService: NgbModal,
        public modal: NgbActiveModal
    ) { }

    public get action() {
        return this.spell || this.activity;
    }

    public get actionGain() {
        return this.parentActivityGain || this.gain;
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    on_Cast(target: string, activated: boolean) {
        this.castMessage.emit({ target: target, activated: activated });
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_CompanionAvailable() {
        return this.characterService.get_CompanionAvailable();
    }

    get_Companion() {
        return this.characterService.get_Companion();
    }

    get_FamiliarAvailable() {
        return this.characterService.get_FamiliarAvailable();
    }

    get_Familiar() {
        return this.characterService.get_Familiar();
    }

    get_ManualMode() {
        return this.characterService.get_ManualMode();
    }

    get_Parameters() {
        let bloodMagicTrigger = this.get_BloodMagicTrigger();
        let canActivate = this.can_Activate();
        let canActivateWithoutTarget = this.can_Activate(true);
        let targetNumber = 1;
        targetNumber = (this.spell || this.activity).get_TargetNumber(this.effectiveSpellLevel, this.characterService);
        return { bloodMagicTrigger: bloodMagicTrigger, canActivate: canActivate, canActivateWithoutTarget: canActivateWithoutTarget, targetNumber: targetNumber }
    }

    get_BloodMagicTrigger() {
        if (this.spell) {
            let bloodMagicTrigger = "";
            this.bloodMagicFeats.forEach(feat => {
                feat.bloodMagic.forEach(bloodMagic => {
                    if (
                        bloodMagic.trigger.includes(this.spell.name) ||
                        bloodMagic.sourceTrigger.some(sourceTrigger =>
                            [
                                this.casting?.source.toLowerCase() || "",
                                this.parentActivityGain?.source.toLowerCase() || "",
                                this.gain?.source.toLowerCase() || ""
                            ].includes(sourceTrigger.toLowerCase())
                        )
                    ) {
                        if (bloodMagic.neutralPhrase && !bloodMagicTrigger) {
                            bloodMagicTrigger = "additional effects";
                        } else if (!bloodMagic.neutralPhrase) {
                            bloodMagicTrigger = "your blood magic power";
                        }
                    }
                })
            });
            return bloodMagicTrigger;
        } else {
            return "";
        }
    }

    get_IsSpellGain() {
        return this.gain instanceof SpellGain ? this.gain : null;
    }

    can_Activate(noTarget: boolean = false) {
        //Return whether this spell or activity
        // - causes any blood magic effect or
        // - causes any target conditions and has a target or
        // - causes any caster conditions and caster conditions are not disabled in general, or any of the caster conditions are not disabled.
        // - in case of an activity, adds items or onceeffects (which are independent of the target)
        let gainConditions: ConditionGain[] = [];
        if (this.spell) {
            gainConditions = this.spell.get_HeightenedConditions(this.effectiveSpellLevel);
        } else if (this.activity) {
            gainConditions = this.activity.gainConditions;
        }
        return (
            this.get_BloodMagicTrigger() ||
            (
                !noTarget &&
                gainConditions.some(gain => gain.targetFilter != "caster")
            ) ||
            (
                this.activity &&
                (
                    this.activity.traits.includes("Stance") ||
                    this.activity.gainItems.length ||
                    this.activity.onceEffects.length
                )
            ) ||
            (
                gainConditions.some(gain => gain.targetFilter == "caster") &&
                (
                    (
                        (this.spell || this.activity).get_IsHostile() ?
                            !this.get_Character().settings.noHostileCasterConditions :
                            !this.get_Character().settings.noFriendlyCasterConditions
                    ) ||
                    (
                        this.conditionsService.get_Conditions()
                            .filter(condition => gainConditions.some(gain => gain.name == condition.name && gain.targetFilter == "caster"))
                            .some(condition =>
                                condition.get_HasEffects() ||
                                condition.get_IsChangeable()
                            )
                    )
                )
            )
        )
    }

    private gainActive(): boolean {
        return this.actionGain.active;
    }

    private cannotTargetCaster(): boolean {
        return (this.action.cannotTargetCaster && this.action.target != 'self');
    }

    private isHostile(ignoreOverride: boolean = false): boolean {
        return this.action.get_IsHostile(ignoreOverride);
    }

    private canTarget(list: string[]): boolean {
        return list.includes(this.action.target)
    }

    public can_TargetSelf(): boolean {
        return (
            !this.gainActive() &&
            !this.cannotTargetCaster() &&
            this.canTarget(["self", "ally"]) &&
            !this.isHostile(true)
        )
    }

    public can_TargetCharacter(): boolean {
        return (
            !this.gainActive() &&
            this.creature != 'Character' &&
            this.canTarget(["ally"]) &&
            !this.isHostile(true)
        )
    }

    public can_TargetCompanion(): boolean {
        return (
            !this.gainActive() &&
            this.creature != 'Companion' &&
            this.canTarget(["companion"]) &&
            this.get_CompanionAvailable() &&
            !this.isHostile(true)
        )
    }

    public can_TargetFamiliar(): boolean {
        return (
            !this.gainActive() &&
            this.creature != 'Familiar' &&
            this.canTarget(["familiar"]) &&
            this.get_FamiliarAvailable() &&
            !this.isHostile(true)
        )
    }

    public can_TargetAlly(targetNumber: number): boolean {
        return (
            !this.gainActive() &&
            targetNumber != 0 &&
            !this.isHostile(true)
        )
    }

    public can_Cast(): boolean {
        return (
            !this.gainActive() &&
            this.canTarget(['ally', 'area', 'minion', 'object', 'other'])
        )
    }

    open_SpellTargetModal(content) {
        this.modalService.open(content, { centered: true, ariaLabelledBy: 'modal-title' }).result.then((result) => {
            if (result == "Cast click") {
                this.on_Cast("Selected", true)
            }
        }, (reason) => {
            //Do nothing if cancelled.
        });
    }

    get_SpellTargets() {
        //Collect all possible targets for a spell/activity (allies only).
        //Hostile spells and activities don't get targets.
        if ((this.spell || this.activity).get_IsHostile(true)) {
            return [];
        }
        let newTargets: SpellTarget[] = [];
        let character = this.get_Character();
        this.characterService.get_Creatures().forEach(creature => {
            newTargets.push(Object.assign(new SpellTarget(), { name: creature.name || creature.type, id: creature.id, playerId: character.id, type: creature.type, selected: (this.gain.targets.find(target => target.id == creature.id)?.selected || false), isPlayer: creature === character }));
        })
        if (character.partyName) {
            //Only allow selecting other players if you are in a party.
            this.savegameService.get_Savegames().filter(savegame => savegame.partyName == character.partyName && savegame.id != character.id).forEach(savegame => {
                newTargets.push(Object.assign(new SpellTarget(), { name: savegame.name || "Unnamed", id: savegame.id, playerId: savegame.id, type: "Character", selected: (this.gain.targets.find(target => target.id == savegame.id)?.selected || false) }));
                if (savegame.companionId) {
                    newTargets.push(Object.assign(new SpellTarget(), { name: savegame.companionName || "Companion", id: savegame.companionId, playerId: savegame.id, type: "Companion", selected: (this.gain.targets.find(target => target.id == savegame.companionId)?.selected || false) }));
                }
                if (savegame.familiarId) {
                    newTargets.push(Object.assign(new SpellTarget(), { name: savegame.familiarName || "Familiar", id: savegame.familiarId, playerId: savegame.id, type: "Familiar", selected: (this.gain.targets.find(target => target.id == savegame.familiarId)?.selected || false) }));
                }
            })
        }
        this.gain.targets = newTargets;
        return this.gain.targets;
    }

    on_SelectAllTargets(checked: boolean) {
        if (checked) {
            this.gain.targets.forEach(target => {
                if (!target.isPlayer || !(this.spell || this.activity).cannotTargetCaster) {
                    target.selected = true;
                }
            })
        } else {
            this.gain.targets.forEach(target => {
                target.selected = false;
            })
        }
    }

    get_AllTargetsSelected(targetNumber) {
        if (targetNumber == -1) {
            return (this.gain.targets.filter(target => target.selected).length >= this.gain.targets.length - ((this.spell || this.activity).cannotTargetCaster ? 1 : 0))
        } else {
            return (this.gain.targets.filter(target => target.selected).length >= Math.min(this.gain.targets.length - ((this.spell || this.activity).cannotTargetCaster ? 1 : 0), targetNumber));
        }
    }

    get_DeactivatePhrase() {
        let phrase = this.dismissPhrase || "Dismiss <span class='actionIcon action1A'></span> or Stop Sustaining";
        if (this.parentActivityGain?.duration) {
            phrase += " (Duration: " + this.get_Duration(this.parentActivityGain?.duration) + ")"
        } else if (this.gain.duration) {
            phrase += " (Duration: " + this.get_Duration(this.gain?.duration) + ")"
        }
        return phrase;
    }

    get_Duration(turns: number, includeTurnState: boolean = true, inASentence: boolean = false) {
        return this.timeService.get_Duration(turns, includeTurnState, inASentence);
    }

    finish_Loading() {
        this.refreshService.get_Changed
            .subscribe((target) => {
                if (target == "activities" || target == "spellbook" || target == "all" || target.toLowerCase() == this.creature.toLowerCase()) {
                    this.changeDetector.detectChanges();
                }
            });
        this.refreshService.get_ViewChanged
            .subscribe((view) => {
                if (view.creature.toLowerCase() == this.creature.toLowerCase() && ["activities", "spellbook", "all"].includes(view.target.toLowerCase())) {
                    this.changeDetector.detectChanges();
                }
            });
    }

    ngOnInit() {
        this.finish_Loading();
    }

}