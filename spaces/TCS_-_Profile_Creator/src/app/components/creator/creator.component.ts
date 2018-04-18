import { Component, OnInit } from '@angular/core';

import {
    SpacesMessagesService,
} from 'spaces-ng/';

import { Profile, Attribute } from '../../interfaces';

@Component({
  selector: 'creator',
  templateUrl: './creator.component.html',
  styleUrls: ['./creator.component.less']
})
export class CreatorComponent implements OnInit {
    existingProfiles: Profile[];
    name: string = "";
    attributeType: string = "";
    attributeValue: string = "";
    attributeDisplayed: boolean = false;
    attributes: Attribute[];
    tag: string = "";
    tags: string[];

    constructor(
        private messages: SpacesMessagesService,
    ) { }

    ngOnInit() {
        this.loadExistingProfiles();
    }

    loadExistingProfiles() {
        // TODO: implement
        this.existingProfiles = [{
            name: 'Test Profile',
            attributes: [{
                type: 'Description',
                value: 'test',
                displayed: true
            }],
            tags: ['C2']
        }]
    }

    displayProfile(profileName: string) {
        for (var i = this.existingProfiles.length - 1; i >= 0; i--) {
            if (this.existingProfiles[i].name === profileName) {
                this.attributes = this.existingProfiles[i].attributes;
                this.tags = this.existingProfiles[i].tags;
                this.name = this.existingProfiles[i].name;
            }
        }
    }

    loadAttribute(attributeType, attributeValue, attributeDisplayed) {
        this.deleteAttribute(attributeType, attributeValue, attributeDisplayed);
        this.attributeType = attributeType;
        this.attributeValue = attributeValue;
        this.attributeDisplayed = attributeDisplayed;
    }

    updateAttributes() {
        if (this.attributeType === '' || this.attributeValue === '') {
            this.messages.showError('Missing data', 'Please make sure this attribute has a type and a value')
        }

        this.attributes.push({
            type: this.attributeType,
            value: this.attributeValue,
            displayed: this.attributeDisplayed
        });

        this.attributeType = '';
        this.attributeValue = '';
        this.attributeDisplayed = false;
    }

    deleteAttribute(attributeType, attributeValue, attributeDisplayed) {
        for (var i = this.attributes.length - 1; i >= 0; i--) {
            if (this.attributes[i].type === attributeType && this.attributes[i].value === attributeValue && this.attributes[i].displayed === attributeDisplayed) {
                this.attributes.splice(i, 1);
            }
        }
    }

    loadTag(tag) {
        this.deleteTag(tag);
        this.tag = tag;
    }

    updateTag() {
        if (this.tag === '') {
            this.messages.showError('Missing data', 'Please enter a tag')
        }

        this.tags.push(this.tag);

        this.tag = '';
    }

    deleteTag(tag) {
        for (var i = this.tags.length - 1; i >= 0; i--) {
            if (this.tags[i] === tag) {
                this.tags.splice(i, 1);
            }
        }
    }

    saveProfile() {
        let s = 1;
    }

}
