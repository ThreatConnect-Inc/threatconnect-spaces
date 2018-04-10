/* global Vue, $, console, INDICATORIMPORTER, INDICATORBLOCK, TCREQUESTER, document, INDICATORIMPORTERUTILITY, escapeRegExp, replaceAll, SUGGESTIONENGINE, window, getParameterByName, PDFJS, */
"use strict";

// register a component for listing indicators (where visibility of the indicator determines whether or not the indicator should be shown)
Vue.component('listed-indicator', {
    props: ['indicator'],
    template: '#listed-indicator'
});

// register a component for listing existing indicators (where the existence of the indicator in TC determines whether or not an indicator should be shown)
Vue.component('listed-existing-indicator', {
    props: ['indicator'],
    template: '#listed-existing-indicator'
});

// register a component for listing recent groups
Vue.component('recent-group', {
    props: ['group'],
    template: '#recent-group',
    methods: {
        importFromGroup: function (groupType, groupID) {
            /* When the user wants to import the indicators associated with a group, this is handled here. */
            // get the current owner
            var owner = getOwnerElement();

            // if the owner is not empty...
            if (owner !== "") {
                // grab the indicators from the selected group
                TCREQUESTER.getIndicatorsFromGroup(owner, groupType, groupID);

                // remove the group from the list of recent groups
                for (var i = VUEAPPMANAGER.phaseZeroVue.recentGroups.length - 1; i >= 0; i--) {
                    if (VUEAPPMANAGER.phaseZeroVue.recentGroups[i].id == groupID) {
                        VUEAPPMANAGER.phaseZeroVue.recentGroups.splice(i, 1);
                        break;
                    }
                }

                // check to see if the length of the recent groups is none (in which case the box for recent groups should be removed)
                if (VUEAPPMANAGER.phaseZeroVue.recentGroups.length === 0) {
                    VUEAPPMANAGER.phaseZeroVue.groupsFound = false;
                }
            }
        }
    }
});

function getOwnerElement() {
    /* Get the owner from the phase zero element. */
    var owner = $('#owner-typeahead-input').val();

    return owner;
}

var VUEAPPMANAGER = VUEAPPMANAGER || {};

// register a security label component
Vue.component('listed-sec-label', {
    props: ['slabel'],
    template: '<label class="security-label"><input type="checkbox">{{ slabel.securityLabelName }}</label>'
});

// register a tag component
Vue.component('added-tags', {
    props: ['tag'],
    template: '<li>{{ tag }}</li>'
});

// register a profile component to display the profiles which have been saved in the datastore
Vue.component('profile', {
    props: ['profile'],
    template: '#profile'
});

VUEAPPMANAGER.modalVue = new Vue({
    el: '#modals',
    data: {
        addedTags: [],
        profiles: [],
        securityLabels: [],
        selectedFileAction: '',
        fileActionHash: '',
        fileActions: [
            {
                name: 'archive',
                types: ['file']
            }, {
                name: 'drop',
                types: ['file']
            }, {
                name: 'traffic',
                types: ['host', 'url', 'address']
            }, {
                name: 'dnsQuery',
                types: ['host']
            }
        ],
        selectedAttributeType: '',
        // the attributes below are test data that will be added dynamically when included in a real app
        attributes: [],
        wizardAttributes: [],
        additionalAttributes: [],
        attributeValue: "",
        attributeDefault: false,
    },
    computed: {
        validationType: function() {
          /* Find the validation type for the current attribute. */
          var type;
          var typeFound = false;

          for (var i = this.wizardAttributes.length - 1; i >= 0; i--) {
            if (this.wizardAttributes[i].name == this.selectedAttributeType) {
              type = this.wizardAttributes[i].type;
              typeFound = true;
              break;
            }
          }

          if (!typeFound) {
            for (var i = this.additionalAttributes.length - 1; i >= 0; i--) {
                if (this.additionalAttributes[i].name == this.selectedAttributeType) {
                  type = this.additionalAttributes[i].type;
                  typeFound = true;
                  break;
                }
            }
          }

          return type;
        },
        validationRule: function() {
          /* Find the validation rule for the current attribute. */
          var rule;
          var ruleFound = false;

          for (var i = this.wizardAttributes.length - 1; i >= 0; i--) {
            if (this.wizardAttributes[i].name == this.selectedAttributeType) {
              if (this.wizardAttributes[i].hasOwnProperty('rule')) {
                rule = this.wizardAttributes[i].rule;
                ruleFound = true;
                break;
              }
            }
          }

          if (!ruleFound) {
            for (var i = this.additionalAttributes.length - 1; i >= 0; i--) {
                if (this.additionalAttributes[i].name == this.selectedAttributeType) {
                    if (this.additionalAttributes[i].hasOwnProperty('rule')) {
                      rule = this.additionalAttributes[i].rule;
                      ruleFound = true;
                      break;
                    }
                }
            }
          }

          return rule;
        }
    },
    methods: {
        updateCurrentAttributes: function() {
            var currentIndicatorContext = VUEAPPMANAGER.phaseTwoVue.currentIndicatorContext.toLowerCase().split("-")[0];

            this.wizardAttributes = [];
            this.additionalAttributes = [];

            for (var i = this.attributes.length - 1; i >= 0; i--) {
                if (this.attributes[i].type === currentIndicatorContext) {
                    this.wizardAttributes = this.attributes[i].wizardAttributes;
                    this.additionalAttributes = this.attributes[i].additionalAttributes;
                    break;
                }
            }
        },
        addAttribute: function(attributeModalStatus) {
            var errorMessage = "Please enter an attribute value (and make sure it matches the validation rule).";

            // validate that the given attribute matches the regex
            if (this.validationType === "Regex") {
                // if the given attribute does not match the regex, return an error
                if (this.attributeValue.match(new RegExp(this.validationRule)) === null || this.attributeValue.match(new RegExp(this.validationRule))[0] !== this.attributeValue) {
                  $.jGrowl(errorMessage, { group: 'failure-growl' });
                  return;
                }
            }
            // validate that the integer is within the given interval
            else if (this.validationType === "Integer") {
                // if the given attribute is to high or low, return an error
                if (this.attributeValue < Number(this.validationRule.split(":")[0]) || this.attributeValue > Number(this.validationRule.split(":")[1])) {
                    $.jGrowl(errorMessage, { group: 'failure-growl' });
                    return;
                }
            }

            TCREQUESTER.addAttribute(this.selectedAttributeType, this.attributeValue, attributeModalStatus, this.attributeDefault);
        },
        applyFileAction: function(statusElement) {
            /* Apply the given file action to the selected indicators. */
            var validFileAction = true;
            var currentIndicatorType = VUEAPPMANAGER.phaseTwoVue.currentIndicatorContext.toLowerCase().split("-")[0];

            this.selectedFileAction = this.selectedFileAction.trim();

            // verify that the selected file action applies to the selected indicator type
            for (var i = this.fileActions.length - 1; i >= 0; i--) {
                if (this.fileActions[i].name === this.selectedFileAction) {
                    if (this.fileActions[i].types.indexOf(currentIndicatorType) === -1) {
                        $.jGrowl(`The ${this.selectedFileAction} action is not applicable to indicators of type ${currentIndicatorType} in `, {group: 'failure-growl'});
                        validFileAction = false;
                    }
                }
            }

            if (validFileAction) {
                TCREQUESTER.addFileAction(this.selectedFileAction.split("(")[0].trim().toLowerCase(), this.fileActionHash.trim(), statusElement);
            }
        }
    }
});

