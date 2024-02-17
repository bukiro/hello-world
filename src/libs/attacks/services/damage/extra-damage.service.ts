import { Injectable } from '@angular/core';
import { AnimalCompanion } from 'src/app/classes/AnimalCompanion';
import { Character } from 'src/app/classes/Character';
import { Weapon } from 'src/app/classes/Weapon';
import { SpellsDataService } from 'src/libs/shared/services/data/spells-data.service';
import { CreatureEffectsService } from 'src/libs/shared/services/creature-effects/creature-effects.service';
import { attackEffectPhrases } from '../../util/attackEffectPhrases';
import { EmblazonArmamentTypes } from 'src/libs/shared/definitions/emblazon-armament-types';
import { Observable, combineLatest, map, of, switchMap } from 'rxjs';
import { propMap$ } from 'src/libs/shared/util/observableUtils';
import { CharacterFlatteningService } from 'src/libs/shared/services/character-flattening/character-flattening.service';
import { SpellChoice } from 'src/app/classes/SpellChoice';
import { SpellGain } from 'src/app/classes/SpellGain';
import { EmblazonArmamentSet } from 'src/libs/shared/definitions/interfaces/emblazon-armament-set';
import { BonusDescription } from 'src/libs/shared/ui/bonus-list';
import { RuneSourceSet } from '../../util/attackRuneSource';
import { WeaponRune } from 'src/app/classes/WeaponRune';
import { Oil } from 'src/app/classes/Oil';


export interface ExtraDamageResult {
    result: Array<string>;
    bonuses: Array<BonusDescription>;
}

