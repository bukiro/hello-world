import { Component, OnInit, Input, Output, EventEmitter, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CharacterService } from 'src/app/services/character.service';
import { FeatsService } from 'src/app/services/feats.service';
import { Feat } from 'src/app/classes/Feat';
import { FeatChoice } from 'src/app/classes/FeatChoice';
import { FamiliarsService } from 'src/app/services/familiars.service';
import { Familiar } from 'src/app/classes/Familiar';
import { Character } from 'src/app/classes/Character';
import { TraitsService } from 'src/app/services/traits.service';
import { EffectsService } from 'src/app/services/effects.service';
import { RefreshService } from 'src/app/services/refresh.service';

@Component({
    selector: 'app-featchoice',
    templateUrl: './featchoice.component.html',
    styleUrls: ['./featchoice.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeatchoiceComponent implements OnInit {

    @Input()
    choice: FeatChoice
    @Input()
    showChoice: string = "";
    @Input()
    showFeat: string = "";
    showSubFeat: string = "";
    uncollapseSubFeat: string = "";
    @Output()
    showFeatChoiceMessage = new EventEmitter<{ name: string, levelNumber: number, choice: FeatChoice }>();
    @Output()
    showFeatMessage = new EventEmitter<string>();
    @Input()
    levelNumber: number;
    @Input()
    creature: string = "Character"
    @Input()
    unavailableFeats: boolean = true;
    @Input()
    lowerLevelFeats: boolean = true;
    @Input()
    higherLevelFeats: boolean = true;
    @Input()
    archetypeFeats: boolean = true;
    @Input()
    showTitle: boolean = true;
    @Input()
    showContent: boolean = true;
    @Input()
    tileMode: boolean = false;
    //Separate from the character level that you on when you are making this choice, this is the level that feats can have in this choice.
    // It can change with the character level or other factors and will be re-calculated when the component refreshes.
    public featLevel: number = 0;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private characterService: CharacterService,
        private refreshService: RefreshService,
        private featsService: FeatsService,
        private familiarsService: FamiliarsService,
        private traitsService: TraitsService,
        private effectsService: EffectsService
    ) { }

    toggle_Feat(name: string) {
        if (this.showFeat == name) {
            this.showFeat = "";
        } else {
            this.showFeat = name;
        }
        this.showFeatMessage.emit(this.showFeat);
    }

    toggle_List(name: string = "") {
        if (this.showChoice == name || name == "") {
            this.showChoice = "";
            this.showFeatChoiceMessage.emit({ name: this.showChoice, levelNumber: 0, choice: null });
        } else {
            this.showChoice = name;
            this.showFeatChoiceMessage.emit({ name: this.showChoice, levelNumber: this.levelNumber, choice: this.choice });
        }
    }

    toggle_SubFeat(name: string) {
        if (this.showSubFeat == name) {
            this.showSubFeat = "";
            this.uncollapseSubFeat = "";
        } else {
            this.showSubFeat = name;
        }
    }

    get_ShowFeat() {
        return this.showFeat;
    }

    get_ShowChoice() {
        return this.showChoice;
    }

    get_ShowSubFeat() {
        return this.showSubFeat;
    }

    get_UncollapseSubFeat() {
        return this.uncollapseSubFeat;
    }

    set_UncollapseSubFeat(name: string) {
        //After the component finishes loading, trigger the un-collapsing of the currently shown subfeat.
        //If we do it immediately, the un-collapsing will not be animated because the content is not loaded before it finishes.
        if (this.get_UncollapseSubFeat() != name) {
            this.uncollapseSubFeat = name;
        }
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    trackByFeat(index: number, featSet: { available: boolean, feat: Feat, cannotTake: { reason: string, explain: string }[] }) {
        //Feat options are sorted by whether they are available or not. When you take one, you might no longer meet the prerequisites
        // for another feat that gets pushed to the "unavailable" section and may change the order of options.
        // This can lead to another option now being checked in the position of the taken option.
        // By tracking by name instead of index, we make sure the correct feats get redrawn.
        return featSet.feat.name;
    }

    trackBySubType(index: number, subfeatSet: { available: boolean, subfeat: Feat, cannotTake: { reason: string, explain: string }[] }) {
        //Subfeat options are sorted by whether they are available or not. When you take one, you might now meet the prerequisites
        // for another subfeat that gets pushed to the "available" section and may change the order of options.
        // This can lead to another option now being checked in the position of the taken option.
        // By tracking by subtype instead of index, we make sure the correct subfeats get redrawn.
        return subfeatSet.subfeat.subType;
    }

    get_TileMode() {
        return this.tileMode;
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_Creature() {
        return this.characterService.get_Creature(this.creature) as Character | Familiar;
    }

    get_Traits(traitName: string = "") {
        return this.traitsService.get_Traits(traitName);
    }

    get_ButtonTitle(availableFeats: number) {
        let title: string = (this.featLevel != this.levelNumber) ? "Level " + this.featLevel + " " : "";
        title += this.choice.type.split(",").join(", ");
        if (!this.choice.specialChoice) {
            if (this.creature == "Familiar") {
                title += availableFeats > 1 ? ' Abilities' : ' Ability';
            } else {
                title += availableFeats > 1 ? ' Feats' : ' Feat';
            }
        }
        if (this.creature != "Familiar") {
            title += " (" + this.choice.source + ")";
        }
        if (availableFeats > 1) {
            title += ": " + this.choice.feats.length + "/" + availableFeats;
        } else if (this.choice.feats.length) {
            title += ": " + this.choice.feats[0].name;
        }
        return title;
    }

    get_Available(choice: FeatChoice) {
        if (this.creature == "Familiar") {
            let available = choice.available;
            this.effectsService.get_AbsolutesOnThis(this.get_Character(), "Familiar Abilities").forEach(effect => {
                available = parseInt(effect.setValue);
            });
            this.effectsService.get_RelativesOnThis(this.get_Character(), "Familiar Abilities").forEach(effect => {
                available += parseInt(effect.value);
            });
            return available;
        }
        return choice.available
    }

    get_Feats(name: string = "", type: string = "") {
        if (this.creature == "Character") {
            return this.featsService.get_Feats(this.get_Character().customFeats, name, type);
        } else if (this.creature == "Familiar") {
            return this.familiarsService.get_FamiliarAbilities(name);
        }
    }

    get_CharacterFeatsAndFeatures(name: string = "", type: string = "") {
        if (this.creature == "Character") {
            return this.featsService.get_CharacterFeats(this.get_Character().customFeats, name, type);
        } else if (this.creature == "Familiar") {
            return this.familiarsService.get_FamiliarAbilities(name);
        }
    }

    get_SubFeats(feat: Feat, choice: FeatChoice) {
        if (feat.subTypes) {
            let available = this.get_Available(choice)
            let feats: Feat[] = this.get_Feats().filter((subFeat: Feat) => subFeat.superType == feat.name && !subFeat.hide);
            if (choice.filter.length) {
                feats = feats.filter(subFeat => choice.filter.includes(subFeat.name) || choice.filter.includes(subFeat.superType))
            }
            let showOtherOptions = true;
            if (choice.feats.length >= available) {
                showOtherOptions = this.get_Character().settings.showOtherOptions;
            }
            return feats.map(feat => {
                let cannotTakeSubFeat = this.cannotTake(feat, choice);
                let available = (cannotTakeSubFeat.length == 0 || (this.get_FeatTakenByChoice(feat, choice) && true));
                return { available: available, subfeat: feat, cannotTake: cannotTakeSubFeat }
            }).filter(featSet => showOtherOptions || choice.filter.length || this.get_FeatTakenByChoice(featSet.subfeat, choice))
                .sort(function (a, b) {
                    if (a.subfeat.subType < b.subfeat.subType) {
                        return -1;
                    }
                    if (a.subfeat.subType > b.subfeat.subType) {
                        return 1;
                    }
                    return 0;
                }).sort(function (a, b) {
                    if (a.available && !b.available) {
                        return -1;
                    }
                    if (!a.available && b.available) {
                        return 1;
                    }
                    return 0;
                });
        } else {
            return [];
        }
    }

    get_ChoiceLevel(choice: FeatChoice) {
        let featLevel = 0;
        //Use character level for Familiar Abilities or for choices that don't look at the choice level, but the current character level.
        if (choice.source == "Familiar") {
            featLevel = this.get_Character().level;
        } else {
            if (choice.level) {
                featLevel = choice.level;
            } else if (choice.dynamicLevel) {
                try {
                    //Prepare level for the dynamicLevel evaluation.
                    let level = this.get_Character().class.levels[this.levelNumber];
                    let Character = this.get_Character();
                    //Eval the dynamicLevel string to convert things like "level.number / 2". "1" is still "1".
                    featLevel = Math.floor(parseInt(eval(choice.dynamicLevel)));
                } catch (e) {
                    console.log("Error converting Feat level");
                }
            } else {
                featLevel = this.levelNumber;
            }
        }
        return featLevel;
    }

    get_AvailableFeats(choice: FeatChoice, available: number) {
        let character = this.get_Character()
        //Get all feats, but no subtype Feats (those that have the supertype attribute set) - those get built within their supertype
        let allFeats: Feat[] = this.get_Feats().filter(feat => !feat.superType);
        //Get subfeats for later use
        let allSubFeats: Feat[] = this.get_Feats().filter(feat => feat.superType);
        //If feats are filtered, get them whether they are hidden or not. Otherwise, filter all hidden feats.
        if (choice.filter.length) {
            allFeats = allFeats.filter(feat =>
                choice.filter.includes(feat.name) ||
                (
                    feat.subTypes &&
                    allSubFeats.some(subFeat => !subFeat.hide && subFeat.superType == feat.name && choice.filter.includes(subFeat.name))
                )
            )
        } else {
            allFeats = allFeats.filter(feat => !feat.hide);
            allSubFeats = allSubFeats.filter(feat => !feat.hide);
        }
        let feats: Feat[] = [];
        if (choice.specialChoice) {
            //For special choices, we don't really use true feats, but make choices that can best be represented by the extensive feat structure.
            //In this case, we don't go looking for feats with a certain trait, but rely completely on the filter.
            feats.push(...allFeats);
        } else {
            switch (choice.type) {
                case "Class":
                    feats.push(...allFeats.filter(feat => feat.traits.includes(character.class.name) || feat.traits.includes("Archetype")));
                    break;
                case "Ancestry":
                    character.class.ancestry.ancestries.concat(["Ancestry"]).forEach(trait => {
                        feats.push(...allFeats.filter(feat => feat.traits.includes(trait)));
                    })
                    break;
                case "Familiar":
                    feats.push(...allFeats.filter(feat => feat.traits.includes("Familiar Ability") || feat.traits.includes("Master Ability")));
                default:
                    let traits: string[] = choice.type.split(",")
                    feats.push(...allFeats.filter((feat: Feat) => traits.filter(trait => feat.traits.includes(trait)).length == traits.length));
                    break;
            }
        }
        if (feats.length) {
            //Filter lower level, higher level and archetype feats only if there is no filter and the choice is not in the activities area.
            if (!choice.filter.length && !choice.showOnSheet) {
                if (!this.lowerLevelFeats) {
                    feats = feats.filter(feat => feat.levelreq >= this.featLevel || !feat.levelreq || this.get_FeatTakenByChoice(feat, choice) || this.subFeatTakenByThis(allSubFeats, feat, choice));
                }
                if (!this.higherLevelFeats) {
                    feats = feats.filter(feat => feat.levelreq <= this.featLevel || !feat.levelreq || this.get_FeatTakenByChoice(feat, choice) || this.subFeatTakenByThis(allSubFeats, feat, choice))
                }
                if (!this.archetypeFeats) {
                    feats = feats.filter(feat => !feat.traits.includes("Archetype") || this.get_FeatTakenByChoice(feat, choice) || this.subFeatTakenByThis(allSubFeats, feat, choice))
                }
            }
            if (this.archetypeFeats && !choice.filter.length) {
                //Show archetype feats only if their dedication feat has been taken.
                feats = feats.filter(feat =>
                    !feat.archetype ||
                    (
                        feat.traits.includes("Dedication") &&
                        feat.archetype != character.class.name
                    ) ||
                    (
                        feat.archetype && this.get_Feats()
                            .find(superFeat =>
                                superFeat.archetype == feat.archetype &&
                                superFeat.traits.includes("Dedication") &&
                                superFeat.have(character, this.characterService, this.levelNumber)
                            )
                    )
                );
            }
            let showOtherOptions = true;
            if (choice.feats.length >= available) {
                showOtherOptions = this.get_Character().settings.showOtherOptions;
            }
            return feats.map(feat => {
                let featCannotTake = this.cannotTake(feat, choice);
                let featAvailable = ((this.get_FeatTakenByChoice(feat, choice) && true) || (this.subFeatTakenByThis(allSubFeats, feat, choice) && true) || featCannotTake.length == 0);
                return { available: featAvailable, feat: feat, cannotTake: featCannotTake };
            }).filter(featSet => ((this.unavailableFeats || featSet.available) && showOtherOptions) || this.get_FeatTakenByChoice(featSet.feat, choice) || this.subFeatTakenByThis(allSubFeats, featSet.feat, choice))
                .sort(function (a, b) {
                    //Sort by level, then name. Divide level by 100 to create leading zeroes (and not sort 10 before 2), then cut it down to 3 digits. 0 will be 0.00.
                    //For skill feat choices and general feat choices, sort by the associated skill (if exactly one), then level and name.
                    //Feats with less or more required skills are sorted first.
                    let sortLevel_a = ((a.feat.levelreq || 0.1) / 100).toString().substr(0, 4);
                    let sortLevel_b = ((b.feat.levelreq || 0.1) / 100).toString().substr(0, 4);
                    let sort_a = sortLevel_a + a.feat.name;
                    let sort_b = sortLevel_b + b.feat.name;
                    if (["General", "Skill"].includes(choice.type)) {
                        sort_a = (a.feat.skillreq.length == 1 ? a.feat.skillreq[0]?.skill : "_") + sort_a;
                        sort_b = (b.feat.skillreq.length == 1 ? b.feat.skillreq[0]?.skill : "_") + sort_b;
                    }
                    if (sort_a < sort_b) {
                        return -1;
                    }
                    if (sort_a > sort_b) {
                        return 1;
                    }
                    return 0;
                }).sort(function (a, b) {
                    //Lastly, sort by availability.
                    if (a.available && !b.available) {
                        return -1;
                    }
                    if (!a.available && b.available) {
                        return 1;
                    }
                    return 0;
                });
        } else {
            return [];
        }
    }

    get_AvailableFeatsCount(featSets: { available: boolean, feat: Feat, cannotTake: { reason: string, explain: string }[] }[], available: boolean = true) {
        return featSets.filter(featSet => featSet.available == available).length;
    }

    cannotTakeSome(choice: FeatChoice) {
        let anytrue = 0;
        let available = this.get_Available(choice);
        choice.feats.forEach((feat, index) => {
            let template: Feat = this.get_Feats(feat.name)[0];
            if (template?.name) {
                if (this.cannotTake(template, choice).length || index >= available) {
                    if (!feat.locked) {
                        this.get_Character().take_Feat(this.get_Creature(), this.characterService, template, feat.name, false, choice, feat.locked);
                    } else {
                        anytrue += 1;
                    }
                    this.refreshService.process_ToChange();
                }
            }
        });
        return anytrue;
    }

    mustTakeSome(choice: FeatChoice, available: number) {
        //Takes feats automatically if applicable, then returns whether the choice needs to be hidden.
        this.cannotTakeSome(choice);
        //Check if there are more feats available as can be taken. If so, automatically take all feats that can be taken.
        let availableFeats = this.get_AvailableFeats(choice, available);
        let availableFeatsNotTaken: { available: boolean, feat: Feat, cannotTake: { reason: string, explain: string }[] }[] = [];
        //Collect all available feats that haven't been taken. If a feat has subfeats, collect its subfeats that haven't been taken instead.
        //This collection includes subfeats that exclude each other, in order to determine if the choice could be changed, and the choice should not be hidden.
        availableFeats.filter(featSet => featSet.available).forEach(featSet => {
            if (featSet.available) {
                if (!featSet.feat.subTypes && !this.get_FeatTakenByChoice(featSet.feat, choice)) {
                    availableFeatsNotTaken.push(featSet);
                } else if (featSet.feat.subTypes) {
                    this.get_SubFeats(featSet.feat, choice).forEach(subFeatSet => {
                        //Re-evaluate whether this subfeat should count, without considering whether it has already been taken, 
                        // because the available value considers whether another subfeat has already been taken,
                        // and we want to know if it would have been a valid choice in the first place.
                        let cannotTake = this.cannotTake(subFeatSet.subfeat, choice, false, true);
                        let canTake = cannotTake.length == 0;
                        if (canTake && !this.get_FeatTakenByChoice(subFeatSet.subfeat, choice)) {
                            availableFeatsNotTaken.push({ available: subFeatSet.available, feat: subFeatSet.subfeat, cannotTake: cannotTake });
                        }
                    })
                }
            }
        })
        //Only consider available feats that can actually be taken, and see if those are fewer or as many as the currently allowed number of feats. If so, take all of them.
        let featsToTake = availableFeatsNotTaken.filter(featSet => featSet.available);
        if (featsToTake.length && featsToTake.length <= (available - choice.feats.length)) {
            featsToTake.forEach(featSet => {
                this.get_Character().take_Feat(this.get_Creature(), this.characterService, featSet.feat, featSet.feat.name, true, choice, false, true);
            })
            this.refreshService.process_ToChange();
        }
        //If all available feats have been taken, no alternative choices remain, and none of the taken feats were taken manually, the choice will not be displayed.
        return !choice.feats.some(feat => !feat.automatic) && !availableFeatsNotTaken.some(featSet => !this.get_FeatTakenByChoice(featSet.feat, choice));
    }

    get_HideChoice(choice: FeatChoice, available: number) {
        if (choice.autoSelectIfPossible) {
            //If autoSelectIfPossible is true, feats are selected and deselected at this point. The choice will only be displayed if there are more options available than the number that is allowed to take.
            return this.mustTakeSome(choice, available) && !this.get_Character().settings.hiddenFeats;
        } else {
            return false;
        }
    }

    create_IgnoreRequirementList(feat: Feat, choice: FeatChoice) {
        //Prepare character and characterService for eval.
        let character = this.get_Character();
        let characterService = this.characterService;
        //Build the ignoreRequirements list from both the feat and the choice.
        let ignoreRequirementsList: string[] = [];
        feat.ignoreRequirements.concat((choice?.ignoreRequirements || [])).forEach(ignoreReq => {
            try {
                ignoreRequirementsList.push(eval(ignoreReq));
            } catch (error) {
                console.log("Failed evaluating feat requirement ignore list item (" + ignoreReq + "): " + error)
            }
        })
        return ignoreRequirementsList;
    }

    cannotTake(feat: Feat, choice: FeatChoice, skipLevel: boolean = false, skipSubfeatAlreadyTaken: boolean = false) {
        //Don't run the test on a blank feat - does not go well.
        if (feat?.name) {
            let creature = this.get_Creature();
            let levelNumber = this.levelNumber;
            let takenByThis: number = this.get_FeatTakenByChoice(feat, choice) ? 1 : 0;
            let ignoreRequirementsList: string[] = this.create_IgnoreRequirementList(feat, choice);
            let reasons: { reason: string, explain: string }[] = [];
            let traits: string[] = [];
            switch (choice.type) {
                case "Class":
                    traits.push(this.get_Character().class?.name, "Archetype");
                    break;
                case "Ancestry":
                    traits.push(...this.get_Character().class?.ancestry?.ancestries, "Ancestry");
                    break;
                case "Familiar":
                    traits.push("Familiar Ability", "Master Ability");
                    break;
                default:
                    traits.push(...choice.type.split(","));
                    break;
            }
            //Does the type not match a trait? (Unless it's a special choice, where the type doesn't matter and is just the title.)
            if (!choice.specialChoice && !feat.traits.find(trait => traits.includes(trait))) {
                reasons.push({ reason: "Invalid type", explain: "The feat's traits do not match the choice type." });
            }
            //If the feat can be taken a limited number of times:
            if (!feat.unlimited) {
                // (Don't count temporary choices (showOnSheet == true) unless this is also temporary.)
                let excludeTemporary = !choice.showOnSheet;
                let haveUpToNow: number = feat.have(creature, this.characterService, levelNumber, excludeTemporary, true);
                //Familiar abilities are independent of level. Don't check haveLater for them, because it will be the same result as haveUpToNow.
                let haveLater: number = creature.type == "Character" ? feat.have(creature, this.characterService, 20, excludeTemporary, true, levelNumber + 1) : 0;
                if (feat.limited) {
                    //Has it already been taken up to this level, excluding this FeatChoice, and more often than the limit?
                    //  Don't count temporary choices (showOnSheet == true) unless this is also temporary.
                    if (haveUpToNow - takenByThis >= feat.limited) {
                        reasons.push({ reason: "Already taken", explain: "This feat cannot be taken more than " + feat.limited + " times." });
                    } else if (haveUpToNow - takenByThis + haveLater >= feat.limited) {
                        //Has it been taken more often than the limits, including higher levels?
                        reasons.push({ reason: "Taken on higher levels", explain: "This feat has been selected all " + feat.limited + " times, including on higher levels." });
                    }
                } else {
                    //Has it already been taken up to this level, excluding this FeatChoice?
                    //  Don't count temporary choices (showOnSheet == true) unless this is also temporary.
                    if (haveUpToNow - takenByThis > 0) {
                        reasons.push({ reason: "Already taken", explain: "This feat cannot be taken more than once." });
                    }
                    //Has it been taken on a higher level (that is, not up to now, but up to Level 20)?
                    if (haveLater > 0) {
                        reasons.push({ reason: "Taken on higher level", explain: "This feat has been selected on a higher level." });
                    }
                }
            }
            //Dedication feats (unless the dedication limit is ignored)
            if (feat.traits.includes("Dedication") && !ignoreRequirementsList.includes("dedicationlimit")) {
                //Get all taken dedication feats that aren't this, then check if you have taken enough to allow a new archetype.
                let takenFeats = this.get_CharacterFeatsAndFeatures().filter(feat => feat.have(creature, this.characterService, levelNumber, true));
                takenFeats
                    .filter(libraryfeat => libraryfeat?.name != feat.name && libraryfeat?.traits.includes("Dedication")).forEach(takenfeat => {
                        let archetypeFeats = takenFeats
                            .filter(libraryfeat => libraryfeat?.name != takenfeat.name && libraryfeat?.traits.includes("Archetype") && libraryfeat.archetype == takenfeat.archetype)
                        if (archetypeFeats.length < 2) {
                            reasons.push({ reason: "Dedications blocked", explain: "You cannot select another dedication feat until you have gained two other feats from the " + takenfeat.archetype + " archetype." });
                        }
                    });
            }
            //If a subtype has been taken and the feat is not limited, no other subfeat can be taken.
            if (feat.superType && !skipSubfeatAlreadyTaken) {
                let superfeat: Feat = this.get_Feats().find(superfeat => superfeat.name == feat.superType && !superfeat.hide);
                if (!superfeat.unlimited) {
                    let takenSubfeats: Feat[] = this.get_Feats().filter(subfeat => subfeat.superType == feat.superType && subfeat.name != feat.name && !subfeat.hide && subfeat.have(creature, this.characterService, levelNumber));
                    //If another subtype has been taken, but not in this choice, and the feat is not unlimited, no other subfeat can be taken.
                    if (!superfeat.unlimited && !superfeat.limited && takenSubfeats.length) {
                        reasons.push({ reason: "Feat already taken", explain: "This feat cannot be taken more than once." });
                    }
                    if (superfeat.limited && takenSubfeats.length >= superfeat.limited) {
                        reasons.push({ reason: "Feat already taken", explain: "This feat cannot be taken more than " + superfeat.limited + " times." });
                    }
                }
            }
            if (reasons.length) {
                return reasons;
            }
            //Only if no other reason is given, check if the the basic requirements (level, ability, feat etc) are not met for this feat or all of its subfeats.
            //This is the most performance-intensive step, so we skip it if the feat can't be taken anyway.
            if (!feat.canChoose(this.characterService, this.featLevel, levelNumber, skipLevel, ignoreRequirementsList)) {
                reasons.push({ reason: "Requirements unmet", explain: "Not all requirements are met." });
            }
            //If this feat has any subtypes, check if any of them can be taken. If not, this cannot be taken either.
            if (feat.subTypes) {
                let subfeats: Feat[] = this.get_Feats().filter(subfeat => subfeat.superType == feat.name && !subfeat.hide);
                let subfeatsAvailable = subfeats.some(subfeat =>
                    this.get_FeatTakenByChoice(subfeat, choice) || this.cannotTake(subfeat, choice, skipLevel).length == 0
                );
                if (!subfeatsAvailable) {
                    reasons.push({ reason: "No option available", explain: "None of the options for this feat has its requirements met." });
                }
            }
            return reasons;
        }
    }

    get_FeatTakenEver(feat: Feat) {
        //Return whether this feat or a feat that counts as this feat has been taken at all up to this level - unless it's unlimited or its limit is not reached yet.
        let taken = this.characterService.get_CharacterFeatsTaken(1, this.levelNumber, feat.name, '', '', undefined, true, true);
        return !feat.unlimited && taken.length && taken.length >= feat.limited;
    }

    get_FeatTakenByChoice(feat: Feat, choice: FeatChoice) {
        return choice.feats.find(gain => gain.name == feat.name || gain.countAsFeat == feat.name);
    }

    subFeatTakenByThis(subfeats: Feat[] = this.get_Feats(), feat: Feat, choice: FeatChoice) {
        return choice.feats.find(gain => subfeats.some(subfeat => gain.name == subfeat.name && subfeat.superType == feat.name));
    }

    get_FeatsTaken(minLevelNumber: number, maxLevelNumber: number, featName: string = "", source: string = "", sourceId: string = "", locked: boolean = undefined) {
        return this.characterService.get_CharacterFeatsTaken(minLevelNumber, maxLevelNumber, featName, source, sourceId, locked);
    }

    get_FeatRequirements(choice: FeatChoice, feat: Feat, compare: Feat = undefined) {
        let result: Array<{ met?: boolean, ignored?: boolean, desc?: string }> = [];
        let ignoreRequirementsList: string[] = this.create_IgnoreRequirementList(feat, choice);
        //For subtypes, the supertype feat to compare is given. Only those requirements that differ from the supertype will be returned.
        if (compare) {
            if (feat.levelreq != compare.levelreq ||
                JSON.stringify(feat.abilityreq) != JSON.stringify(compare.abilityreq) ||
                JSON.stringify(feat.skillreq) != JSON.stringify(compare.skillreq) ||
                feat.featreq != compare.featreq ||
                feat.specialreqdesc != compare.specialreqdesc
            ) {
                result.push({ met: true, ignored: false, desc: "requires " });
                if (feat.levelreq && feat.levelreq != compare.levelreq) {
                    result.push(feat.meetsLevelReq(this.characterService, this.levelNumber));
                    result[result.length - 1].ignored = ignoreRequirementsList.includes('levelreq');
                }
                if (feat.abilityreq.length && JSON.stringify(feat.abilityreq) != JSON.stringify(compare.abilityreq)) {
                    feat.meetsAbilityReq(this.characterService, this.levelNumber).forEach(req => {
                        result.push({ met: true, desc: ", " });
                        result.push(req);
                        result[result.length - 1].ignored = ignoreRequirementsList.includes('abilityreq');
                    });
                }
                if (feat.skillreq.length && JSON.stringify(feat.skillreq) != JSON.stringify(compare.skillreq)) {
                    feat.meetsSkillReq(this.characterService, this.levelNumber).forEach((req, index) => {
                        if (index == 0) {
                            result.push({ met: true, desc: ", " });
                        } else {
                            result.push({ met: true, desc: " or " });
                        }
                        result.push(req);
                        result[result.length - 1].ignored = ignoreRequirementsList.includes('skillreq');
                    });
                }
                if (feat.featreq.length && JSON.stringify(feat.featreq) != JSON.stringify(compare.featreq)) {
                    feat.meetsFeatReq(this.characterService, this.levelNumber).forEach(req => {
                        result.push({ met: true, desc: ", " });
                        result.push(req);
                        result[result.length - 1].ignored = ignoreRequirementsList.includes('featreq');
                    });
                }
                if (feat.heritagereq.length && JSON.stringify(feat.heritagereq) != JSON.stringify(compare.heritagereq)) {
                    feat.meetsHeritageReq(this.characterService, this.levelNumber).forEach(req => {
                        result.push({ met: true, desc: ", " });
                        result.push(req);
                        result[result.length - 1].ignored = ignoreRequirementsList.includes('heritagereq');
                    });
                }
                if (feat.specialreqdesc && feat.specialreqdesc != compare.specialreqdesc) {
                    result.push({ met: true, desc: ", " });
                    result.push(feat.meetsSpecialReq(this.characterService, this.levelNumber));
                }
            }
        } else {
            if (feat.levelreq) {
                result.push(feat.meetsLevelReq(this.characterService, this.featLevel));
                result[result.length - 1].ignored = ignoreRequirementsList.includes('levelreq');
            }
            if (feat.abilityreq.length) {
                feat.meetsAbilityReq(this.characterService, this.levelNumber).forEach(req => {
                    result.push({ met: true, desc: ", " });
                    result.push(req);
                    result[result.length - 1].ignored = ignoreRequirementsList.includes('abilityreq');
                });
            }
            if (feat.skillreq.length) {
                feat.meetsSkillReq(this.characterService, this.levelNumber).forEach((req, index) => {
                    if (index == 0) {
                        result.push({ met: true, desc: ", " });
                    } else {
                        result.push({ met: true, desc: " or " });
                    }
                    result.push(req);
                    result[result.length - 1].ignored = ignoreRequirementsList.includes('skillreq');
                });
            }
            if (feat.featreq.length) {
                feat.meetsFeatReq(this.characterService, this.levelNumber).forEach(req => {
                    result.push({ met: true, desc: ", " });
                    result.push(req);
                    result[result.length - 1].ignored = ignoreRequirementsList.includes('featreq');
                });
            }
            if (feat.heritagereq) {
                feat.meetsHeritageReq(this.characterService, this.levelNumber).forEach(req => {
                    result.push({ met: true, desc: ", " });
                    result.push(req);
                    result[result.length - 1].ignored = ignoreRequirementsList.includes('heritagereq');
                });
            }
            if (feat.specialreqdesc) {
                result.push({ met: true, desc: ", " });
                result.push(feat.meetsSpecialReq(this.characterService, this.levelNumber));
            }
        }
        if (result.length > 1) {
            if (result[0].desc == ", ") {
                result.shift();
            }
            if (result[0].desc == "requires " && result[1].desc == ", ") {
                result.splice(1, 1);
            }
        } else if (result.length == 1 && result[0].desc == "requires ") {
            result.length = 0;
        }
        return result;
    }

    on_FeatTaken(feat: Feat, taken: boolean, choice: FeatChoice, locked: boolean) {
        if (taken && this.get_Character().settings.autoCloseChoices && (choice.feats.length == this.get_Available(choice) - 1)) { this.toggle_List(""); }
        this.get_Character().take_Feat(this.get_Creature(), this.characterService, feat, feat.name, taken, choice, locked);
        this.refreshService.set_ToChange("Character", "charactersheet");
        this.refreshService.set_ToChange("Character", "featchoices");
        this.refreshService.process_ToChange();
    }

    remove_BonusFeatChoice(choice: FeatChoice) {
        let level = this.get_Character().class.levels[this.levelNumber];
        let oldChoice: FeatChoice = level.featChoices.find(existingChoice => existingChoice.id == choice.id);
        //Feats must explicitly be un-taken instead of just removed from the array, in case they made fixed changes
        if (oldChoice) {
            oldChoice.feats.forEach(feat => {
                this.get_Character().take_Feat(this.get_Character(), this.characterService, undefined, feat.name, false, oldChoice, false);
            });
            level.featChoices.splice(level.featChoices.indexOf(oldChoice), 1);
        }
        this.toggle_List("");
        this.refreshService.process_ToChange();
    }

    still_loading() {
        return this.characterService.still_loading();
    }

    finish_Loading() {
        if (this.still_loading()) {
            setTimeout(() => this.finish_Loading(), 500)
        } else {
            this.refreshService.get_Changed
                .subscribe((target) => {
                    if (["featchoices", "all", this.creature.toLowerCase()].includes(target.toLowerCase())) {
                        this.featLevel = this.get_ChoiceLevel(this.choice);
                        this.changeDetector.detectChanges();
                    }
                });
            this.refreshService.get_ViewChanged
                .subscribe((view) => {
                    if (view.creature.toLowerCase() == this.creature.toLowerCase() && ["featchoices", "all"].includes(view.target.toLowerCase())) {
                        this.featLevel = this.get_ChoiceLevel(this.choice);
                        this.changeDetector.detectChanges();
                    }
                });
            return true;
        }
    }

    ngOnInit() {
        this.featLevel = this.get_ChoiceLevel(this.choice);
        this.finish_Loading();
    }

}