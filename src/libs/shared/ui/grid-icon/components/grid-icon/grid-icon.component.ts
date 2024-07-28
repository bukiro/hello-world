/* eslint-disable complexity */
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { Subscription, Observable, of, combineLatest, map } from 'rxjs';
import { Activity } from 'src/app/classes/activities/activity';
import { ActivityGain } from 'src/app/classes/activities/activity-gain';
import { ItemActivity } from 'src/app/classes/activities/item-activity';
import { Condition } from 'src/app/classes/conditions/condition';
import { ConditionGain } from 'src/app/classes/conditions/condition-gain';
import { Creature } from 'src/app/classes/creatures/creature';
import { Effect } from 'src/app/classes/effects/effect';
import { Armor } from 'src/app/classes/items/armor';
import { Equipment } from 'src/app/classes/items/equipment';
import { Item } from 'src/app/classes/items/item';
import { Weapon } from 'src/app/classes/items/weapon';
import { Spell } from 'src/app/classes/spells/spell';
import { BasicRuneLevels } from 'src/libs/shared/definitions/basic-rune-levels';
import { Feat } from 'src/libs/shared/definitions/models/feat';
import { TimePeriods } from 'src/libs/shared/definitions/time-periods';
import { ActivityPropertiesService } from 'src/libs/shared/services/activity-properties/activity-properties.service';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { RefreshService } from 'src/libs/shared/services/refresh/refresh.service';
import { BaseClass } from 'src/libs/shared/util/classes/base-class';
import { TrackByMixin } from 'src/libs/shared/util/mixins/track-by-mixin';
import { ActionIconsComponent } from '../../../action-icons/components/action-icons/action-icons.component';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-grid-icon',
    templateUrl: './grid-icon.component.html',
    styleUrls: ['./grid-icon.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        CommonModule,

        ActionIconsComponent,
    ],
})
export class GridIconComponent extends TrackByMixin(BaseClass) implements OnInit, OnDestroy {

    //TODO: This component should be much dumber.
    // Create wrappers for the different objects that build a gridIcon, and let them create the title, subTitle, superTitle etc.

    @Input()
    public creature: Creature = CreatureService.character;
    @Input()
    public title = '';
    @Input()
    public detail = '';
    @Input()
    public subTitle = '';
    @Input()
    public superTitle = '';
    @Input()
    public type: '' | 'Condition' | 'Feat' = '';
    @Input()
    public desc = '';
    @Input()
    public shortDesc = '';
    @Input()
    public condition?: ConditionGain;
    @Input()
    public originalCondition?: Condition;
    @Input()
    public feat?: Feat;
    @Input()
    public effect?: Effect;
    @Input()
    public spell?: Spell;
    @Input()
    public activity?: Activity;
    @Input()
    public activityGain?: ActivityGain | ItemActivity;
    @Input()
    public item?: Item;
    @Input()
    public itemStore?: boolean;
    //The gridicon will refresh if this ID is updated by this.refreshService.set_Changed().
    @Input()
    public updateId?: string;

    private _changeSubscription?: Subscription;
    private _viewChangeSubscription?: Subscription;

    constructor(
        private readonly _refreshService: RefreshService,
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _activityPropertiesService: ActivityPropertiesService,
    ) {
        super();
    }

