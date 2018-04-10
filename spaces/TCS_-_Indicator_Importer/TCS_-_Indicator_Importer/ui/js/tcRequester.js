/* global document, console, indicatorHelper, INDICATORIMPORTER, ThreatConnect, VUEAPPMANAGER, SUGGESTIONENGINE, groupHelper, $, INDICATORIMPORTERUTILITY, getParameterByName */
"use strict";

var TCREQUESTER = TCREQUESTER || {};

var tcSpaceElementId = getParameterByName('tcSpaceElementId'); // spaces mode if spaceElementId defined
if (tcSpaceElementId) {
    var apiSettings = {
        apiToken: getParameterByName('tcToken'),
        apiUrl: getParameterByName('tcApiPath')
    };
}

TCREQUESTER.tc = new ThreatConnect(apiSettings);

TCREQUESTER.getAttributesFromDatastore = function() {
    /* Pull the attributes from the datastore. */
    this.tc.db()
        .dbMethod('GET')
        .domain('organization')
        .typeName('app-data')
        .command('attributes')
        .done(function(response) {
            VUEAPPMANAGER.modalVue.attributes = JSON.parse(response._source.text);
        })
        .error(function(response) {
            $.jGrowl("Unable to pull attributes from the datastore.", { group: 'warning-growl' });
            console.error('error response', response);
        })
        .request();
};

TCREQUESTER.joyrideComplete = function(joyrideID) {
    /* Make a query to the datastore to see if the joyride has been run. */
    this.tc.db()
        .dbMethod('GET')
        .domain('local')
        .typeName('joyride-' + joyrideID)
        .command('1')
        .done(function(response) {
            return true;
        })
        .error(function(response) {
            // if there is no 'cookie' in the datastore, start the appropriate joyride
            if (joyrideID === 0) {
                // run the phase zero joyride if appropriate
                $('#phase-zero-joyride').joyride({
                    autoStart : true,
                    tipLocation: 'right'
                });
            } else if (joyrideID === 1) {
                // mark the first joyride complete
                TCREQUESTER.completeJoyride(0);
                // run the phase one joyride if appropriate
                $('#phase-one-joyride').joyride({
                    autoStart : true,
                    tipLocation: 'top'
                });
            } else {
                // mark the second joyride complete
                TCREQUESTER.completeJoyride(1);
                // run the phase two joyride if appropriate
                $('#phase-two-joyride').joyride({
                    autoStart : true,
                    tipLocation: 'top'
                });
                // complete the third joyride
                TCREQUESTER.completeJoyride(2);
            }
        })
        .request();
};

TCREQUESTER.completeJoyride = function(joyrideID) {
    /* Write data to the datastore to note that the user has finished this section of the joyride. */
    this.tc.db()
        .dbMethod('POST')
        .domain('local')
        .typeName('joyride-' + joyrideID)
        .command('1')
        .data({
            done: true
        })
        .done(function(response) {
        })
        .error(function(response) {
            $.jGrowl("Unable to store joyride 'cookie' in the datastore.", { group: 'warning-growl' });
            console.error('error response', response);
        })
        .request();
};

TCREQUESTER.clearJoyrideCookies = function() {
    /* Clear the joyride 'cookies' from the datastore. */
    for (var i = 2; i >= 0; i--) {
        this.tc.db()
          .dbMethod('DELETE')
          .domain('local')
          .typeName('joyride-' + i)
          .command('1')
          .done(function(response) {
          })
          .error(function(response) {
              $.jGrowl("Unable to store joyride 'cookie' in the datastore.", { group: 'warning-growl' });
              console.error('error response', response);
          })
          .request();
    }
};

TCREQUESTER.getProfilesFromDatastore = function() {
    /* Make a query to the datastore to retrieve all of the profiles from the datastore. */
    this.tc.db()
        .dbMethod('GET')
        .domain('organization')
        .typeName('app-data')
        .command('indicatorProfiles')
        .done(function(response) {
            VUEAPPMANAGER.modalVue.profiles = JSON.parse(response._source.text);
        })
        .error(function(response) {
            // print an error message
            $.jGrowl('Error getting profiles from datastore: ' + response.error, {group: 'failure-growl'});
        })
        .request();
};

