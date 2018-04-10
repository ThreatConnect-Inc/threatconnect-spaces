/* global document, console, matchAll, Vue, $, INDICATORIMPORTER, INDICATORIMPORTERUTILITY, VUEAPPMANAGER, SUGGESTIONENGINE, TCREQUESTER */
"use strict";

function INDICATORBLOCK(indicators, indicatorType) {
    this.id = this.getBlockElement(indicatorType, indicators.length);
    this.indicators = indicators;
    this.indicatorType = indicatorType;
    // todo: move this vue app out of here and into the vue app manager as a 'class' which is instantiated for each indicatorBlock
    this.vueApp = new Vue({
        el: '#' + this.id,
        data: {
            allSelected: false,
            currentVueElement: '#' + this.id,
            indicatorArray: this.indicators,
        },
        methods: {
            getSelectedIndicators: function() {
                // todo: move this functionality away from jquery into vue js
                var selectedIndicators = [];
                var currentElement = this.currentVueElement;

                $(currentElement + " .indicator-select").each(function() {
                    if ($(this)[0].children[0].checked) {
                        // TODO: Consider replacing the line below (it seems pretty hap-hazard) (2)
                        // remove the "New" after an indicator (which is added if the indicator was created in this 'session')
                        var selectedIndicator =  $(this)[0].innerText.replace(/ New$/, "");
                        // trim off any whitespace from the ends of the indicator
                        selectedIndicator = selectedIndicator.trim();

                        // if the indicators in this block are complete files, break them up before returning them
                        if (currentElement.indexOf("file-complete") != -1) {
                            selectedIndicator = INDICATORIMPORTERUTILITY.handleCompleteFiles(selectedIndicator);
                        }

                        selectedIndicators.push({
                            indicator: selectedIndicator,
                            type: currentElement.split("-")[0].replace("#", "")
                        });
                    }
                });

                return selectedIndicators;
            },
            setCurrentIndicatorContext: function() {
                // set the current context value
                VUEAPPMANAGER.phaseTwoVue.currentIndicatorContext = indicatorType;
            },
            toggleSelection: function() {
                /* Select/Deselect all of the checkboxes as is appropriate. */
                if (this.allSelected) {
                    this.allSelected = false;

                    // set the selected information of the meta-operations block to false
                    VUEAPPMANAGER.phaseTwoVue.allSelected = false;

                    // uncheck the meta select all checkbox
                    $('#meta-select-all-checkbox')[0].checked = false;
                } else {
                    this.allSelected = true;
                }

                var selectAll = this.allSelected;

                $(this.currentVueElement + ' .indicator-select').each(function() {
                    $(this)[0].children[0].checked = selectAll;
                });
            },
            toggleDns: function() {
                /* Toggle the DNS. */
                // if the DNS have been turned on...
                if (! $("#dns-toggle")[0].checked) {
                    TCREQUESTER.adjustDns(true);
                } // if the DNS have been turned off...
                else {
                    TCREQUESTER.adjustDns(false);
                }
            },
            toggleWhois: function() {
                /* Toggle the WHOIS. */
                // if the WHOIS have been turned on...
                if (! $("#whois-toggle")[0].checked) {
                    TCREQUESTER.adjustWhois(true);
                } // if the WHOIS have been turned off...
                else {
                    TCREQUESTER.adjustWhois(false);
                }
            }
        }
    });
}

