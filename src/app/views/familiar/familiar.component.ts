import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, Input } from '@angular/core';
import { distinctUntilChanged, map, Subscription, takeUntil } from 'rxjs';
import { Character } from 'src/app/classes/Character';
import { Familiar } from 'src/app/classes/Familiar';
import { CreatureService } from 'src/libs/shared/services/creature/creature.service';
import { CreatureEffectsService } from 'src/libs/shared/services/creature-effects/creature-effects.service';
import { RefreshService } from 'src/libs/shared/services/refresh/refresh.service';
import { CreatureTypes } from 'src/libs/shared/definitions/creatureTypes';
import { MenuNames } from 'src/libs/shared/definitions/menuNames';
import { MenuState } from 'src/libs/shared/definitions/types/menuState';
import { MenuService } from 'src/libs/shared/services/menu/menu.service';
import { CreatureAvailabilityService } from 'src/libs/shared/services/creature-availability/creature-availability.service';
import { SettingsService } from 'src/libs/shared/services/settings/settings.service';
import { BaseCardComponent } from 'src/libs/shared/util/components/base-card/base-card.component';
import { IsMobileMixin } from 'src/libs/shared/util/mixins/is-mobile-mixin';

@Component({
    selector: 'app-familiar',
    templateUrl: './familiar.component.html',
    styleUrls: ['./familiar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamiliarComponent extends IsMobileMixin(BaseCardComponent) implements OnInit, OnDestroy {

    public creatureTypesEnum = CreatureTypes;

    private _showMode = '';
    private _changeSubscription?: Subscription;
    private _viewChangeSubscription?: Subscription;

    constructor(
        private readonly _changeDetector: ChangeDetectorRef,
        private readonly _refreshService: RefreshService,
        private readonly _creatureEffectsService: CreatureEffectsService,
        private readonly _menuService: MenuService,
        private readonly _creatureAvailabilityService: CreatureAvailabilityService,
    ) {
        super();

        SettingsService.settings$
            .pipe(
                takeUntil(this._destroyed$),
                map(settings => settings.familiarMinimized),
                distinctUntilChanged(),
            )
            .subscribe(minimized => {
                this._updateMinimized({ bySetting: minimized });
            });
    }

    @Input()
    public set forceMinimized(forceMinimized: boolean | undefined) {
        this._updateMinimized({ forced: forceMinimized ?? false });
    }

    public get familiarMenuState(): MenuState {
        return this._menuService.familiarMenuState;
    }

    public get character(): Character {
        return CreatureService.character;
    }

    public get isFamiliarAvailable(): boolean {
        return this._creatureAvailabilityService.isFamiliarAvailable();
    }

    public get familiar(): Familiar {
        return CreatureService.familiar;
    }

    public toggleMinimized(minimized: boolean): void {
        SettingsService.settings.familiarMinimized = minimized;
    }

    public toggleFamiliarMenu(): void {
        this._menuService.toggleMenu(MenuNames.FamiliarMenu);
    }

    public toggleShownMode(type: string): void {
        this._showMode = this._showMode === type ? '' : type;
    }

    public shownMode(): string {
        return this._showMode;
    }

    public areFamiliarAbilitiesFinished(): boolean {
        const choice = this.familiar.abilities;
        let available = choice.available;

        this._creatureEffectsService.absoluteEffectsOnThis(this.character, 'Familiar Abilities').forEach(effect => {
            available = parseInt(effect.setValue, 10);
        });
        this._creatureEffectsService.relativeEffectsOnThis(this.character, 'Familiar Abilities').forEach(effect => {
            available += parseInt(effect.value, 10);
        });

        return choice.feats.length >= available;
    }

    public ngOnInit(): void {
        this._changeSubscription = this._refreshService.componentChanged$
            .subscribe(target => {
                if (['familiar', 'all'].includes(target.toLowerCase())) {
                    this._changeDetector.detectChanges();
                }
            });
        this._viewChangeSubscription = this._refreshService.detailChanged$
            .subscribe(view => {
                if (view.creature.toLowerCase() === 'familiar' && ['familiar', 'all'].includes(view.target.toLowerCase())) {
                    this._changeDetector.detectChanges();
                }
            });
    }

    public ngOnDestroy(): void {
        this._changeSubscription?.unsubscribe();
        this._viewChangeSubscription?.unsubscribe();
        this._destroy();
    }

}