/* FUNCTIONS TO POPULATE THE SUGGESTION ENGINES.*/
TCREQUESTER.getOwners = function(ownerSuggestionEngine) {
    /* Get the owners that are visible to the current user. */
    TCREQUESTER.tc.owners()
        .done(function(response) {
            response.data.forEach(function(owner) {
                ownerSuggestionEngine.localValues.push(owner.name);
            });
            SUGGESTIONENGINE.startPhaseZeroSuggestions();
        })
        .error(function(response) {
            console.error('Unable to retrieve the owners: ', response);
            $.jGrowl("Unable to retrieve the owners from ThreatConnect: " + response.error, { group: 'failure-growl' });
        })
        .retrieve();
};

TCREQUESTER.getGroups = function(groupSuggestionEngine=undefined, owner=INDICATORIMPORTER.owner) {
    /* Get the groups for the current owner. */
    var groups = TCREQUESTER.tc.groups();

    // this specifies the number of recent groups to list
    var maxRecentGroups = 10;

    groups.owner(owner)
        .done(function(response) {
            // if we are collecting groups for the list of recent groups in phase zero, make a note that groups have been found
            if (response.data.length > 0 && groupSuggestionEngine === undefined) {
                VUEAPPMANAGER.phaseZeroVue.groupsFound = true;
            }

            for (var i = 0; i <= response.data.length - 1; i++) {
                // if a group suggestion engine is specified, add the group data to the group suggestion engine
                if (groupSuggestionEngine !== undefined) {
                    var groupEntry = response.data[i].name + " ( " + response.data[i].type + " : " + response.data[i].id + " )";
                    groupSuggestionEngine.localValues.push(groupEntry);
                }
                // if no group suggestion engine is specified, add the group data to the phase zero vue
                else {
                    VUEAPPMANAGER.phaseZeroVue.recentGroups.push({
                        'name': response.data[i].name,
                        'type': response.data[i].type,
                        'id': response.data[i].id,
                        'webLink': response.data[i].webLink
                    });

                    // if we have listed the maximum number of groups, stop
                    if (i >= maxRecentGroups) {
                        break;
                    }
                }
            }
        })
        .error(function(response) {
            console.error('Unable to get groups from TC: ', response);
            $.jGrowl("Unable to get groups from TC: " + response.error, { group: 'failure-growl' });
        })
        .retrieve();
};

TCREQUESTER.getIndicatorsFromGroup = function(owner, groupType, groupID) {
    /* Get the groups for the current owner. */
    var groups = TCREQUESTER.tc.groups();

    groups.owner(owner)
        .type(groupHelper(groupType))
        .id(groupID)
        .done(function(response) {
            // get the current value of the indicator text area
            var inputValue = $('#indicator-textarea').val();

            for (var i = response.data.length - 1; i >= 0; i--) {
                // add the indicator to the end of the text area's value
                inputValue += "\n" + response.data[i].indicator;
            }

            // update the value of the indicator text area
            $('#indicator-textarea').val(inputValue);
        })
        .error(function(response) {
            console.error('Error getting the indicators associated with the group: ', response);
            $.jGrowl("Unable to get indicators associate with the group: " + response.error, { group: 'failure-growl' });
        })
        .retrieveAssociations({
            type: TYPE.INDICATOR
        });
};

TCREQUESTER.getTags = function(tagSuggestionEngine) {
    /* Get the tags for the current owner. */
    var tags = TCREQUESTER.tc.tags();

    tags.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            response.data.forEach(function(tag) {
                tagSuggestionEngine.localValues.push(tag.name);
            });
        })
        .error(function(response) {
            console.error('Error retrieving tags: ', response);
            $.jGrowl("Error retrieving tags: " + response.error, { group: 'failure-growl' });
        })
        .retrieve(function() {
            while(tags.hasNext()) {
                tags.next();
            }
        });
};

TCREQUESTER.getSecurityLabels = function() {
    /* Get the security labels for the current owner. */
    TCREQUESTER.tc.securityLabel()
        .owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            response.data.forEach(function(securityLabel) {
                VUEAPPMANAGER.modalVue.securityLabels.push({ securityLabelName: securityLabel.name });
            });
        })
        .error(function(response) {
            console.error('Unable to retrieve security labels: ', response);
            $.jGrowl("Error retrieving security labels: " + response.error, { group: 'failure-growl' });
        })
        .retrieve();
};
/* ^ END FUNCTIONS TO POPULATE THE SUGGESTION ENGINES. ^ */