VUEAPPMANAGER.phaseZeroVue = new Vue({
    el: '#phase-zero',
    data: {
        // number of strings in indicator text matching the given search string
        findCount: undefined,
        groupsFound: false,
        importPDF: "",
        importURL: "",
        importImage: "",
        ocrAsSubtitle: false,
        saveDocument: false,
        selectedOwner: "",
        recentGroups: [],
        loadingPhaseOne: false,
        loadingSuffix: "",
    },
    computed: {
        createPDFLink: function() {
            return getParameterByName("createPDFLink");
        },
        importFromPDFPlaybookLink: function() {
            return getParameterByName("pdfReaderPlaybookLink");
        },
        importFromURLPlaybookLink: function() {
            return getParameterByName("urlReaderPlaybookLink");
        },
        customMetricOwner: function() {
            return getParameterByName("customMetricOwner");
        },
        appAnalyticsKeyName: function() {
            return getParameterByName("appAnalyticsKeyName");
        },
    },
    methods: {
        handleAppAnalytics: function() {
            /* Get the ID of the custom metric we are using for app analytics from the datastore. */
            var _this = this;

            TCREQUESTER.tc.db()
                .dbMethod('GET')
                .domain('organization')
                .typeName('app-data')
                .command('metricId')
                .done(function(response) {
                    // get the current value at the given index
                    var appAnalyticsId = Number(response._source.id);
                    // increment the usage counter in the custom metric for app analytics
                    _this.incrementAppAnalytics(appAnalyticsId);
                })
                .error(function(response) {
                    console.error('Unable to retrieve the appAnalytics metric ID from the datastore.', response);
                    // $.jGrowl('Error reading app analytics metric ID.', {group: 'failure-growl'});
                    return null;
                })
                .request();
        },
        incrementAppAnalytics: function(appAnalyticsId) {
            /* Increment the app analytics value for this app. */
            var _this = this;
            var ro = TCREQUESTER.tc.requestObject();
            var metricsUrl = 'v2/customMetrics/' + appAnalyticsId + '/data?returnValue=true'

            // TODO: change the line below with the one above
            ro.owner(_this.customMetricOwner)
                .requestUri(metricsUrl)
                .requestMethod('POST')
                .body({
                  "value": "1",
                  "name": _this.appAnalyticsKeyName
                })
                .contentType('application/json')
                .done(function(response) {})
                .error(function(response) {
                    console.error('error response', response);
                    // $.jGrowl('Error recording app metrics.', {group: 'failure-growl'});
                })
                .apiRequest('customMetric');
        },
        // TODO: I think the function below can be removed... I don't think it is called by anything (3)
        importIndicators: function(groupType, groupID) {
            console.log("groupType", groupType);
            console.log("groupID", groupID);
            console.log("here");
        },
        _importFromLocalPDF: function(fileName) {
            /**
             * Retrieves the text of a specif page within a PDF Document obtained through pdf.js 
             * 
             * @param {Integer} pageNum Specifies the number of the page 
             * @param {PDFDocument} PDFDocumentInstance The PDF document obtained 
             **/
            function getPageText(pageNum, PDFDocumentInstance) {
                // Return a Promise that is solved once the text of the page is retrieven
                return new Promise(function (resolve, reject) {
                    PDFDocumentInstance.getPage(pageNum).then(function (pdfPage) {
                        // The main trick to obtain the text of the PDF page, use the getTextContent method
                        pdfPage.getTextContent().then(function (textContent) {
                            var textItems = textContent.items;
                            var finalString = "";

                            // Concatenate the string of the item to the final string
                            for (var i = 0; i < textItems.length; i++) {
                                var item = textItems[i];

                                finalString += item.str + " ";
                            }

                            // Solve promise with the text retrieven from the page
                            resolve(finalString);
                        });
                    });
                });
            }
            var PDF_URL  = fileName;

            PDFJS.getDocument(PDF_URL).then(function (PDFDocumentInstance) {
                var pdfDocument = PDFDocumentInstance;
                // Create an array that will contain our promises 
                var pagesPromises = [];

                for (var i = 0; i < PDFDocumentInstance.pdfInfo.numPages; i++) {
                    // Required to prevent that i is always the total of pages
                    (function (pageNumber) {
                        // Store the promise of getPageText that returns the text of a page
                        pagesPromises.push(getPageText(pageNumber, pdfDocument));
                    })(i + 1);
                }

                // Execute all the promises
                Promise.all(pagesPromises).then(function (pageText) {
                    $('#indicator-textarea').val($('#indicator-textarea').val() + '\n\n\n' + pageText);
                });
            }, function (reason) {
                // PDF loading error
                console.error(reason);
            });
        },
        _importFromLocalTextFile: function(file) {
            /* Read a local text file. */
            var reader = new FileReader();
            reader.readAsText(file);

            // put the file's text into the text area
            reader.onload = function(evt) {
                $('#indicator-textarea').val($('#indicator-textarea').val() + '\n\n\n' + reader.result);
                $.jGrowl('Added content from ' + file.name, {group: 'success-growl'});
            };
            reader.onerror = function (evt) {
                $.jGrowl('Unable to read contents from ' + file.name + '. See the console for more details.', {group: 'failure-growl', life: 10000});
                console.error("Error reading file:", evt.target);
            };
        },
        importFromLocalFile: function(files) {
            /* Read the contents from a local file. */
            $.jGrowl(`Processing ${files.length} files`, {group: 'success-growl'});
            for (var i = 0, numFiles = files.length; i < numFiles; i++) {
                if (files[i].name.endsWith(".pdf")) {
                    this._importFromLocalPDF(files[i].name);
                } else {
                    this._importFromLocalTextFile(files[i]);
                }
            }
        },
        savePDFAsDocument: function() {
            /* Save a pdf as a document in TC. */
            var _this = this;
            var sp = TCREQUESTER.tc.secureProxy();

            sp.method('POST')
                // TODO: make the link to the playbook a parameter (1)
                .url(_this.createPDFLink)
                .body(JSON.stringify({"url": _this.importPDF}))
                .contentType('application/json; charset=utf-8')
                .done(function(response) {
                    $.jGrowl('Saved PDF as a document.', {group: 'success-growl'});
                })
                .error(function(response) {
                    console.error('error response', response);
                    $.jGrowl('Error saving PDF as a document: ' + response.error, {group: 'failure-growl'});
                })
                .post();
        },
        importFromPDF: function() {
            /* Submit the given PDF to a playbook that will read the text of it. */
            var _this = this;

            $.jGrowl('Gathering content...', {group: 'success-growl'});
            // submit the PDF to the playbook
            var sp = TCREQUESTER.tc.secureProxy();
            sp.method('POST')
                // TODO: make the link to the playbook a parameter (1)
                .url(_this.importFromPDFPlaybookLink)
                .body(JSON.stringify({"url": _this.importPDF}))
                .contentType('application/json; charset=utf-8')
                .done(function(response) {
                    $.jGrowl('PDF content imported', {group: 'success-growl'});
                    // move the content from the response into the main import area
                    $('#indicator-textarea').val($('#indicator-textarea').val() + '\n' + response);

                    // if we are saving the pdf as a document in tc
                    if (_this.saveDocument) {
                        _this.savePDFAsDocument();
                    }
                })
                .error(function(response) {
                    console.error('error response', response);
                    $.jGrowl('Error reading PDF content: ' + response.error, {group: 'failure-growl'});
                })
                .post();
        },
        importFromURL: function() {
            /* Submit the given URL to a playbook that will read the text of it. */
            var _this = this;
            $.jGrowl('Gathering content...', {group: 'success-growl'});

            // submit the PDF to the playbook
            var sp = TCREQUESTER.tc.secureProxy();
            sp.method('POST')
                // TODO: make the link to the playbook a parameter (1)
                .url(_this.importFromURLPlaybookLink)
                .body(_this.importURL)
                .contentType('text/plain; charset=utf-8')
                .done(function(response) {
                    $.jGrowl('URL content imported', {group: 'success-growl'});
                    // move the content from the response into the main import area
                    $('#indicator-textarea').val($('#indicator-textarea').val() + '\n' + response);
                })
                .error(function(response) {
                    console.error('error response', response);
                    $.jGrowl('Error retrieving URL content: ' + response.error, {group: 'failure-growl'});
                })
                .post();
        },
        importFromImage: function() {
            /* Submit an image to the OCR API. */
            var _this = this;
            var api_url;
            $.jGrowl('Submitting image for OCR analysis', {group: 'success-growl'});

            // TODO: add urls that submit images for OCR analysis below
            if (_this.ocrAsSubtitle) {
                api_url = "";
            } else {
                api_url = "";
            }

            var sp = TCREQUESTER.tc.secureProxy();
            sp.method('POST')
                // TODO: make the link to the playbook a parameter (1)
                .url(api_url + _this.importImage)
                .done(function(response) {
                    $.jGrowl('Image content imported', {group: 'success-growl'});
                    console.log("response", response);
                    // add the text from the image to the main import area
                    $('#indicator-textarea').val($('#indicator-textarea').val() + '\n' + response.text_block[0].text);
                })
                .error(function(response) {
                    console.error('error response', response);
                    $.jGrowl('Error submitting image to OCR api: ' + response.error, {group: 'failure-growl'});
                })
                .post();
        },
        getRecentGroups: function() {
            /* If the user clicks on the indicator text area, see if we need to get recent groups. */
            // check to see if the owner field is populated
            var owner = getOwnerElement();

            // if there is a new owner selected, get recent groups
            if (owner !== "" && owner !== this.selectedOwner) {
                // reset the list of recent groups
                this.recentGroups = [];
                // Get the groups in the current owner (note that this function updates this.groupsFound if there are any groups found for the current owner)
                TCREQUESTER.getGroups(undefined, owner);
                // update the selected owner
                this.selectedOwner = owner;
            }
        },
        findAndReplace: function(find=undefined, replace=undefined, throwError=true) {
            /* Find and replace the given the given values from the indicator import area. */
            if (find === undefined) {
                // get the value to find
                find = $('#find-value').val();

                if (find === undefined) {
                    // exit if no find value is given
                    return;
                }
            }

            if (replace === undefined) {
                // get the value to replace
                replace = $('#replace-value').val();

                if (replace === undefined) {
                    // exit if no replace value is given
                    return;
                }
            }

            // get the value from the indicator textarea
            var indicatorText = $('#indicator-textarea').val();

            // count the number of times the find value occurs in the indicatorText
            var count = (indicatorText.match(new RegExp(escapeRegExp(find), 'g')) || []).length;

            if (count > 0) {
                // replace all in the indicator import area (the replaceAll function comes from utility.js)
                $('#indicator-textarea').val(replaceAll(indicatorText, find, replace));

                // clear the input boxes
                $('#find-value').val("");
                $('#replace-value').val("");

                // reset the find count
                this.findCount = undefined;

                // give feedback that it worked
                $.jGrowl("Done", { group: 'success-growl'});
            } else {
                if (throwError) {
                    $.jGrowl("The search term was not found in the text", { group: 'warning-growl' });
                }
            }
        },
        getFindCount: function() {
            if ($('#find-value').val() === "") {
                this.findCount = undefined;
            } else {
                this.findCount = ($('#indicator-textarea').val().match(new RegExp(escapeRegExp($('#find-value').val()), 'g')) || []).length;
            }
        }
    }
});