INDICATORBLOCK.prototype.getBlockElement = function(indicatorType, indicatorCount) {
    /* Create the html components of the indicatorBlock. */
    var blockID = indicatorType + "-block";
    var newBlockElement = document.createElement("div");
    newBlockElement.setAttribute("id", blockID);
    newBlockElement.setAttribute("class", "card indicator-block small-10 medium-10 large-10");
    newBlockElement.setAttribute("v-on:click", "setCurrentIndicatorContext");

    var blockElementOptions = document.createElement("div");
    blockElementOptions.setAttribute("id", blockID + "-options");
    blockElementOptions.setAttribute("class", "card-divider");
    blockElementOptions.innerHTML = "<span class='indicator-block-start'></span><h3 class='indicator-block-title'>" + indicatorType.toUpperCase() + " <span class='secondary badge'>" + indicatorCount + "</span></h3><div id='button-panel' class='float-left'> " +
        "<a class='secondary button' href='#0' data-open='association-modal'>Associations</a> " +
        "<a class='secondary button' href='#0' data-open='attribute-modal'>Attributes</a> " +
        "<a class='secondary button' href='#0' data-open='rating-modal'>Ratings</a> " +
        "<a class='secondary button' href='#0' data-open='sec-label-modal'>Security Labels</a> " +
        "<a class='secondary button' href='#0' data-open='tag-modal'>Tags</a> " +
        "<a class='secondary button' href='#0' data-open='profile-modal' title='Apply a profile to the selected indicators'>Profiles</a> ";

    // add a file action button
    if (indicatorType !== "emailaddress") {
        blockElementOptions.innerHTML += "<a style='margin-left: 0.5%' class='secondary button' href='#0' data-open='file-action-modal' title='Apply a profile to the selected indicators'>File Action</a> ";
    }

    // if the indicator block is for hosts, add a whois/dns switch
    if (indicatorType == "host") {
        // add dns toggle
        blockElementOptions.innerHTML += "<div class='float-left' style='margin-left: 1%'>dns: <input class='switch-input large' id='dns-toggle' type='checkbox'>" +
            "<label class='switch-paddle' id='dns-toggle-label' for='dns-toggle' v-on:click='toggleDns'>" +
            "<span class='switch-active' aria-hidden='true' style='color: white;'>On</span>" +
            "<span class='switch-inactive' aria-hidden='true'>Off</span>" +
            "</label></div>";

        // add whois toggle
        blockElementOptions.innerHTML += "<div class='float-left' style='margin-left: 1%'>whois: <input class='switch-input' id='whois-toggle' type='checkbox'>" +
            "<label class='switch-paddle' id='whois-toggle-label' for='whois-toggle' v-on:click='toggleWhois'>" +
            "<span class='switch-active' aria-hidden='true' style='color: white;'>On</span>" +
            "<span class='switch-inactive' aria-hidden='true'>Off</span>" +
            "</label></div>";
    }
    // if the indicator is a file, add buttons for file occurrences and file size
    else if (indicatorType.startsWith("file")) {
        // add file occurrence
        blockElementOptions.innerHTML += "&nbsp;<a class='secondary button' href='#0' title='Add a file occurrence' data-open='file-occur-modal'>File Occurrences</a> ";
        // add file size
        blockElementOptions.innerHTML += "<a class='secondary button' href='#0' title='Add a file size' data-open='file-size-modal'>File Size</a> ";
    }
    blockElementOptions.innerHTML += "</div><div class='clearfix'></div>";

    // create a checkbox group
    var indicatorCheckBoxGroup = document.createElement("div");
    indicatorCheckBoxGroup.setAttribute("class", "card-section checkbox-group");
    indicatorCheckBoxGroup.setAttribute("id", indicatorType + "-checkbox-group");

    // add a select all checkbox
    indicatorCheckBoxGroup.innerHTML += "<pre><label><input class='select-all-checkbox' type='checkbox' v-on:click='toggleSelection'></input><strong>SELECT ALL</strong></label></pre>";

    // create a listed-indicator element
    var indicatorListElement = document.createElement("listed-indicator");
    indicatorListElement.setAttribute("v-for", "indicator in indicatorArray");
    indicatorListElement.setAttribute("v-bind:indicator", "indicator");
    indicatorListElement.setAttribute(":key", "indicator.indicator");

    // add all of the elements appropriately
    indicatorCheckBoxGroup.appendChild(indicatorListElement);
    newBlockElement.appendChild(blockElementOptions);
    newBlockElement.appendChild(indicatorCheckBoxGroup);

    $('body').append(newBlockElement);
    return blockID;
};
