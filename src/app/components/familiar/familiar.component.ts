import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CharacterService } from 'src/app/services/character.service';
import { EffectsService } from 'src/app/services/effects.service';
import { FamiliarsService } from 'src/app/services/familiars.service';
import { RefreshService } from 'src/app/services/refresh.service';

@Component({
    selector: 'app-familiar',
    templateUrl: './familiar.component.html',
    styleUrls: ['./familiar.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FamiliarComponent implements OnInit {

    private showMode: string = "";
    public mobile: boolean = false;

    constructor(
        private changeDetector: ChangeDetectorRef,
        private characterService: CharacterService,
        private refreshService: RefreshService,
        private familiarsService: FamiliarsService,
        private effectsService: EffectsService
    ) { }

    minimize() {
        this.characterService.get_Character().settings.familiarMinimized = !this.characterService.get_Character().settings.familiarMinimized;
        this.set_Changed("Familiar");
    }

    get_Minimized() {
        return this.characterService.get_Character().settings.familiarMinimized;
    }

    still_loading() {
        return (this.characterService.still_loading() || this.familiarsService.still_loading());
    }

    toggleFamiliarMenu() {
        this.characterService.toggle_Menu("familiar");
    }

    get_FamiliarMenuState() {
        return this.characterService.get_FamiliarMenuState();
    }

    trackByIndex(index: number, obj: any): any {
        return index;
    }

    set_Changed(target: string) {
        this.refreshService.set_Changed(target);
    }

    get_Character() {
        return this.characterService.get_Character();
    }

    get_FamiliarAvailable() {
        return this.characterService.get_FamiliarAvailable();
    }

    get_Familiar() {
        return this.characterService.get_Familiar();
    }
    
    toggle_Mode(type: string) {
        if (this.showMode == type) {
            this.showMode = "";
        } else {
            this.showMode = type;
        }
    }

    get_ShowMode() {
        return this.showMode;
    }

    get_FamiliarAbilitiesFinished() {
        let choice = this.get_Familiar().abilities;
        let available = choice.available;
        this.effectsService.get_AbsolutesOnThis(this.get_Character(), "Familiar Abilities").forEach(effect => {
            available = parseInt(effect.setValue);
        });
        this.effectsService.get_RelativesOnThis(this.get_Character(), "Familiar Abilities").forEach(effect => {
            available += parseInt(effect.value);
        });
        return choice.feats.length >= available;
    }

    finish_Loading() {
        if (this.still_loading()) {
            setTimeout(() => this.finish_Loading(), 500)
        } else {
            this.refreshService.get_Changed
                .subscribe((target) => {
                    if (["familiar", "all"].includes(target.toLowerCase())) {
                        this.changeDetector.detectChanges();
                    }
                });
            this.refreshService.get_ViewChanged
                .subscribe((view) => {
                    if (view.creature.toLowerCase() == "familiar" && ["familiar", "all"].includes(view.target.toLowerCase())) {
                        this.changeDetector.detectChanges();
                    }
                });
            return true;
        }
    }

    set_Mobile() {
        this.mobile = this.characterService.get_Mobile();
    }

    ngOnInit() {
        this.set_Mobile();
        this.finish_Loading();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.set_Mobile();
    }

    @HostListener('window:orientationchange', ['$event'])
    onRotate(event) {
        this.set_Mobile();
    }

}