VUEAPPMANAGER.startPhaseOne = function() {
    VUEAPPMANAGER.phaseOneVue = new Vue({
        el: '#phase-one',
        data: {
            allSelected: false,
            indicators: [],
            hashes: {
                md5: [],
                sha1: [],
                sha256: []
            },
            currentHashType: '',
            vtApiCallCount: 0,
            selectedFiles: [],
            nonExistIndicatorCount: 0,
            vtResponse: undefined
        },
        computed: {
            maxVTQueries: function() {
                /* Get the max VT queries from the parameters. */
                var maxQueries = Number(INDICATORIMPORTERUTILITY.retrieveParameter('maxVTQueries'));
                // var maxQueries = Number("50");
                return maxQueries;
            }
        },
        methods: {
            createIndicators: function() {
                /* Import all of the indicators which are selected. */
                $('#phase-one-indicators .indicator-select').each(function() {
                    if ($(this)[0].children[0].checked) {
                        var indicator = $(this)[0].innerText;
                        var indicatorType = $(this).attr('indicator-type');

                        TCREQUESTER.createIndicator(indicator, indicatorType);
                    }
                });
            },
            countNonExistIndicators: function() {
                var thisVue = this;

                // reset the count of non-existent indicators
                thisVue.nonExistIndicatorCount = 0;

                this.indicators.forEach(function(indicator) {
                    if (!indicator.exists) {
                        thisVue.nonExistIndicatorCount += 1;
                    }
                });
            },
            getIndicatorsOfType: function(indicatorType) {
                /* Get all of the parsed indicators of the given type. */
                var indicatorsOfType = [];

                for (var i = this.indicators.length - 1; i >= 0; i--) {
                    if (this.indicators[i].type === indicatorType) {
                        indicatorsOfType.push(this.indicators[i]);
                    }
                }

                return indicatorsOfType;
            },
            sortHostIndicators: function() {
                /* Sort host indicator properly. */
                var hosts = this.getIndicatorsOfType("host");

                var sorted_hosts = [];
                var split_hosts = [];

                for (var i = hosts.length - 1; i >= 0; i--)
                {
                    var segments = hosts[i].indicator.split('.');
                    segments.reverse();
                    split_hosts.push(segments);
                }

                split_hosts.sort();

                for (var i = 0; i <= split_hosts.length - 1; i++)
                {
                    split_hosts[i].reverse();
                    sorted_hosts.push(split_hosts[i].join("."));
                }

                var indicatorArrayCopy = this.indicators;

                for (var i = 0; i <= sorted_hosts.length - 1; i++) {
                    for (var j = this.indicators.length - 1; j >= 0; j--) {
                        if (sorted_hosts[i] === this.indicators[j].indicator) {
                            // remove the old host from the list and add the new one
                            for (var k = indicatorArrayCopy.length - 1; k >= 0; k--) {
                                if (sorted_hosts[i] === indicatorArrayCopy[k].indicator) {
                                    var hostData = this.indicators[j];
                                    indicatorArrayCopy.splice(k, 1);
                                    indicatorArrayCopy.push(hostData);
                                    break;
                                }
                            }

                            break;
                        }
                    }
                }

                this.indicators = indicatorArrayCopy;
            },
            manualMerge: function() {
                /* Merge the selected file hashes (with a couple of checks, of course). */
                var selectedFileIndicators = this.getSelectedIndicators("file");
                var selectedNonCompleteFiles = [];

                selectedFileIndicators.forEach(function(selectedFileIndicator) {
                    // as long as the selected file indicator is not a complete file, we can merge it
                    if (selectedFileIndicator.indicatorType !== "file-complete") {
                        selectedNonCompleteFiles.push(selectedFileIndicator);
                    }
                });

                // check to make sure there are three file hashes selected
                if (selectedNonCompleteFiles.length < 2 || selectedNonCompleteFiles.length > 3) {
                    $.jGrowl("Please select two or three hashes to merge. No more, no less. Two (or three) shall be the number thou shalt select, and the number of the selecting shall be two (or three). Four shalt thou not select, neither select thou one, excepting that thou then proceed to two (or three). Five is right out. Once the number two (or three), being the second (or third) number, be reached, then canst clickest this button again.", { group: 'warning-growl', life: 10000 });
                    return;
                }

                // check to make sure that the selected hashes are of different types
                var fileHashes = {};

                // this cannot be a foreach loop because I want to return from inside of it
                for (var i = selectedNonCompleteFiles.length - 1; i >= 0; i--) {
                    var hashType = selectedNonCompleteFiles[i].indicatorType.split("-")[1];

                    // if a file hash of the same type was also selected, raise an error and return
                    if (fileHashes.hasOwnProperty(hashType)) {
                        $.jGrowl("Please select three file hashes of different types.", { group: 'warning-growl' });
                        return;
                    } else {
                        fileHashes[hashType] = selectedNonCompleteFiles[i].indicator;
                    }
                }

                this.consolidateFileHashes(fileHashes);
            },
            gatherFileHashes: function() {
                /* Get all of the non-existent file hashes that were parsed from the text and organize them by hash type (e.g. md5). */
                var thisVue = this;
                // TODO: implement this using the indicator data from the vue app rather than the dom ->> SEE BELOW FOR AN IMPLEMENTATION OF THIS!  IT IS SAFE TO DELETE THIS MESSAGE AND THE CODE BELOW ONCE I VERIFY IT'S WORKING.
                // $('#phase-one-indicators .indicator-select').each(function() {
                //     var indicatorType = $(this).attr('indicator-type');

                //     // get a list of all file hashes (excluding complete files)
                //     if (indicatorType.split("-")[0] === 'file' && indicatorType !== 'file-complete') {
                //         var fileHash = $(this)[0].innerText;

                //         thisVue.hashes[indicatorType.split("-")[1]].push(fileHash);
                //     }
                // });

                // get all of the selected indicators to see if any of them are file hashes
                var selectedFileIndicators = this.getSelectedIndicators("file");
                var selectedNonCompleteFiles = [];

                // split up the non-complete file indicators from the complete ones
                selectedFileIndicators.forEach(function(selectedFileIndicator) {
                    // as long as the selected file indicator is not a complete file, we can merge it
                    if (selectedFileIndicator.indicatorType !== "file-complete") {
                        selectedNonCompleteFiles.push(selectedFileIndicator);
                    }
                });

                // if there are file hashes selected, only enrich those
                if (selectedNonCompleteFiles.length > 0) {
                    selectedNonCompleteFiles.forEach(function(selectedFile) {
                        thisVue.hashes[selectedFile.indicatorType.split("-")[1]].push(selectedFile.indicator);
                    });
                }
                // otherwise, enrich all of the files
                else {
                    // TODO: test to see if this works... (I'm pulling from the VUE app rather than the dom)
                    thisVue.indicators.forEach(function(indicator) {
                        if (!indicator.exists) {
                            var indicatorType = indicator.type;

                            // get a list of all file hashes (excluding complete files)
                            if (indicatorType.split("-")[0] === 'file' && indicatorType !== 'file-complete') {
                                thisVue.hashes[indicatorType.split("-")[1]].push(indicator.indicator);
                            }
                        }
                    });
                }

                // turn the button into a spinner
                $('[data-addCart]').addClass('is-adding');
                // window.setTimeout(function() {
                //     $('[data-addCart]').removeClass('is-adding');
                // }, 2500);

                // start querying VT for the md5 hashes
                this.queryVT('md5');
            },
            queryVT: function(hashType) {
                /* Iterate through each of the hashes for the given type and initiate a VT call for each file hash. */
                // as long as we are running this on a new hash type, fire away!
                if (hashType != this.currentHashType) {
                    // record the current file hash type (this comes in handy later)
                    this.currentHashType = hashType;

                    // if there are no file hashes of the current type, move on to the next hash type
                    if (this.hashes[hashType].length === 0) {
                        if (this.currentHashType === 'md5') {
                            this.queryVT('sha1');
                        } else if (this.currentHashType === 'sha1') {
                            this.queryVT('sha256');
                        } else {
                            // stop the button from spinning
                            $('[data-addCart]').removeClass('is-adding');
                        }
                    } else {
                        for (var i = this.hashes[hashType].length - 1; i >= 0; i--) {
                            INDICATORIMPORTERUTILITY.queryVT(this.hashes[hashType].pop());
                        }
                    }
                }
            },
            consolidateFileHashes: function(fileHashes) {
                /* Take the given file hashes (passed in as an object with the hash types as keys) and consolidate them in the UI and remove duplicate hashes from the list of hashes in this vue. */
                // TODO: remove the commented out code sections below (which were doing things the old, inefficient way) (3)
                // remove duplicate md5s (this is useful when we have queried VT for a file hash and want to make sure that the hash is not queried again)
                for (var i = this.hashes.md5.length - 1; i >= 0; i--) {
                    if (this.hashes.md5[i].toLowerCase() === fileHashes.md5) {
                        // remove the md5 from the list
                        this.hashes.md5.splice(i, 1);
                    }
                }
                // this.hashes.md5.forEach(function(md5Hash) {
                //     if (fileHashes.md5 === md5Hash.toLowerCase()) {
                //         // remove the md5 from the list
                //         this.hashes.md5.splice(this.hashes.md5.indexOf(md5Hash), 1);
                //     }
                // });

                // remove duplicate sha1s (this is useful when we have queried VT for a file hash and want to make sure that the hash is not queried again)
                for (var i = this.hashes.sha1.length - 1; i >= 0; i--) {
                    if (this.hashes.sha1[i].toLowerCase() === fileHashes.sha1) {
                        // remove the sha1 from the list
                        this.hashes.sha1.splice(i, 1);
                    }
                }
                // this.hashes.sha1.forEach(function(sha1Hash) {
                //     if (fileHashes.sha1 === sha1Hash.toLowerCase()) {
                //         // remove the sha1 from the list
                //         this.hashes.sha1.splice(this.hashes.sha1.indexOf(sha1Hash), 1);
                //     }
                // });

                // remove duplicate sha256s (this is useful when we have queried VT for a file hash and want to make sure that the hash is not queried again)
                for (var i = this.hashes.sha256.length - 1; i >= 0; i--) {
                    if (this.hashes.sha256[i].toLowerCase() === fileHashes.sha256) {
                        // remove the sha256 from the list
                        this.hashes.sha256.splice(i, 1);
                    }
                }
                // this.hashes.sha256.forEach(function(sha256Hash) {
                //     if (fileHashes.sha256 === sha256Hash.toLowerCase()) {
                //         // remove the sha256 from the list
                //         this.hashes.sha256.splice(this.hashes.sha256.indexOf(sha256Hash), 1);
                //     }
                // });

                // consolidate the file hashes in the UI
                // remove each of the selected indicators from the vue
                for (var i = this.indicators.length - 1; i >= 0; i--) {
                    // check to see if the indicator is a file
                    if (this.indicators[i].type.search("file") !== -1) {
                        // get the hash type
                        var hashType = this.indicators[i].type.split("-")[1];

                        // if this file hash is the same one of the file hashes we are looking for, remove it from the list
                        if (this.indicators[i].indicator.toLowerCase() == fileHashes[hashType]) {
                            this.indicators.splice(i, 1);
                        }
                    }
                }

                var newCompleteFileIndicator;
                // this allows for the creation of partial-complete indicators
                if (fileHashes.sha256 === undefined) {
                    newCompleteFileIndicator = `${fileHashes.md5} : ${fileHashes.sha1}`;
                }
                else if (fileHashes.sha1 === undefined) {
                    newCompleteFileIndicator = `${fileHashes.md5} : ${fileHashes.sha256}`;
                }
                else if (fileHashes.md5 === undefined) {
                    newCompleteFileIndicator = `${fileHashes.sha1} : ${fileHashes.sha256}`;
                }
                // this allows for the creation of a complete indicator
                else if (fileHashes.sha256) {
                    newCompleteFileIndicator = `${fileHashes.md5} : ${fileHashes.sha1} : ${fileHashes.sha256}`;
                }

                // add a consolidated file indicator to the vue
                this.indicators.push({
                    indicator: newCompleteFileIndicator,
                    type: "file-complete",
                    visible: true,
                    exists: false
                });

                // redo the count of non-existent indicators
                this.countNonExistIndicators();
            },
            vtQueryCallback: function() {
                /* See if all of the hashes of the given type have been handled and, if so, move on to the next type. */
                // if there are no more hashes of the current type
                if (this.hashes[this.currentHashType].length === 0) {
                    var thisVue = this;

                    if (this.currentHashType === 'md5') {
                        // wait to let all of the other md5 queries which may be running 'catch up'
                        window.setTimeout(function() {
                            thisVue.queryVT('sha1');
                        }, 5000);
                    } else if (this.currentHashType === 'sha1') {
                        // wait to let all of the other md5 queries which may be running 'catch up'
                        window.setTimeout(function() {
                            thisVue.queryVT('sha256');
                        }, 5000);
                    } else {
                        // stop the button from spinning
                        $('[data-addCart]').removeClass('is-adding');
                    }
                }
            },
            filterPhaseOneIndicators: function() {
                var indicatorType = $('#indicator-type-filter').val();

                // if an indicator type has been selected, show only indicators of that type
                if (indicatorType !== "") {
                    this.indicators.forEach(function(indicator) {
                        if (!indicator.exists) {
                            if (indicator.type == indicatorType) {
                                indicator.visible = true;
                            } else if (indicator.type.split("-")[0] == indicatorType) {
                                indicator.visible = true;
                            }
                            else {
                                indicator.visible = false;
                            }
                        }
                    });
                }
                // if no filter was given, show all of the indicators
                else {
                    // uncheck the "select all" checkbox
                    $('#nonexist-indicator-checkbox').checked = false;

                    this.indicators.forEach(function(indicator) {
                        if (!indicator.exists) {
                            indicator.visible = true;
                        }
                    });
                }
            },
            getSelectedIndicators: function(desiredIndicatorType=undefined) {
                var selectedIndicators = [];

                // TODO: pull this info from the vueapp rather than the dom
                $('#phase-one-indicators .indicator-select').each(function() {
                    if ($(this)[0].children[0].checked) {
                        var indicator = $(this)[0].innerText;
                        var indicatorType = $(this).attr('indicator-type');
                        // if we are looking for indicators of a specific type...
                        if (desiredIndicatorType !== undefined) {
                            // if the indicator type of this indicator matches the simplified type we are looking for, add the indicator to the selected indicators array
                            if (indicatorType.split("-")[0] === desiredIndicatorType.split("-")[0]) {
                                // TODO: change indicatorType to just be "type"
                                selectedIndicators.push({'indicator': indicator, 'indicatorType': indicatorType});
                            }
                        } else {
                            // TODO: change indicatorType to just be "type"
                            selectedIndicators.push({'indicator': indicator, 'indicatorType': indicatorType});
                        }
                    }
                });

                return selectedIndicators;
            },
            toggleSelection: function() {
                /* Select/Deselect all of the checkboxes as is appropriate. */
                if (this.allSelected) {
                    this.allSelected = false;
                } else {
                    this.allSelected = true;
                }

                var selectAll = this.allSelected;

                $('#phase-one-indicators .indicator-select').each(function() {
                    $(this)[0].children[0].checked = selectAll;
                });
            },
        }
    });
};