    public iconSubTitle(): string {
        let subTitle = this.subTitle;

        if (subTitle.includes('noparse|')) {
            return subTitle.replace('noparse|', '');
        }

        if (this.condition?.duration || this.effect?.duration) {
            const duration = this.condition?.duration || this.effect?.duration || 0;

            if (duration < TimePeriods.Turn) {
                switch (duration) {
                    case TimePeriods.UntilRefocus:
                        return '<i class=\'bi-eye-fill\'></i>';
                    case TimePeriods.UntilRest:
                        return '<i class=\'bi-sunrise-fill\'></i>';
                    case TimePeriods.Permanent:
                        return '<i class=\'bi-arrow-repeat\'></i>';
                    case TimePeriods.NoTurn:
                        return '';
                    case TimePeriods.UntilResolved:
                        return '<i class=\'bi-exclamation-diamond-fill\'></i>';
                    case TimePeriods.UntilOtherCharactersTurn:
                        return '<i class=\'bi-person-plus-fill\'></i>';
                    case TimePeriods.UntilResolvedAndOtherCharactersTurn:
                        return '<i class=\'bi-exclamation-diamond-fill\'></i>';
                    case TimePeriods.HalfTurn:
                        return '<i class=\'bi-play-fill\'></i>';
                    default: break;
                }
            }
        }

        if (this.spell?.actions) {
            const actions = this.spell.actions.replace('hour', 'hr').replace('minute', 'min')
                .replace(' to 2A', '| <i class=\'bi-plus-circle\'></i>')
                .replace(' to 3A', '| <i class=\'bi-plus-circle\'></i>')
                .replace(' or more', '| <i class=\'bi-plus-circle\'></i>');

            return `actionIcons|${ actions }`;
        }

        if (this.activity?.actions) {
            const actions = this.activity.actions.replace('hour', 'hr').replace('minute', 'min')
                .replace(' to 2A', '| <i class=\'bi-plus-circle\'></i>')
                .replace(' to 3A', '| <i class=\'bi-plus-circle\'></i>')
                .replace(' or more', '| <i class=\'bi-plus-circle\'></i>');

            return `actionIcons|${ actions }`;
        }

        if (this.item) {
            let itemSubTitle = '';

            if ((this.item as Equipment).material?.length) {
                itemSubTitle += '<i class=\'ra ra-diamond\'></i>';
            }

            if ((this.item as Equipment).broken) {
                itemSubTitle += '<i class=\'ra ra-broken-shield\'></i>';
            }

            if ((this.item as Equipment).shoddy) {
                itemSubTitle += '<i class=\'ra ra-broken-bottle\'></i>';
            }

            if (this.item.expiration) {
                itemSubTitle += '<i class=\'ra ra-clockwork\'></i>';
            }

            if ((this.item as Weapon).large) {
                itemSubTitle += '<i class=\'ra ra-large-hammer\'></i>';
            }

            if ((this.item as Weapon).bladeAlly) {
                itemSubTitle += '<i class=\'ra ra-fireball-sword\'></i>';
            }

            if ((this.item as Weapon | Armor).battleforged) {
                itemSubTitle += '<i class=\'ra ra-fireball-sword\'></i>';
            }

            if (itemSubTitle) {
                return itemSubTitle;
            }
        }

        //Convert icon- names into a <i> with that icon. Icons can be separated with |.
        subTitle = subTitle.split('|').map(split => {
            const iconPhraseLength = 5;

            if (split.substring(0, iconPhraseLength) === 'icon-') {
                return `<i class='${ split.substring(iconPhraseLength) }'></i>`;
            } else {
                return split;
            }
        })
            .join('');

        return subTitle;
    }