TCREQUESTER.getDnsResolutions = function(indicator, indicatorType) {
    /* Get dns resolutions for the given indicator. */
    var indicators = TCREQUESTER.tc.indicators();

    indicators.owner(INDICATORIMPORTER.owner)
        .indicator(indicator)
        .type(indicatorHelper(indicatorType.toLowerCase()))
        .done(function(response) {
            // handle the dns response for hosts
            if (response.data.dnsResolution) {
                for (var i = response.data.dnsResolution.length - 1; i >= 0; i--) {
                    if (response.data.dnsResolution[i].addresses) {
                        for (var j = response.data.dnsResolution[i].addresses.length - 1; j >= 0; j--) {
                            VUEAPPMANAGER.phaseOneVue.indicators.push({
                                exists: true,
                                visible: false,
                                dnsResolution: true,
                                indicator: response.data.dnsResolution[i].addresses[j].ip,
                                type: 'address',
                                webLink: response.data.dnsResolution[i].addresses[j].webLink
                            });
                        }
                    }
                }
            }
            // handle the dns response for ips
            else {
                for (var i = response.data.indicator.length - 1; i >= 0; i--) {
                    VUEAPPMANAGER.phaseOneVue.indicators.push({
                        exists: true,
                        visible: false,
                        dnsResolution: true,
                        indicator: response.data.indicator[i].summary,
                        type: 'host',
                        webLink: response.data.indicator[i].webLink
                    });
                }
            }
        })
        .error(function(response) {
            // TODO: add a jgrowl here
            console.log("error", response);
        })
        .dnsResolutions();
};

TCREQUESTER.checkIndicatorExists = function(indicator, indicatorType, completeIndicatorType, pullDnsResolutions) {
    /* Check to see if the given indicator exists in the current owner. */
    var indicators = TCREQUESTER.tc.indicators();

    // create a variable used to identify a complete file hash which has been formatted for use in this function
    var indicatorToMatch;

    // if we are working with a complete file indicator, reformat it as a colon separated string which will be used to identify the indicator in VUEAPPMANAGER.phaseOneVue.indicators
    if (indicator instanceof Object) {
        indicatorToMatch = "";

        // combine the file hashes around " : "
        for (var fileHash in indicator) {
            indicatorToMatch += indicator[fileHash] + " : ";
        }

        // remove the extra " : " at the end of the indicatorToMatch
        indicatorToMatch = indicatorToMatch.slice(0, indicatorToMatch.length - 3);
    } else {
        indicatorToMatch = indicator;
    }

    indicators.owner(INDICATORIMPORTER.owner)
        .indicator(indicator)
        .type(indicatorHelper(indicatorType.toLowerCase()))
        .done(function(response) {
            var indicatorWeblink = response.data[0].webLink;

            VUEAPPMANAGER.phaseOneVue.indicators.push({
                exists: true,
                visible: false,
                indicator: indicatorToMatch,
                type: completeIndicatorType,
                webLink: indicatorWeblink
            });

            if (pullDnsResolutions && (indicatorType === 'host' || indicatorType == 'address')) {
                TCREQUESTER.getDnsResolutions(indicator, indicatorType);
            }
        })
        .error(function(response) {
            // if some strange error occurs...
            if (!response.error.search("The requested resource was not found")) {
                $.jGrowl("Strange error message when checking for indicators: " + response.error + ".", { group: 'warning-growl' });
                console.error("Strange error message: ", response.error);
            } else {  // indicator does not exist in the current owner
                // increment the count on non-existent indicators
                VUEAPPMANAGER.phaseOneVue.nonExistIndicatorCount += 1;

                VUEAPPMANAGER.phaseOneVue.indicators.push({
                    exists: false,
                    visible: true,
                    indicator: indicatorToMatch,
                    type: completeIndicatorType,
                    webLink: undefined
                });
            }

            // sort the list of indicators based on type 
            VUEAPPMANAGER.phaseOneVue.indicators.sort(function(a, b) {
                return a.type.localeCompare(b.type);
            });

            if (indicatorType === "host") {
                VUEAPPMANAGER.phaseOneVue.sortHostIndicators();
            }
        })
        .retrieve();
};

