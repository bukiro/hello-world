import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ButtonModule } from '../button/button.module';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-corner-button-tray',
    templateUrl: './corner-button-tray.component.html',
    styleUrl: './corner-button-tray.component.scss',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        FormsModule,

        ButtonModule,
    ],
})
export class CornerButtonTrayComponent {

    @Input()
    public showCloseButton = false;

    @Input()
    public showMinimizeButton = false;

    @Input()
    public showTileModeButton = false;

    @Input()
    public minimized = false;

    @Input()
    public tileMode = false;

    @Output()
    public readonly closeButtonClicked = new EventEmitter<undefined>();

    @Output()
    public readonly toggleMinimized = new EventEmitter<boolean>();

    @Output()
    public readonly toggleTileMode = new EventEmitter<boolean>();

    public activeMinimizeLabel = 'Click to show all information.';
    public inactiveMinimizeLabel = 'Click to show compact information.';
    public activeTileModeLabel = 'Click to enable list mode.';
    public inactiveTileModeLabel = 'Click to enable tile mode.';
}