    public iconTitle(): string {
        let iconTitle: string = this.title;

        if (iconTitle.includes('noparse|')) {
            return iconTitle.replace('noparse|', '');
        }

        if (this.activity?.iconTitleOverride) {
            iconTitle = this.activity.iconTitleOverride;
        } else if (this.item?.iconTitleOverride) {
            iconTitle = this.item.iconTitleOverride;
        } else {
            if (this.feat) {
                if (this.feat.subType) {
                    iconTitle = this.title || this.feat.superType;
                } else {
                    iconTitle = this.title || this.feat.name;
                }
            } else if (this.condition) {
                iconTitle = this.title || this.condition.name;
            } else if (this.effect) {
                iconTitle = this.title || this.effect.target;
            }

            iconTitle = iconTitle.replace('(', '').replace(')', '')
                .trim();

            if (iconTitle) {
                if (!iconTitle.includes(' ')) {
                    // If the title does not contain spaces, and is not just a number, keep only letters and return the first 3 letters.
                    // Return numbers unchanged.
                    const firstThreeLetters = 3;

                    if (isNaN(parseInt(iconTitle, 10))) {
                        iconTitle = iconTitle.replace(/[^A-Z]/gi, '').substring(0, firstThreeLetters);
                    }
                } else if (iconTitle.match('.*[A-Z].*')) {
                    // If the title has spaces and contains capital letters, keep only capital letters and return the first 6.
                    const firstSixLetters = 6;

                    iconTitle = iconTitle.replace(/[^A-Z ]/g, '').split(' ')
                        .map(part => part.substring(0, 1))
                        .join('')
                        .substring(0, firstSixLetters);
                } else if (iconTitle.match('.*[A-Za-z].*')) {
                    // If the title has spaces and contains no capital letters,
                    // keep only the first letters of every word and return the first 4.
                    const firstSixLetters = 6;

                    iconTitle = iconTitle.replace(/[^A-Z ]/gi, '').split(' ')
                        .map(part => part.substring(0, 1))
                        .join('')
                        .toUpperCase()
                        .substring(0, firstSixLetters);
                }
            }
        }

        const threeThreeBreakpoint = 6;
        const twoThreeBreakpoint = 5;
        const twoTwoBreakpoint = 4;
        const three = 3;
        const two = 2;

        if (iconTitle.length >= threeThreeBreakpoint) {
            //If the title is 6 letters or more, break them into 3+3.
            iconTitle = `${ iconTitle.substring(0, three) }<br />${ iconTitle.substring(three, threeThreeBreakpoint) }`;
        } else if (iconTitle.length === twoThreeBreakpoint) {
            //If the title is 5 letters or more, break them into 2+3.
            iconTitle = `${ iconTitle.substring(0, two) }<br />${ iconTitle.substring(two, twoThreeBreakpoint) }`;
        } else if (iconTitle.length === twoTwoBreakpoint) {
            //If the title is 4 letters or more, break them into 2+2.
            iconTitle = `${ iconTitle.substring(0, two) }<br />${ iconTitle.substring(two, twoTwoBreakpoint) }`;
        }

        return iconTitle;
    }

    public iconDetail(): string {
        const iconDetailMaxLength = 2;
        let iconDetail: string = this.detail;

        if (iconDetail.includes('noparse|')) {
            return iconDetail.replace('noparse|', '');
        }

        if (this.feat && !iconDetail) {
            if (this.feat.subType) {
                iconDetail = this.feat.subType;
            }
        } else if (this.condition && !iconDetail) {
            //For condition stages, leave only the number.
            const stagePhraseLength = 6;

            if (this.condition.choice.substring(0, stagePhraseLength) === 'Stage ') {
                iconDetail = this.condition.choice.replace('tage ', '');

                return iconDetail;
            } else if (this.condition.name === 'Persistent Damage') {
                iconDetail = this.condition.choice.split(' ')[0]?.substring(0, stagePhraseLength) ?? '';

                return iconDetail;
            } else {
                iconDetail = this.condition.choice;
            }
        }

        if (iconDetail) {
            const detailAsNumber = parseInt(iconDetail, 10);

            if (isNaN(detailAsNumber)) {
                if (iconDetail.match('.*[A-Z].*')) {
                    iconDetail = iconDetail.replace(/[^A-Z ]/g, '').split(' ')
                        .map(part => part.substring(0, 1))
                        .join('')
                        .substring(0, iconDetailMaxLength);
                } else {
                    iconDetail = iconDetail.replace(/[^a-z ]/gi, '').split(' ')
                        .map(part => part.substring(0, 1))
                        .join('')
                        .toUpperCase()
                        .substring(0, iconDetailMaxLength);
                }
            } else {
                iconDetail = detailAsNumber.toString();
            }
        }

        return iconDetail;
    }

