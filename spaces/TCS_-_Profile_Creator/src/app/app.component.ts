import {
    Component,
} from '@angular/core';

import {
    Router
} from '@angular/router';

import {
    SpacesBaseService,
    SpacesLoggingService,
    SpacesMessagesService,
    SpacesStorageService
} from 'spaces-ng/';
import {Message} from 'primeng/api';

@Component({
    templateUrl: './app.component.html',
    selector: 'tc-app'
})
export class AppComponent {
    constructor(
        private logging: SpacesLoggingService,
        private messages: SpacesMessagesService,
        private router: Router,
        private spacesBase: SpacesBaseService,
        private storage: SpacesStorageService
    ) {
        this.logging.logLevel = 'debug';  // set app default logging level
        this.logging.moduleColor('#633974', '#fff', 'AppComponent');  // set logging console colors
    }

    get msgs(): Message[] {
      return this.messages.msgs;
    }
}