TCREQUESTER.createIndicator = function(indicator, indicatorType) {
    /* Create the given indicator. */
    var completeFile = null;

    // handle complete file indicators
    if (indicatorType === "file-complete") {
        completeFile = indicator;
        indicator = INDICATORIMPORTERUTILITY.handleCompleteFiles(indicator);
    }
    // if the indicator is a file (and not a complete file), put the file hash into an object before creating it
    else if (indicatorType.split("-")[0] === "file") {
        var reformattedIndicator = {};
        reformattedIndicator[indicatorType.split("-")[1]] = indicator;
        indicator = reformattedIndicator;
    }

    indicatorType = indicatorType.split("-")[0];

    var indicators = TCREQUESTER.tc.indicators();

    indicators.owner(INDICATORIMPORTER.owner)
        .indicator(indicator)
        .type(indicatorHelper(indicatorType.toLowerCase()))
        .done(function(response) {
            var indicatorWeblink = response.data[0].webLink;

            // if we just created a complete file, add it to the list of indicator
            if (completeFile !== null) {
                VUEAPPMANAGER.phaseOneVue.indicators.forEach(function(nonExistIndicator, index) {
                    if (nonExistIndicator.indicator === completeFile && nonExistIndicator.type === "file-complete") {
                        // make the indicator show up on the tab of indicators which exist in TC
                        nonExistIndicator.exists = true;

                        // make the indicator invisible (on the tab of indicators that do not exist in TC) 
                        nonExistIndicator.visible = false;

                        // mark the indicator as new (created in this 'session')
                        nonExistIndicator.new = true;

                        // record the indicator's weblink
                        nonExistIndicator.webLink = indicatorWeblink;
                    }
                });
            }
            // if we created an indicator type other than a complete file
            else {
                // if we created some form of file hash, update the 'indicator' variable we are looking for
                if (indicator instanceof Object) {
                    for (var fileHash in indicator) {
                        indicator = indicator[fileHash].toLowerCase();
                    }
                }

                // record the fact that the indicator now exists
                VUEAPPMANAGER.phaseOneVue.indicators.forEach(function(nonExistIndicator) {
                    if (nonExistIndicator.indicator.toLowerCase() === indicator.toLowerCase() && nonExistIndicator.type.split("-")[0] === indicatorType) {
                        // make the indicator show up on the tab of indicators which exist in TC
                        nonExistIndicator.exists = true;

                        // make the indicator invisible (on the tab of indicators that do not exist in TC) 
                        nonExistIndicator.visible = false;

                        // mark the indicator as new (created in this 'session')
                        nonExistIndicator.new = true;

                        // record the indicator's weblink
                        nonExistIndicator.webLink = indicatorWeblink;
                    }
                });
            }

            // redo the counts on existent/non-existent indicators
            VUEAPPMANAGER.phaseOneVue.countNonExistIndicators();
        })
        .error(function(response) {
            console.error('error response', response);
            $.jGrowl('Unable to create indicator: ' + response.error, { group: 'failure-growl'});
        })
        .commit();
};

function _setToggle(element, checked) {
    /* Set the given toggle element to the parameter passed as the 'checked' parameter. */
    
    // set a timeout and then set the toggle to the desired value... the timeout isn't to be fancy... it will not work properly without a timeout
    window.setTimeout(function() {
        $(element)[0].checked = checked;
    }, 400);
}

TCREQUESTER.adjustDns = function(dnsOn) {
    /* Adjust the DNS for the selected indicators. */
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators === null) {
        // let the user know he/she should select indicators before turning on whois/dns
        $.jGrowl('Select some indicators below before turning on the DNS.', { group: 'failure-growl'});

        // reverse the operation that the user just did (uncheck or check the dns toggle)
        _setToggle('#dns-toggle', !dnsOn);

        return null;
    }

    var indicators = TCREQUESTER.tc.indicators();

    // define basic indicator object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            var message = "";

            if (dnsOn) {
                message = "Successfully turned DNS on.";
            } else {
                message = "Successfully turned DNS off.";
            }
            $.jGrowl(message, { group: 'success-growl'});
        })
        .error(function(response) {
            // show the alert with an error message
            $.jGrowl("Error trying to turn on/off DNS: " + response.error, { group: 'failure-growl'});

            // uncheck or check the whois/dns toggle
            _setToggle('#dns-toggle', !dnsOn);
        });

    // for each of the selected indicators, add the security label
    selectedIndicators.forEach(function(indicator) {
        indicators.indicator(indicator.indicator)
            .type(indicatorHelper(indicator.type))
            .dnsActive(dnsOn)
            .commit();
    });
};

