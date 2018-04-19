import { Component, OnInit } from '@angular/core';

import {
    SpacesMessagesService,
} from 'spaces-ng/';

import { DatastoreService } from '../../services/datastore.services';
import { Profile, Attribute } from '../../interfaces';

@Component({
  selector: 'creator',
  templateUrl: './creator.component.html',
  styleUrls: ['./creator.component.less']
})
export class CreatorComponent implements OnInit {
    name: string = "";
    attributeType: string = "";
    attributeValue: string = "";
    attributeDisplayed: boolean = false;
    attributes: Attribute[] = [];
    tag: string = "";
    tags: string[] = [];
    saved: boolean = true;

    constructor(
        private messages: SpacesMessagesService,
        public db: DatastoreService
    ) { }

    ngOnInit() {
        this.getExistingProfiles();
    }

    getExistingProfiles() {
        this.db.getData();
    }

    displayProfile(profileName: string) {
        for (var i = this.db.existingProfiles.length - 1; i >= 0; i--) {
            if (this.db.existingProfiles[i].name === profileName) {
                this.attributes = this.db.existingProfiles[i].attributes;
                this.tags = this.db.existingProfiles[i].tags;
                this.name = this.db.existingProfiles[i].name;
            }
        }
    }

    saveProfile() {
        if (this.name === '') {
            this.messages.showError('Missing data', 'Please enter a name for this profile');
            return;
        } else if (this.attributes.length === 0 && this.tags.length === 0) {
            this.messages.showError('Missing data', 'Please add either attributes or tags to this profile');
            return;
        }

        let newProfile = {
            name: this.name,
            attributes: this.attributes,
            tags: this.tags
        };
        this.db.save(newProfile);

        this.name = '';
        this.attributes = [];
        this.attributeType = '';
        this.attributeValue = '';
        this.attributeDisplayed = false;
        this.tag = '';
        this.tags = [];
        this.saved = true;
    }

    deleteProfile(profileName) {
        this.db.delete(profileName);
    }

    displayAttribute(attributeType, attributeValue, attributeDisplayed) {
        this.deleteAttribute(attributeType, attributeValue, attributeDisplayed);
        this.attributeType = attributeType;
        this.attributeValue = attributeValue;
        this.attributeDisplayed = attributeDisplayed;
    }

    updateAttributes() {
        if (this.attributeType === '' || this.attributeValue === '') {
            this.messages.showError('Missing data', 'Please make sure this attribute has a type and a value');
        }

        this.attributes.push({
            type: this.attributeType,
            value: this.attributeValue,
            displayed: this.attributeDisplayed
        });

        this.attributeType = '';
        this.attributeValue = '';
        this.attributeDisplayed = false;
        this.saved = false;
    }

    deleteAttribute(attributeType, attributeValue, attributeDisplayed) {
        for (var i = this.attributes.length - 1; i >= 0; i--) {
            if (this.attributes[i].type === attributeType && this.attributes[i].value === attributeValue && this.attributes[i].displayed === attributeDisplayed) {
                this.attributes.splice(i, 1);
                this.saved = false;
                break;
            }
        }
    }

    displayTag(tag) {
        this.deleteTag(tag);
        this.tag = tag;
    }

    updateTag() {
        if (this.tag === '') {
            this.messages.showError('Missing data', 'Please enter a tag')
        }

        this.tags.push(this.tag);

        this.tag = '';
        this.saved = false;
    }

    deleteTag(tag) {
        for (var i = this.tags.length - 1; i >= 0; i--) {
            if (this.tags[i] === tag) {
                this.tags.splice(i, 1);
                this.saved = false;
                break;
            }
        }
    }
}
