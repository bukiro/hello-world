import { Effect } from 'src/app/classes/effects/effect';
import { BonusDescription } from '../ui/bonus-list';
import { signNumber } from './number-utils';
import { capitalize } from './string-utils';

export const addBonusDescriptionFromEffect = (bonuses: Array<BonusDescription>, effect: Effect, valueDescription: string = ''): Array<BonusDescription> => [
    ...bonuses,
    bonusDescriptionFromEffect(effect, valueDescription),
];

export const bonusDescriptionFromEffect = (effect: Effect, valueDescription: string = ''): BonusDescription => {
    const setValue = effect.setValue ? effect.setValueNumerical : undefined;
    const value = effect ? effect.valueNumerical : undefined;
    const isAbsolute = !!effect.setValue;
    const isPenalty = !!effect.value && effect.penalty;
    const isBonus = !!effect.value && !effect.penalty;
    const type = effect.type
        ? `${ capitalize(effect.type) } ${ isPenalty ? 'penalty' : 'bonus' }`
        : undefined;
    const title = effect.source;

    return {
        title,
        type,
        isAbsolute,
        isPenalty,
        isBonus,
        value: determineBonusDescriptionValue({ setValue, value, valueDescription }),
    };
};

export const determineBonusDescriptionValue = ({ setValue, value, valueDescription }: { setValue: number | null | undefined; value: number | undefined; valueDescription: string }): string =>
    (
        setValue !== undefined
            ? `${ valueDescription } ${ setValue }`
            : value !== undefined
                ? `${ valueDescription } ${ signNumber(value) }`
                : ''
    ).trim();