TCREQUESTER.adjustWhois = function(whoisOn) {
    /* Adjust the DNS for the selected indicators. */
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators === null) {
        // let the user know he/she should select indicators before turning on whois/dns
        $.jGrowl('Select some indicators below before turning on the WHOIS.', { group: 'failure-growl'});

        // reverse the operation that the user just did (uncheck or check the whois toggle)
        _setToggle('#whois-toggle', !whoisOn);

        return null;
    }

    var indicators = TCREQUESTER.tc.indicators();

    // define basic indicator object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            var message = "";

            if (whoisOn) {
                message = "Successfully turned WHOIS on.";
            } else {
                message = "Successfully turned WHOIS off.";
            }
            $.jGrowl(message, { group: 'success-growl'});
        });

    // for each of the selected indicators, add the security label
    selectedIndicators.forEach(function(indicator) {
        indicators.indicator(indicator.indicator)
            .type(indicatorHelper(indicator.type))
            .whoisActive(whoisOn)
            .error(function(response) {
                // show the alert with an error message
                var message = "Error trying to turn on/off WHOIS for " + indicator + ": " + response.error;
                $.jGrowl(message, { group: 'failure-growl'});
                console.error("Error: ", message);

                // uncheck or check the whois/dns toggle
                _setToggle('#whois-toggle', !whoisOn);
            })
            .commit();
    });
};

TCREQUESTER.addAssociation = function(associationElement, statusBadgeElement) {
    /* Add the given tag to all of the selected indicators. */
    var groupName, groupType, groupID;
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators == null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this association will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    var association = $(associationElement).val();

    // if there is no tag specified, stop
    if (association === "") {
        $.jGrowl("No association provided", { group: 'failure-growl'});
        $(associationElement).focus();
        return null;
    }

    groupName = association.split("(").splice(0, association.split("(").length - 1).join("(").trim();
    groupType = association.split("(")[association.split("(").length - 1].replace(")", "").split(":")[0].trim();
    groupID = association.split("(")[association.split("(").length - 1].replace(")", "").split(":")[1].trim();

    var indicators = TCREQUESTER.tc.indicators();

    // setup the basic indicators object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");

            // clear the input element and its typeahead
            $(associationElement).val("");
            $(associationElement).typeahead('val', "");

            // focus on the input element
            $(associationElement).focus();
        })
        .error(function(response) {
            console.error("Unable to add association: ", response.error);
            $.jGrowl("Error adding association: " + response.error, { group: 'failure-growl'});
        });

    // for each of the selected indicators, commit the given association
    selectedIndicators.forEach(function(indicator) {
        indicators.indicator(indicator.indicator)
            .type(indicatorHelper(indicator.type))
            .commitAssociation({
                id: groupID,
                type: groupHelper(groupType)
            });
    });

    var groupFound = false;

    // check to see if the group we associated already exists in the list of associated groups
    for (var i = VUEAPPMANAGER.phaseTwoVue.associatedGroups.length - 1; i >= 0; i--) {
        if (VUEAPPMANAGER.phaseTwoVue.associatedGroups[i].id === groupID) {
            groupFound = true;
        }
    }

    // if the group we just associated hasn't been added yet, add it
    if (!groupFound) {
        // push the recently associated group onto the list of associated groups
        VUEAPPMANAGER.phaseTwoVue.associatedGroups.push({
            name: groupName,
            id: groupID,
            weblink: `https://app.threatconnect.com/auth/${groupType.toLowerCase()}/${groupType.toLowerCase()}.xhtml?${groupType.toLowerCase()}=${groupID}`
        });
    }
};

TCREQUESTER.addAttribute = function(attributeType, attributeValue, statusBadgeElement, attributeDefault=undefined) {
    /* Add the given attribute to all of the selected indicators. */
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop
    if (selectedIndicators == null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this attribute will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    // if there is no attribute specified, stop
    if (attributeType === "" || attributeType === undefined || attributeValue === "" || attributeValue === undefined) {
        $.jGrowl("No attribute value or attribute type provided", { group: 'failure-growl'});
        return null;
    }

    var indicators = TCREQUESTER.tc.indicators();

    // setup the basic indicators object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");

            // clear the input fields
            VUEAPPMANAGER.modalVue.attributeValue = "";
            VUEAPPMANAGER.modalVue.attributeDefault = false;
        })
        .error(function(response) {
            var message = "Error adding attribute: " + response.error;
            $.jGrowl(message, { group: 'failure-growl', life: 10000 });
            console.error(message);
        });

    // for each of the selected indicators, add the attributes
    selectedIndicators.forEach(function(indicator) {
        indicators.indicator(indicator.indicator)
            .type(indicatorHelper(indicator.type))
            .commitAttribute({
                type: attributeType,
                value: attributeValue,
                displayed: attributeDefault
            });
    });
};

