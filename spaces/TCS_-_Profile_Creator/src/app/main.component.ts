import {
    Component,
    OnInit
} from '@angular/core';

import { Router } from '@angular/router';

import {
    SpacesBaseService,
    SpacesLoggingService,
    SpacesMessagesService,
} from 'spaces-ng/';

declare var $:any

@Component({
    templateUrl: './main.component.html',
    selector: 'tc-main',
})
export class MainComponent implements OnInit {
    constructor(
        private logging: SpacesLoggingService,
        private messages: SpacesMessagesService,
        private router: Router,
        private spacesBase: SpacesBaseService
    ) {
        this.logging.moduleColor('#FFFF00', '#000', 'MainComponent');  // set logging console colors
    }

    ngOnInit() {
        $(document).foundation();
    }
}