VUEAPPMANAGER.startPhaseTwo = function() {
    VUEAPPMANAGER.phaseTwoVue = new Vue({
        el: '#phase-two',
        data: {
            allSelected: false,
            currentIndicatorContext: "all",
            filteredIndicatorCount: 0,
            indicatorBlocks: [],
            totalIndicatorCount: 0,
            associatedGroups: []
        },
        methods: {
            _getUserInput: function(variableInput, fullAttributeText) {
                /* Get user input to fill a variable input. */
                var userInput = prompt('Please enter a value to replace "' + variableInput + '" in the following attribute: "' + fullAttributeText + '"');

                return userInput;
            },
            applyProfiles: function(profileModalStatusElement) {
                /* Apply selected profiles to the indicators. */
                // check to see if any indicators are selected
                var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();

                // if there are no selected indicators, stop adding tags
                if (selectedIndicators == null) {
                    $.jGrowl("No Indicators selected...\nGo select some indicators and apply profiles.", { group: 'failure-growl'});
                    return null;
                }

                // get selected profiles
                var selectedProfileNames = [];
                var selectedProfiles = [];

                $('.profileCheckbox').each(function() {
                    // if the profile checkbox is selected
                    if ($(this)[0].checked) {
                        // get the name of the profile and add it to the list of selected profiles
                        selectedProfileNames.push($(this).next('h5')[0].innerText);
                    }
                });

                // iterate through all of the profiles and file the ones with the names that were selected
                for (var i = VUEAPPMANAGER.modalVue.profiles.length - 1; i >= 0; i--) {
                    for (var j = selectedProfileNames.length - 1; j >= 0; j--) {
                        if (VUEAPPMANAGER.modalVue.profiles[i].name === selectedProfileNames[j]) {
                            selectedProfiles.push(VUEAPPMANAGER.modalVue.profiles[i]);
                        }
                    }
                }

                // iterate through the selected profiles
                for (var i = 0; i < selectedProfiles.length; i++) {
                    // add all of the attributes from the profile to the selected indicators
                    for (var j = selectedProfiles[i].attributes.length - 1; j >= 0; j--) {
                        var attributeValue = selectedProfiles[i].attributes[j].value;
                        // match any variable inputs
                        while (attributeValue.match(/\$\{(.*?)\}/) !== null) {
                            // find the next variable input
                            var match = attributeValue.match(/\$\{(.*?)\}/);
                            // get the user input to replace the variable input
                            var userInput = this._getUserInput(match[0], attributeValue);

                            if (userInput === null) {
                                return;
                            }

                            // replace the variable input with the user input in the attribute
                            attributeValue = attributeValue.replace(match[0], userInput);
                        }
                        TCREQUESTER.addAttribute(selectedProfiles[i].attributes[j].type, attributeValue, profileModalStatusElement, selectedProfiles[i].attributes[j].default);
                    }

                    // add all of the tags  from the profile to the selected indicators
                    for (var j = selectedProfiles[i].tags.length - 1; j >= 0; j--) {
                        TCREQUESTER.addTag('', profileModalStatusElement, selectedProfiles[i].tags[j]);
                    }
                }
            },
            filterPhaseTwoIndicators: function() {
                /* Show only indicators that match the given filter. */
                var filter = $("#phase-two-filter").val();
                var thisVue = this;

                // reset the count of filtered indicators
                thisVue.filteredIndicatorCount = 0;

                // if there is a filter specified, filter the indicators according to the filter
                if (filter != "") {
                    // hide all of the badges on the indicator blocks
                    $(".badge.secondary").hide();

                    this.indicatorBlocks.forEach(function(indicatorBlock) {
                        var matchingIndicators = false;

                        indicatorBlock.vueApp.indicatorArray.forEach(function(indicator) {
                            // if the indicator is not a match...
                            if (indicator.indicator.toLowerCase().indexOf(filter.toLowerCase()) == -1) {
                                indicator.visible = false;
                            }
                            // if the indicator is a match...
                            else {
                                indicator.visible = true;
                                thisVue.filteredIndicatorCount += 1;
                                matchingIndicators = true;
                            }
                        });

                        // hide the indicator block if there are no matching indicators in it
                        if (!matchingIndicators) {
                            $(indicatorBlock.vueApp.currentVueElement).hide();
                        }
                        // show the indicator block if there are matching indicators in it
                        else {
                            $(indicatorBlock.vueApp.currentVueElement).show();
                        }
                    });
                }
                // if the input is "", reset the view and make everything visible again
                else {
                    // show the badges on the indicator blocks
                    $(".badge.secondary").show();

                    this.indicatorBlocks.forEach(function(indicatorBlock) {
                        // make all the indicators in the block visible
                        indicatorBlock.vueApp.indicatorArray.forEach(function(indicator) {
                            indicator.visible = true;
                        });

                        // show the indicator block
                        $(indicatorBlock.vueApp.currentVueElement).show();

                        // reset the count to show the total number of indicators
                        thisVue.filteredIndicatorCount = thisVue.totalIndicatorCount;
                    });
                }
            },
            showNewIndicators: function() {
                /* Show only new indicators. */
                // hide all of the badges on the indicator blocks
                $(".badge.secondary").hide();
                var count = 0;

                for (var i = this.indicatorBlocks.length - 1; i >= 0; i--) {
                    var visibleIndicatorsInBlock = false;

                    for (var j = this.indicatorBlocks[i].vueApp.indicatorArray.length - 1; j >= 0; j--) {
                        if (!this.indicatorBlocks[i].vueApp.indicatorArray[j].new) {
                            this.indicatorBlocks[i].vueApp.indicatorArray[j].visible = false;
                        } else {
                            this.indicatorBlocks[i].vueApp.indicatorArray[j].visible = true;
                            visibleIndicatorsInBlock = true;
                            count++;
                        }
                    }

                    // hide the indicator block if there are no matching indicators in it
                    if (!visibleIndicatorsInBlock) {
                        $(this.indicatorBlocks[i].vueApp.currentVueElement).hide();
                    }
                    // show the indicator block if there are matching indicators in it
                    else {
                        $(this.indicatorBlocks[i].vueApp.currentVueElement).show();
                    }
                }

                // update the number of visible indicators
                this.filteredIndicatorCount = count;
            },
            showOldIndicators: function() {
                /* Show only new indicators. */
                // hide all of the badges on the indicator blocks
                $(".badge.secondary").hide();
                var count = 0;

                for (var i = this.indicatorBlocks.length - 1; i >= 0; i--) {
                    var visibleIndicatorsInBlock = false;

                    for (var j = this.indicatorBlocks[i].vueApp.indicatorArray.length - 1; j >= 0; j--) {
                        if (this.indicatorBlocks[i].vueApp.indicatorArray[j].new) {
                            this.indicatorBlocks[i].vueApp.indicatorArray[j].visible = false;
                        } else {
                            this.indicatorBlocks[i].vueApp.indicatorArray[j].visible = true;
                            visibleIndicatorsInBlock = true;
                            count++;
                        }
                    }

                    // hide the indicator block if there are no matching indicators in it
                    if (!visibleIndicatorsInBlock) {
                        $(this.indicatorBlocks[i].vueApp.currentVueElement).hide();
                    }
                    // show the indicator block if there are matching indicators in it
                    else {
                        $(this.indicatorBlocks[i].vueApp.currentVueElement).show();
                    }
                }

                // update the number of visible indicators
                this.filteredIndicatorCount = count;
            },
            showAllIndicators: function() {
                /* Show only new indicators. */
                // show all of the badges on the indicator blocks
                $(".badge.secondary").show();
                var count = 0;

                // show all of the indicator blocks
                for (var i = this.indicatorBlocks.length - 1; i >= 0; i--) {
                    // show all of the indicators in the block
                    for (var j = this.indicatorBlocks[i].vueApp.indicatorArray.length - 1; j >= 0; j--) {
                        this.indicatorBlocks[i].vueApp.indicatorArray[j].visible = true;
                        count++;
                    }

                    // show the indicator block
                    $(this.indicatorBlocks[i].vueApp.currentVueElement).show();
                }

                // update the number of visible indicators
                this.filteredIndicatorCount = count;
            },
            getSelectedIndicatorsFromBlock: function() {
                /* Select the indicator block that contains indicators of the same type as the currentIndicatorContext. */
                var thisVue = this;
                var selectedIndicators = [];

                if (thisVue.currentIndicatorContext == "all") {
                    thisVue.indicatorBlocks.forEach(function(indicatorBlock) {
                        indicatorBlock.vueApp.getSelectedIndicators().forEach(function(selectedIndicator) {
                            selectedIndicators.push(selectedIndicator);
                        });
                    });
                } else {
                    thisVue.indicatorBlocks.forEach(function(indicatorBlock) {
                        if (indicatorBlock.indicatorType == thisVue.currentIndicatorContext) {
                            selectedIndicators = indicatorBlock.vueApp.getSelectedIndicators();
                        }
                    });
                }

                if (selectedIndicators.length === 0) {
                    return null;
                } else {
                    return selectedIndicators;
                }
            },
            setCurrentIndicatorContext: function() {
                // set the current context to everything
                VUEAPPMANAGER.phaseTwoVue.currentIndicatorContext = "all";
            },
            showIndicatorBlocks: function() {
                /* Show indicator blocks for the indicators of each time. This copies all of the existing indicators from phase one to phase two. */
                // split the indicators up by indicator type
                var sortedIndicators = {};
                var indicatorCount = 0;

                // categorize the indicators by type
                for (var i = VUEAPPMANAGER.phaseOneVue.indicators.length - 1; i >= 0; i--) {
                    if (VUEAPPMANAGER.phaseOneVue.indicators[i].exists) {
                        indicatorCount++;
                        if (sortedIndicators[VUEAPPMANAGER.phaseOneVue.indicators[i].type] === undefined) {
                            // make an empty list for the indicators
                            sortedIndicators[VUEAPPMANAGER.phaseOneVue.indicators[i].type] = [];
                        }

                        var dnsResolution = false;

                        if (VUEAPPMANAGER.phaseOneVue.indicators[i].dnsResolution) {
                            dnsResolution = true;
                        }

                        // add the indicator to the list of indicators of the current type
                        sortedIndicators[VUEAPPMANAGER.phaseOneVue.indicators[i].type].push({
                            indicator: VUEAPPMANAGER.phaseOneVue.indicators[i].indicator,
                            visible: true,
                            exists: true,
                            dnsResolution: dnsResolution,
                            new: VUEAPPMANAGER.phaseOneVue.indicators[i].new,
                            webLink: VUEAPPMANAGER.phaseOneVue.indicators[i].webLink
                        });
                    }
                }

                // create an indicator block for each of the indicator types
                for (var indicatorType in sortedIndicators) {
                    VUEAPPMANAGER.phaseTwoVue.indicatorBlocks.push(new INDICATORBLOCK(sortedIndicators[indicatorType], indicatorType));
                }

                // populate the total number of indicators
                this.totalIndicatorCount = indicatorCount;
                this.filteredIndicatorCount = indicatorCount;
            },
            toggleSelection: function() {
                /* Find all of the selected checkboxes from all of the indicator blocks. */

                if (this.allSelected) {
                    this.allSelected = false;

                    // if everything is selected: change the selectAll property of each indicator block to true
                    this.indicatorBlocks.forEach(function(indicatorBlock) {
                        indicatorBlock.vueApp.allSelected = false;
                    });

                    // also check the "select all" buttons for all of the indicator blocks 
                    $('.select-all-checkbox').each(function() {
                        $(this)[0].checked = false;
                    });
                } else {
                    this.allSelected = true;

                    // if everything is selected: change the selectAll property of each indicator block to true
                    this.indicatorBlocks.forEach(function(indicatorBlock) {
                        indicatorBlock.vueApp.allSelected = true;
                    });

                    // also check the "select all" buttons for all of the indicator blocks 
                    $('.select-all-checkbox').each(function() {
                        $(this)[0].checked = true;
                    });
                }

                var selectAll = this.allSelected;

                $('.indicator-select').each(function() {
                    $(this)[0].children[0].checked = selectAll;
                });
            }
        }
    });

    // show the indicator blocks
    VUEAPPMANAGER.phaseTwoVue.showIndicatorBlocks();

    // hide any alerts (this hides the alert for the whois/dns)
    $('.alert').hide();
};

VUEAPPMANAGER.dangerZoneVue = new Vue({
    el: '#danger-zone',
    data: {
        attributeType: '',
        attributeValue: '',
    },
    methods: {
        removeAttribute: function() {
            // TODO: add a warning when running this function on more than 100 indicators
            if (this.attributeType === '') {
                $.jGrowl('An attribute type is required', {group: 'failure-growl'});
                return;
            } else if (this.attributeValue === '') {
                if (confirm("Heads up! You are about to delete all \"" + this.attributeType + "\" attributes from the selected indicators (regardless of the attribute's value). Do you want to continue?")) {
                    TCREQUESTER.removeAttribute(this.attributeType, this.attributeValue, '#dangerZoneAttributeStatus');
                } else {
                    return;
                }
            } else {
                TCREQUESTER.removeAttribute(this.attributeType, this.attributeValue, '#dangerZoneAttributeStatus');
            }
        }
    }
});