    public iconSuperTitle$(): Observable<string> {
        let superTitle: string = this.superTitle;

        if (superTitle.includes('noparse|')) {
            return of(superTitle.replace('noparse|', ''));
        }

        //Convert icon- names into a <i> with that icon. Icons can be separated with |.
        // There should only be one icon, ideally.
        superTitle = superTitle.split('|').map(split => {
            const iconPhraseLength = 5;

            if (split.substring(0, iconPhraseLength) === 'icon-') {
                return `<i class='${ split.substring(iconPhraseLength) }'></i>`;
            } else {
                return split;
            }
        })
            .join('');

        //For effect values, show the value as SuperTitle if up to 2 characters long. Longer values will be shown as Value instead.
        if (this.effect) {
            if (this.effect.toggled) {
                superTitle = '';
            } else if (this.effect.title) {
                superTitle = this.effect.title;
            } else if (this.effect.setValue) {
                superTitle = this.effect.setValue;
            } else if (this.effect.value) {
                superTitle = this.effect.value;
            }
        } else if (this.condition?.durationIsInstant || this.condition?.nextStage === -1) {
            //If a condition has a duration of 1, it needs to be handled immediately, and we show an exclamation diamond to point that out.
            return of('<i class=\'bi-exclamation-diamond\'></i>');
        } else if (this.condition?.lockedByParent || this.condition?.valueLockedByParent) {
            //If a condition or its value is locked by its parent, show a lock.
            return of('<i class=\'bi-lock\'></i>');
        }

        if (this.item) {
            if (this.item.isWeapon()) {
                switch (this.item.group) {
                    case 'Axe':
                        return of('<i class=\'ra ra-axe\'></i>');
                    case 'Bomb':
                        //Bombs can stack. Instead of showing a bomb icon, show the amount.
                        return of(this.item.amount.toString());
                    case 'Bow':
                        return of('<i class=\'ra ra-crossbow\'></i>');
                    case 'Brawling':
                        return of('<i class=\'ra ra-hand\'></i>');
                    case 'Club':
                        return of('<i class=\'ra ra-spiked-mace\'></i>');
                    case 'Dart':
                        return of('<i class=\'ra ra-kunai\'></i>');
                    case 'Flail':
                        return of('<i class=\'ra ra-grappling-hook\'></i>');
                    case 'Hammer':
                        return of('<i class=\'ra ra-flat-hammer\'></i>');
                    case 'Knife':
                        return of('<i class=\'ra ra-plain-dagger\'></i>');
                    case 'Pick':
                        return of('<i class=\'ra ra-mining-diamonds\'></i>');
                    case 'Polearm':
                        return of('<i class=\'ra ra-halberd\'></i>');
                    case 'Shield':
                        return of('<i class=\'ra ra-shield\'></i>');
                    case 'Sling':
                        return of('<i class=\'ra ra-blaster\'></i>');
                    case 'Spear':
                        return of('<i class=\'ra ra-spear-head\'></i>');
                    case 'Sword':
                        return of('<i class=\'ra ra-sword\'></i>');
                    default: break;
                }
            }

            if (this.itemStore) {
                if ((this.item.isConsumable() || this.item.isAdventuringGear()) && this.item.stack !== 1) {
                    return of(this.item.stack.toString());
                }
            } else {
                if (this.item.isConsumable() || this.item.amount !== 1) {
                    return of(this.item.amount.toString());
                }
            }

            if (this.item.isEquipment() && this.item.gainInventory.length) {
                return of('<i class=\'ra ra-hive-emblem\'></i>');
            }
        }

        const defaultSuperTitle = (): string => {
            //Only show a supertitle if it has 2 or fewer characters, or is an icon.
            const showSuperTitleBreakpoint = 2;

            if (superTitle.length <= showSuperTitleBreakpoint || superTitle.includes('<i')) {
                return superTitle;
            } else {
                return '';
            }
        };

        //For activities, show the number of activations if applicable.
        if (this.activity && this.activityGain) {
            return combineLatest([
                this._activityPropertiesService.effectiveMaxCharges$(this.activity, { creature: this.creature }),
                this.activityGain.chargesUsed$,
            ])
                .pipe(
                    map(([charges, chargesUsed]) => {
                        if (charges) {
                            return (chargesUsed - charges).toString();
                        }

                        return defaultSuperTitle();
                    }),
                );
        }

        return of(defaultSuperTitle());
    }