// TCREQUESTER.actuallyRemoveAttributes = function(indicator, attributeId, statusBadgeElement) {
//     /* Remove the given attribute from the indicator. */
//     console.log("indicator", indicator);
//     console.log("attribugte id", attributeId.id);
//     var indicators = TCREQUESTER.tc.indicators();
//     indicators.owner(INDICATORIMPORTER.owner)
//         .indicator(indicator.indicator)
//         .type(indicatorHelper(indicator.type))
//         .done(function(response) {
//             INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
//             // clear the input fields
//             VUEAPPMANAGER.dangerZoneVue.attributeType = "";
//             VUEAPPMANAGER.dangerZoneVue.attributeValue = "";
//         })
//         .error(function(response) {
//             var message = "Error removing attribute: " + response.error;
//             $.jGrowl(message, { group: 'failure-growl', life: 10000 });
//             console.error(message);
//         })
//         .deleteAttribute(attributeId.id);
// };

// TCREQUESTER.removeAttribute = function(attributeType, attributeValue, statusBadgeElement) {
    // TODO: this function needs to iterate through the selected indicators and send a post request to a pb which will then delete the indicator with the given type and value.
//     /* Remove the given attribute from all of the selected indicators. */
//     // TODO: start here and port this code to work for attribute removal
//     var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

//     // if there are no selected indicators, stop
//     if (selectedIndicators == null) {
//         $.jGrowl("No Indicators selected...\nGo select some indicators and this attribute will be here when you come back.", { group: 'failure-growl'});
//         return null;
//     }

//     var indicators = TCREQUESTER.tc.indicators();
//     var deletedIndicators = TCREQUESTER.tc.indicators();

//     // setup the basic indicators object
//     indicators.owner(INDICATORIMPORTER.owner)
//         .error(function(response) {
//             var message = "Error retrieving attributes prior to deletion: " + response.error;
//             $.jGrowl(message, { group: 'failure-growl', life: 10000 });
//             console.error(message);
//         });

//     // for each of the selected indicators, add the attributes
//     selectedIndicators.forEach(function(indicator) {
//         console.log("indicator", indicator.indicator);
//         indicators.indicator(indicator.indicator)
//             .done(function(response) {
//                 console.log("got attribute for", indicator.indicator);
//                 // find the attribute we are looking for
//                 for (var i = response.data.length - 1; i >= 0; i--) {
//                     console.log("attribute", response.data);
//                     if (response.data[i].type.toLowerCase() === attributeType.toLowerCase()) {
//                         if (attributeValue !== '') {
//                             if (response.data[i].value.toLowerCase() === attributeValue.toLowerCase()) {
//                             }
//                         } else {
//                             console.log("would delete attribute " + response.data[i].id + " from " + indicator.indicator);
//                         }
//                     }
//                 }
//             })
//             .type(indicatorHelper(indicator.type))
//             .retrieveAttributes();
//     });
// };

TCREQUESTER.addFileSize = function(fileSizeElement, statusBadgeElement) {
    /* Add file size to the selected file indicator(s). */
    // TODO: Should I be filtering based on indicator type for this call (and the dns/whois)? (2)
    // get selected indicators
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators === null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this file size will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    var fileSize = $(fileSizeElement).val();

    // if all of the elements of a file occurrence are empty, raise an error
    if (fileSize === "") {
        $.jGrowl("Please provide a file size between 0 and 2,147,483,647.", { group: 'failure-growl' });
        return null;
    }

    // for each of the selected indicators, add the file occurrence
    selectedIndicators.forEach(function(indicator) {
        var indicators = TCREQUESTER.tc.indicators();

        indicators.owner(INDICATORIMPORTER.owner)
            .indicator(indicator.indicator)
            .type(TYPE.FILE)
            .size(fileSize)
            .done(function(response) {
                INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
            })
            .error(function(response) {
                $.jGrowl('Unable to create file size: ' + response.error, {group: 'failure-growl'});
            });


        indicators.update();
    });
};

