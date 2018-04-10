/* global document, console, $, INDICATORBLOCK, TCREQUESTER, Set, INDICATORIMPORTERUTILITY, replaceAll, */
"use strict";

var INDICATORIMPORTER = INDICATORIMPORTER || {
    owner: undefined,
    regexes: [
        {
            regex: /\b(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
            type: "address"
        },
        {
            regex: /[a-z0-9!#$%&\'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])/gi,
            type: "emailaddress"
        },
        {
            regex: /\b([a-fA-F\d]{32})\b/g,
            type: "file-md5"
        },
        {
            regex: /\b([a-fA-F\d]{40})\b/g,
            type: "file-sha1"
        },
        {
            regex: /\b([a-fA-F\d]{64})\b/g,
            type: "file-sha256"
        },
        {
            regex: /\b((?:(?!-)[a-zA-Z0-9-]{0,62}[a-zA-Z0-9]\.)+(?!exe|php|dll|doc|docx|txt|rtf|odt|xls|xlsx|ppt|pptx|bin|pcap|ioc|pdf|mdb|asp|html|xml|jpg|png|lnk|log|vbs|lco|bat|shell|quit|pdb|vbp|bdoda|bsspx|save|cpl|wav|tmp|close|ico|ini|sleep|run|scr|jar|jxr|apt|w32|css|js|xpi|class|apk|rar|zip|hlp|tmp|cpp|crl|cfg|cer|plg|tmp|lxdns|cgi|dat($|\r\n)|gif($|\r\n)|xn$)(?:xn--[a-zA-Z0-9]{2,22}|[a-zA-Z]{2,13}))/gi,
            type: "host"
        },
        {
            regex: /\b(https?|sftp|ftp|file):\/\/[-a-zA-Z0-9+&@#/%?=~_|!:.;'*$()\\;]*[-a-zA-Z0-9+&@#/%?=~+|\.]/g,
            type: "url"
        },
        // NOTE: The regex for complete files is intentionally last in this data structure so that it will be parsed first in the `INDICATORIMPORTER.parseIndicators()` function. This is a good thing because it lets us also remove any of the 'component' file hashes that make up part of the complete file from the text. This prevents parsing a complete file with an md5 that is also parsed as an md5.
        {
            regex: /([a-fA-F\d]{32} : [a-fA-F\d]{40} : [a-fA-F\d]{64})/g,
            type: "file-complete"
        }
    ]
};

INDICATORIMPORTER.getOwner = function() {
    INDICATORIMPORTER.owner = document.getElementById('owner-typeahead-input').value;
};

INDICATORIMPORTER.breakDown = function(indicatorType, indicator) {
    /* Break down an indicator. */
    var subIndicators = [];

    if (indicatorType.toLowerCase() === "host") {
        var parts = indicator.split(".");

        // if there are more than two parts to the host
        if (parts.length > 2) {
            // the ``var i = parts.length - 2;`` is important because it starts at the second to last part of the host (thus, ignoring the TLD)
            for (var i = parts.length - 2; i >= 0; i--) {
                subIndicators.push(parts.slice(i).join("."));
            }
        }
    } else if (indicatorType.toLowerCase() === "url") {
        /* Do the following to URLs:
        - Remove query string
        - Identify the base URL
        - Split the URL around the "'" (single quote) character
         */
        // this is the URL indicator with the parameter strings removed
        var noQueryStringsURL;
        if (indicator.indexOf("?") !== -1) {
            noQueryStringsURL = indicator.slice(0, indicator.indexOf("?"));
        } else {
            noQueryStringsURL = indicator;
        }
        subIndicators.push(noQueryStringsURL);

        // this is the URL indicator without any of the directories
        var baseUrl = [noQueryStringsURL.split("/")[0], noQueryStringsURL.split("/")[1], noQueryStringsURL.split("/")[2]].join("/");
        subIndicators.push(baseUrl);

        // Split the URL around the "'" (single quote) character
        if (indicator.indexOf("'") !== -1) {
            var urlComponents = indicator.split("'");
            var baseUrl = urlComponents[0];
            var builtUrl = baseUrl;
            subIndicators.push(baseUrl);

            for (var i = 1; i <= urlComponents.length - 1; i++) {
                builtUrl = builtUrl + "'" + urlComponents[i];
                subIndicators.push(builtUrl);
            }
        }

        // NOTE TO MY FUTURE SELF: The code below will parse a bunch of sub-indicators for a URL by walking through the URL's directory. It is probably overkill, so I've removed it.
        // find all of the directories for the indicator
        // var directories = noQueryStringsURL.replace(baseURL, "").split("/");

        // // this is the URL we will build by adding directories onto the end of it
        // var builtURLIndicator = baseURL;

        // // iterate through all of the directories and add them to the base URL
        // for (var i = 0; i < directories.length; i++) {
        //     if (directories[i] !== "") {
        //         // add the new directory to the URL indicator
        //         builtURLIndicator += "/" + directories[i];

        //         // if the URL indicator we are building is not complete, append this URL and keep going
        //         if (builtURLIndicator != noQueryStringsURL) {
        //             subIndicators.push(builtURLIndicator);
        //         }
        //         // if the URL we are building is complete, we can stop
        //         else {
        //             break;
        //         }
        //     }
        // }
    }

    return subIndicators;
};

INDICATORIMPORTER.parseIndicators = function() {
    /* Parse each indicator type from the text. */
    // get the owner
    INDICATORIMPORTER.getOwner();

    // get the text
    var textBlob = document.getElementById('indicator-textarea').value;

    // determine whether or not to break down network indicators
    var breakDownInds = $("#breakDownNetworkInds")[0].checked;
    var pullDnsResolutions = $("#pullDnsResolutions")[0].checked;

    // iterate through each indicator type
    for (var i = INDICATORIMPORTER.regexes.length - 1; i >= 0; i--) {
        // find all indicators that match the given type
        var matches = new Set(textBlob.matchAll(INDICATORIMPORTER.regexes[i].regex));
        var indicatorType = INDICATORIMPORTER.regexes[i].type;
        var identifiedIndicators = new Set();

        matches.forEach(function(matchedIndicator) {
            // package all of the file hashes for checking against the TC API
            if (indicatorType === "file-complete") {
                // create an object out of the complete indicator
                matchedIndicator = INDICATORIMPORTERUTILITY.handleCompleteFiles(matchedIndicator);

                for (var fileHash in matchedIndicator) {
                    // remove all instances of the file hash from the text blob
                    textBlob = replaceAll(textBlob, matchedIndicator[fileHash], "");
                    // make the file hash lower-cased
                    matchedIndicator[fileHash] = matchedIndicator[fileHash].toLowerCase();
                }
            }
            // make all file hashes, hosts, and email addresses lower case
            else if (indicatorType.split("-")[0] === "file" || indicatorType.split("-")[0] === "host" || indicatorType.split("-")[0] === "emailaddress") {
                matchedIndicator = matchedIndicator.toLowerCase();
            }

            // add the matched indicator to the list of identified indicators
            identifiedIndicators.add(matchedIndicator);

            if (breakDownInds) {
                // break the indicator down to get other indicators that should be created from this indicator
                var subIndicators = INDICATORIMPORTER.breakDown(indicatorType, matchedIndicator);

                // add each subindicator to the list of identified indicators
                for (var k = subIndicators.length - 1; k >= 0; k--) {
                    identifiedIndicators.add(subIndicators[k]);
                }
            }
        });

        // now that we have a list of indicators of a certain type that have been parsed from the text, see if each of the indicators exists in TC (which will also add them to the vue app so they will show up appropriately)
        identifiedIndicators.forEach(function(identifiedIndicator) {
            TCREQUESTER.checkIndicatorExists(identifiedIndicator, indicatorType.split("-")[0], indicatorType, pullDnsResolutions);
        });
    }
};
