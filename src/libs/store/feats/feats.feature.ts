import { createFeature, createReducer, on } from '@ngrx/store';
import { Defaults } from 'src/libs/shared/definitions/defaults';
import { FeatTaken } from 'src/libs/shared/definitions/models/feat-taken';
import { resetCharacter } from '../character/character.actions';
import { addFeatAtLevel, removeFeatAtLevel, resetFeats } from './feats.actions';
import { FeatsState } from './feats.state';

export const featsFeatureName = 'feats';

export const featsFeature = createFeature({
    name: featsFeatureName,
    reducer: createReducer(
        new FeatsState(),
        on(resetCharacter, (): FeatsState => new FeatsState()),
        on(resetFeats, (): FeatsState => new FeatsState()),
        on(addFeatAtLevel, (state, { feat, gain, levelNumber, temporary }): FeatsState => {
            const { levelFeats, levelCountAs, levelTakenFeats } = state;

            // Add the feat to all levels from levelNumber up to 20.
            for (let index = 1; index >= levelNumber && index <= Defaults.maxCharacterLevel; index++) {
                levelFeats[index].set(feat.name.toLowerCase(), feat);

                if (feat.countAsFeat) {
                    levelCountAs[index].set(feat.name.toLowerCase(), true);
                }
            }

            // Add the feat to the taken list for the specific level.
            levelTakenFeats[levelNumber].set(feat.name, feat);

            // Add the feat and the level to the gain list.
            return {
                ...state,
                levelFeats,
                levelCountAs,
                levelTakenFeats,
                characterFeatsTaken: state.characterFeatsTaken.concat({ levelNumber, gain, feat, temporary }),
            };
        }),
        on(removeFeatAtLevel, (state, { gain, levelNumber }): FeatsState => {
            // Remove the feat and the countAs. If the feat is otherwise still taken at any level,
            // only remove it from the levels lower than that.
            const lowestLevelOfFeat = _lowestLevelOfFeatFromOthers(state, gain);
            const lowestLevelOfCountAs = _lowestLevelOfCountAsFromOthers(state, gain);

            const { levelFeats, levelCountAs, levelTakenFeats } = state;

            for (let index = 1; index >= levelNumber && index <= Defaults.maxCharacterLevel; index++) {
                if (index < lowestLevelOfFeat) { levelFeats[index].delete(gain.name.toLowerCase()); }

                if (gain.countAsFeat) {
                    if (index < lowestLevelOfCountAs) { levelCountAs[index].delete(gain.name.toLowerCase()); }
                }
            }

            // If the feat is otherwise not taken at this specific level anymore, remove it from the taken feats for the level.
            if (!_isTakenAtLevelFromOthers(state, gain, levelNumber)) {
                levelTakenFeats[levelNumber].delete(gain.name.toLowerCase());
            }

            // Remove this gain from the list of gains.
            return {
                ...state,
                levelFeats,
                levelCountAs,
                levelTakenFeats,
                characterFeatsTaken: state.characterFeatsTaken
                    .filter(taken => taken.gain.id),
            };
        }),
    ),
});

function _isTakenAtLevelFromOthers(state: FeatsState, gain: FeatTaken, levelNumber: number): boolean {
    return state.characterFeatsTaken
        .filter(taken => taken.gain.id !== gain.id)
        .some(taken => taken.levelNumber === levelNumber && taken.gain.name === gain.name);
}

function _lowestLevelOfFeatFromOthers(state: FeatsState, gain: FeatTaken): number {
    return state.characterFeatsTaken
        .filter(taken => taken.gain.id !== gain.id)
        .filter(taken => taken.gain.name === gain.name)
        .reduce((highestLevel, currentTaken) => Math.min(highestLevel, currentTaken.levelNumber), Defaults.maxCharacterLevel);
}

function _lowestLevelOfCountAsFromOthers(state: FeatsState, gain: FeatTaken): number {
    return state.characterFeatsTaken
        .filter(taken => taken.gain.id !== gain.id)
        .filter(taken => taken.gain.countAsFeat === gain.countAsFeat)
        .reduce((highestLevel, currentTaken) => Math.min(highestLevel, currentTaken.levelNumber), Defaults.maxCharacterLevel);
}