TCREQUESTER.addFileAction = function(fileAction, fileHash, statusBadgeElement) {
    /* Add a file occurrence to the selected file indicators. */
    // get selected indicators
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators === null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this file action will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    // for each of the selected indicators, add the file action
    selectedIndicators.forEach(function(indicator) {
        var indicators = TCREQUESTER.tc.indicators();
        // handle indicators which are passed in as objects (e.g. complete files)
        if (indicator.indicator.constructor == Object) {
            indicator.indicator = indicators._getSingleIndicatorValue(indicator.indicator);
        }

        indicators.owner(INDICATORIMPORTER.owner)
            .indicator(fileHash)
            .type(TYPE.FILE)
            .done(function(response) {
                INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
            })
            .error(function(response) {
                var message = 'Unable to create file action: ' + response.error;
                $.jGrowl(message, {group: 'failure-growl'});
                console.error(message);
            });

        indicators.commitFileAction(fileAction, {
            id: indicator.indicator,
            type: indicatorHelper(indicator.type)
        });
    });
};

TCREQUESTER.addFileOccurrence = function(fileNameElement, filePathElement, dateElement, statusBadgeElement) {
    /* Add a file occurrence to the selected file indicators. */
    // TODO: Should I be filtering based on indicator type for this call (and the dns/whois)? (2)
    // get selected indicators
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators === null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this file occurrence will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    var fileName = $(fileNameElement).val();
    var filePath = $(filePathElement).val();
    var date = $(dateElement).val();

    // if all of the elements of a file occurrence are empty, raise an error
    if (fileName === "" && filePath === "" && date === "") {
        $.jGrowl("Please provide a file name, file path, or date for the file occurrence.", { group: 'failure-growl'});
        return null;
    }

    // for each of the selected indicators, add the file occurrence
    selectedIndicators.forEach(function(indicator) {
        var indicators = TCREQUESTER.tc.indicators();

        indicators.owner(INDICATORIMPORTER.owner)
            .indicator(indicator)
            .type(TYPE.FILE)
            .done(function(response) {
                INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
            })
            .error(function(response) {
                $.jGrowl('Unable to create file occurrence: ' + response.error, {group: 'failure-growl'});
            });

        indicators.commitFileOccurrence({
            fileName: fileName,
            path: filePath,
            date: date
          });
    });
};

TCREQUESTER.addRatings = function(threatRatingElement, confidenceRatingElement, statusBadgeElement) {
    /* Add the given tag to all of the selected indicators. */
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators === null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and the ratings will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    var threatRating = $(threatRatingElement).val();
    var confidenceRating = $(confidenceRatingElement).val();

    // if the threat AND confidence ratings are both empty
    if (threatRating === "" && confidenceRating === "") {
        $.jGrowl("No valid rating provided. Enter a valid value for at least one of the ratings below.", { group: 'failure-growl'});
        return null;
    } 
    // if the threat rating is not correct
    else if (0 > threatRating || threatRating > 5) {
        $.jGrowl("Incorrect threat rating provided. The value for the threat rating must be a float or integer between 0 and 5 (inclusive)", { group: 'failure-growl'});
        $('#threat-rating').focus();
        return null;
    }
    // if the confidence value is not correct
    else if (0 > confidenceRating || confidenceRating > 100) {
        $.jGrowl("Incorrect confidence rating provided. The value for the confidence rating must be an integer between 0 and 100 (inclusive)", { group: 'failure-growl'});
        $('#confidence-rating').focus();
        return null;
    }

    // for each of the selected indicators, add the threat and confidence ratings
    selectedIndicators.forEach(function(indicator) {
        var indicators = TCREQUESTER.tc.indicators();

        // define basic indicator object
        indicators.owner(INDICATORIMPORTER.owner)
            .done(function(response) {
                INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
            })
            .error(function(response) {
                $.jGrowl("Error updating ratings: " + response.error, { group: 'failure-growl'});
            });

        // commit both threat and confidence rating
        if (threatRating != "" && confidenceRating != "") {
            indicators.indicator(indicator.indicator)
                .type(indicatorHelper(indicator.type))
                .rating(threatRating)
                .confidence(confidenceRating)
                .update();
        }
        // commit only the threat rating
        else if (confidenceRating === "") {
            indicators.indicator(indicator.indicator)
                .type(indicatorHelper(indicator.type))
                .rating(threatRating)
                .update();
        }
        // commit only the confidence rating
        else {
            indicators.indicator(indicator.indicator)
                .type(indicatorHelper(indicator.type))
                .confidence(confidenceRating)
                .update();
        }
    });
};