export interface IntermediateMethodContext {
    weapon: Weapon;
    creature: Character | AnimalCompanion;
    range: 'ranged' | 'melee';
    prof: string;
    traits: Array<string>;
    runeSource: RuneSourceSet;
    isFavoredWeapon: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class ExtraDamageService {

    constructor(
        private readonly _creatureEffectsService: CreatureEffectsService,
        private readonly _spellsDataService: SpellsDataService,
    ) { }

    /**
     * Collect extra damage gains from various sources.
     *
     * @param context Previously determined parameters passed from the parent.
     * @returns
     */
    public extraDamage$(context: IntermediateMethodContext): Observable<ExtraDamageResult> {
        // Ensure that there is space between signs and words.
        const cleanupExtraDamageString = (extraDamage: string): string =>
            extraDamage
                .split('+')
                .map(part => part.trim())
                .join(' + ')
                .split('-')
                .map(part => part.trim())
                .join(' - ')
                .trim();

        return combineLatest([
            // Add the weapon's extra damage.
            of({ value: context.weapon.extraDamage, title: 'Inherent extra damage' }),
            this._extraDamageFromRunes$(context),
            this._extraDamageFromEmblazonEnergy$(context),
            this._extraDamageFromEffects$(context),
        ])
            .pipe(
                map(([fromWeapon, fromRunes, fromEmblazonEnergy, fromEffects]) =>
                    new Array<BonusDescription | undefined>()
                        .concat(
                            fromWeapon,
                            ...fromRunes,
                            fromEmblazonEnergy,
                            ...fromEffects,
                        )
                        .filter((bonus): bonus is BonusDescription => !!bonus)
                        // Cleanup the extra damage strings
                        .map(bonus => ({
                            ...bonus,
                            value: cleanupExtraDamageString(bonus.value),
                        }))
                        .reduce(
                            (previous, current) => ({
                                result: previous.result.concat(current.value),
                                bonuses: previous.bonuses.concat(current),
                            }),
                            { result: new Array<string>(), bonuses: new Array<BonusDescription>() },
                        ),
                ),
            );
    }

    /**
     * Collect extra damage granted by runes or other effects that emulate runes.
     *
     * @param context
     * @returns
     */
    private _extraDamageFromRunes$(context: IntermediateMethodContext): Observable<Array<BonusDescription>> {
        return combineLatest([
            context.runeSource.forPropertyRunes.weaponRunes$,
            // Add runes emulated by Blade Ally
            context.runeSource.forPropertyRunes.bladeAlly$
                .pipe(
                    switchMap(bladeAlly =>
                        bladeAlly
                            ? context.runeSource.forPropertyRunes.bladeAllyRunes.values$
                            : of([]),
                    ),
                ),
            // Add runes emulated by Oils
            context.weapon.oilsApplied.values$
                .pipe(
                    map(oilsApplied =>
                        oilsApplied
                            .filter((oil): oil is Oil & { runeEffect: WeaponRune } => !!oil.runeEffect),
                    ),
                ),
        ])
            .pipe(
                map(([propertyRunes, bladeAllyRunes, oilsAppliedWithRunes]) => {
                    const bonuses: Array<BonusDescription> = [];

                    const addToBonuses = (rune: WeaponRune, source?: string): void => {
                        bonuses.push({
                            value: rune.extraDamage,
                            title: source
                                ? `${ rune.name } (${ source })`
                                : rune.name,
                        });
                    };

                    propertyRunes
                        .forEach(rune => {
                            addToBonuses(rune);
                        });

                    bladeAllyRunes
                        .forEach(rune => {
                            addToBonuses(rune, 'Blade Ally');
                        });

                    oilsAppliedWithRunes
                        .forEach(oil => {
                            const runeEffect = oil.runeEffect;

                            addToBonuses(runeEffect, oil.name);
                        });

                    return bonuses;
                }),
            );
    }

    /**
     * Determine extra damage granted by Emblazon Energy.
     * If the weapon is emblazoned by Emblazon Energy and has an energy type, it gains 1d4 damage of that type.
     * If you have a domain spell with a trait matching that type, the damage increases to 1d6.
     *
     * @param context
     * @returns
     */
    private _extraDamageFromEmblazonEnergy$(context: IntermediateMethodContext): Observable<BonusDescription | undefined> {
        // Add extra damage added by emblazon energy.
        return (
            context.creature.isCharacter()
                ? context.weapon.effectiveEmblazonArmament$
                : of<EmblazonArmamentSet | undefined>(undefined)
        )
            .pipe(
                switchMap(emblazonArmament =>
                    // If the weapon has EmblazonEnergy and has an energy type, it gains 1d4 damage of that type.
                    // If you have a domain spell with a trait matching that type, the damage increases to 1d6.
                    (emblazonArmament?.type === EmblazonArmamentTypes.EmblazonEnergy)
                        ? propMap$(CharacterFlatteningService.characterClass$, 'spellCasting', 'values$')
                            .pipe(
                                switchMap(spellCastings => combineLatest(
                                    spellCastings
                                        .filter(spellCasting => spellCasting.source === 'Domain Spells')
                                        .map(spellCasting => spellCasting.spellChoices.values$),
                                )),
                                switchMap(spellChoicesLists => combineLatest(
                                    new Array<SpellChoice>()
                                        .concat(...spellChoicesLists)
                                        .map(spellChoice => spellChoice.spells.values$),
                                )),
                                map(spellsLists => {
                                    const type = emblazonArmament?.choice;

                                    if (!type) {
                                        return undefined;
                                    } else {
                                        let eaDmg = '+1d4';

                                        new Array<SpellGain>()
                                            .concat(...spellsLists)
                                            .forEach(spell => {
                                                if (this._spellsDataService.spellFromName(spell.name)?.traits.includes(type)) {
                                                    eaDmg = '+1d6';
                                                }
                                            });

                                        return {
                                            value: `${ eaDmg } ${ type }`,
                                            title: 'Emblazon Energy',
                                        };
                                    }
                                }),
                            )
                        : of(undefined),
                ),
            );
    }

    /**
     * Collect extra damage from effects.
     * These effects must be toggle and have the damage as a string in their title.
     *
     * @param context
     * @returns
     */
    private _extraDamageFromEffects$(context: IntermediateMethodContext): Observable<Array<BonusDescription>> {
        return context.weapon.large$
            .pipe(
                switchMap(isLargeWeapon => {
                    // Build a list of effect targets that affect this weapon's extra damage.
                    const effectPhrasesExtraDamage =
                        attackEffectPhrases(
                            'Extra Damage',
                            context,
                        );
                    const agile = context.traits.includes('Agile') ? 'Agile' : 'Non-Agile';

                    //"Agile/Non-Agile Large Melee Weapon Extra Damage"
                    if (isLargeWeapon) {
                        effectPhrasesExtraDamage.push(`${ agile } Large ${ context.range } Weapon Extra Damage`);
                    }

                    //"Agile/Non-Agile Melee Extra Damage"
                    effectPhrasesExtraDamage.push(`${ agile } ${ context.range } Extra Damage`);

                    if ((context.range === 'ranged') && context.weapon.traits.some(trait => trait.includes('Thrown'))) {
                        //"Agile/Non-Agile Thrown Large Weapon ExtraDamage"
                        if (isLargeWeapon) {
                            effectPhrasesExtraDamage.push(
                                `${ agile } Thrown Large Weapon Extra Damage`,
                            );
                        }

                        //"Agile/Non-Agile Thrown Weapon Damage"
                        effectPhrasesExtraDamage.push(`${ agile } Thrown Weapon Extra Damage`);
                    }

                    return this._creatureEffectsService.toggledEffectsOnThese$(context.creature, effectPhrasesExtraDamage)
                        .pipe(
                            map(toggledEffects =>
                                toggledEffects
                                    .filter(effect => effect.title)
                                    .map(effect => ({
                                        value: effect.title,
                                        title: effect.source,
                                    })),
                            ),
                        );
                }),
            );
    }

}