    public iconValue$(): Observable<string> {
        const maxIconValueLength = 6;
        const minIconValueLength = 2;

        if (this.activity) {
            if (this.activity.iconValueOverride) {
                return of(this.activity.iconValueOverride.substring(0, maxIconValueLength));
            }
        }

        // Show condition value, and show effect values over 2 characters, trimmed to 6 characters.
        if (this.condition) {
            return combineLatest([
                //TODO: Make reactive
                of(this.condition.value),
                of(this.condition.duration),
            ])
                .pipe(
                    map(([value, duration]) => {
                        if (value) {
                            if (this.condition?.name === 'Stunned' && duration !== -1) {
                                return '';
                            } else {
                                return value.toString();
                            }
                        }

                        return '';
                    }),
                );
        }

        // Shorter effect values will be shown as SuperTitle instead.
        if (this.effect) {
            if (this.effect.title && (this.effect.title.length || 0) > minIconValueLength) {
                return of(this.effect.title.split(' (')[0]?.split(':')[0]?.substring(0, maxIconValueLength) ?? '');
            } else if (this.effect?.setValue && this.effect?.setValue?.length > minIconValueLength) {
                return of(this.effect.setValue.substring(0, maxIconValueLength));
            } else if (this.effect?.value && this.effect?.value?.length > minIconValueLength) {
                return of(this.effect.value.substring(0, maxIconValueLength));
            }
        }

        if (this.item) {
            if (this.item.iconValueOverride) {
                return of(this.item.iconValueOverride);
            }

            if (this.item.isEquipment()) {
                return combineLatest([
                    this.item.effectivePotency$(),
                    this.item.effectiveStriking$(),
                    this.item.effectiveResilient$(),
                    this.item.propertyRunes.values$,
                ])
                    .pipe(
                        map(([potency, striking, resilient, propertyRunes]) => {
                            if (potency) {
                                let value = potency.toString();

                                switch (striking) {
                                    case BasicRuneLevels.First:
                                        value += 'S';
                                        break;
                                    case BasicRuneLevels.Second:
                                        value += 'GS';
                                        break;
                                    case BasicRuneLevels.Third:
                                        value += 'MS';
                                        break;
                                    default: break;
                                }

                                switch (resilient) {
                                    case BasicRuneLevels.First:
                                        value += 'R';
                                        break;
                                    case BasicRuneLevels.Second:
                                        value += 'GR';
                                        break;
                                    case BasicRuneLevels.Third:
                                        value += 'MR';
                                        break;
                                    default: break;
                                }

                                if (propertyRunes.length) {
                                    value += '+';
                                }

                                return value;
                            }

                            return this.item?.gridIconValue() ?? '';
                        }),
                    );
            }
        }

        return of('');
    }

    public durationOverlays(): Array<{ offset: number; percentage: number; over50: number }> {
        if (this.condition?.duration || this.effect?.duration) {
            const percent = 100;
            const half = 50;

            const duration = (this.condition || this.effect)?.duration || 0;
            const maxDuration = (this.condition || this.effect)?.maxDuration || 0;
            const percentage = percent - Math.floor((duration / maxDuration) * percent);

            if (percentage > half) {
                return [
                    { offset: 0, percentage: half, over50: 1 },
                    { offset: half, percentage: percentage - half, over50: 0 },
                ];
            } else {
                return [
                    { offset: 0, percentage, over50: 0 },
                    { offset: half, percentage: 0, over50: 0 },
                ];
            }
        } else {
            return [];
        }
    }

    public ngOnInit(): void {
        if (this.updateId) {
            this._changeSubscription = this._refreshService.componentChanged$
                .subscribe(target => {
                    if (target === this.updateId || (target === 'effects' && this.condition)) {
                        this._changeDetector.detectChanges();
                    }
                });
            this._viewChangeSubscription = this._refreshService.detailChanged$
                .subscribe(view => {
                    if (view.target === this.updateId || (view.target.toLowerCase() === 'effects' && this.condition)) {
                        this._changeDetector.detectChanges();
                    }
                });
        }
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
    }

    private _isOneWordTitle(): boolean {
        let title: string = this.title;

        if (this.feat) {
            if (this.feat.subType) {
                title = this.title || this.feat.superType;
            } else {
                title = this.title || this.feat.name;
            }
        } else if (this.condition) {
            title = this.title || this.condition.name;
        } else if (this.effect) {
            title = this.title || this.effect.target;
        }

        return !title.includes(' ');
    }

}