TCREQUESTER.addSecurityLabels = function(securityLabelElement, statusBadgeElement) {
    /* Add the given tag to all of the selected indicators. */
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators == null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and the security label(s) you selected will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    var selectedSecurityLabels = [];

    $(securityLabelElement + ' .security-label').each(function() {
        // if the checkbox is checked...
        if ($(this)[0].children[0].checked) {
            // add the name of the security label
            selectedSecurityLabels.push($(this)[0].innerText);
        }
    });

    // if there are no security labels selected, stop
    if (selectedSecurityLabels.length === 0) {
        $.jGrowl("No security labels selected", { group: 'failure-growl'});
        return null;
    }

    var indicators = TCREQUESTER.tc.indicators();

    // define basic indicator object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");

            // uncheck the first security label checkbox that is selected
            $('#sec-label-modal .security-label').each(function() {
                if ($(this)[0].children[0].checked) {
                    $(this)[0].children[0].checked = false;
                }
            });
        })
        .error(function(response) {
            $.jGrowl("Error adding security label: " + response.error, { group: 'failure-growl'});
        });

    // for each of the selected indicators, add the security label
    selectedIndicators.forEach(function(indicator) {
        selectedSecurityLabels.forEach(function(securityLabel) {
            indicators.indicator(indicator.indicator)
                .type(indicatorHelper(indicator.type))
                .commitSecurityLabel(securityLabel);
        });
    });
};

TCREQUESTER.addTag = function(tagElement, statusBadgeElement, tag=null) {
    /* Add the given tag to all of the selected indicators. */
    // check to make sure that there are indicators selected
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators == null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this tag will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    if (!tag) {
        // get the tag
        tag = $(tagElement).val();
    }

    // check to ensure a tag is given
    if (tag === '') {
        $.jGrowl('Please enter a tag', {group: 'failure-growl'});
        return;
    }

    var indicators = TCREQUESTER.tc.indicators();

    // define basic indicator object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
            if (VUEAPPMANAGER.modalVue.addedTags.indexOf(tag) === -1) {
                // add the tag to the list of added tags
                VUEAPPMANAGER.modalVue.addedTags.push(tag);
            }

            // clear the input element and its typeahead
            $(tagElement).val("");
            $(tagElement).typeahead('val', "");

            // focus on the input element
            $(tagElement).focus();
        })
        .error(function(response) {
            console.error("Unable to add tag ", tag, ": ", response.error);
            $.jGrowl("Error adding tag: " + response.error, { group: 'failure-growl'});
        });

    // for each of the selected indicators, add the tag
    selectedIndicators.forEach(function(indicator) {
        // add the tag to the indicator
        indicators.indicator(indicator.indicator)
            .type(indicatorHelper(indicator.type))
            .resultStart(0)
            .commitTag(tag);
    });
};


TCREQUESTER.removeTag = function(tagElement, statusBadgeElement) {
    /* Remove the given tag from all of the selected indicators. */
    // check to make sure that there are indicators selected
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

    // if there are no selected indicators, stop adding tags
    if (selectedIndicators == null) {
        $.jGrowl("No Indicators selected...\nGo select some indicators and this tag will be here when you come back.", { group: 'failure-growl'});
        return null;
    }

    // get the tag
    var tag = $(tagElement).val();

    // check to ensure a tag is given
    if (tag === '') {
        $.jGrowl('Please enter a tag', {group: 'failure-growl'});
        return;
    }

    var indicators = TCREQUESTER.tc.indicators();

    // define basic indicator object
    indicators.owner(INDICATORIMPORTER.owner)
        .done(function(response) {
            INDICATORIMPORTERUTILITY.handleStatusBadge(statusBadgeElement, "success");
            // clear the input element and its typeahead
            $(tagElement).val("");
            $(tagElement).typeahead('val', "");
            // focus on the input element
            $(tagElement).focus();
        })
        .error(function(response) {
            console.error("Unable to remove tag ", tag, ": ", response.error);
            $.jGrowl("Error removing tag: " + response.error, { group: 'failure-growl'});
        });

    // for each of the selected indicators, add the tag
    selectedIndicators.forEach(function(indicator) {
        // add the tag to the indicator
        indicators.indicator(indicator.indicator)
            .type(indicatorHelper(indicator.type))
            .resultStart(0)
            .deleteTag(tag);
    });
};
