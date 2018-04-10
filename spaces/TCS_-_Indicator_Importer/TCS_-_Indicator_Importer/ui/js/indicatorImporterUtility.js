/* global window, location, document, INDICATORIMPORTER, $, getParameterArrayByName, getParameterByName, XMLHttpRequest, console, TCREQUESTER, VUEAPPMANAGER, */
"use strict";

var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = decodeURIComponent(window.location.search.substring(1)),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : sParameterName[1];
        }
    }
};

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

String.prototype.matchAll = function(regexp) {
  var matches = [];
  this.replace(regexp, function() {
    var arr = ([]).slice.call(arguments, 0);
    var extras = arr.splice(-2);
    arr.index = extras[0];
    arr.input = extras[1];
    matches.push(arr[0]);
  });
  return matches.length ? matches : null;
};

var INDICATORIMPORTERUTILITY = INDICATORIMPORTERUTILITY || {};

INDICATORIMPORTERUTILITY.handleStatusBadge = function(statusElement, statusClass, timeout=10000) {
    // remove any old statuses from the status element
    $(statusElement).removeClass('alert');
    $(statusElement).removeClass('warning');
    $(statusElement).removeClass('success');

    // add the specified class to the status badge
    $(statusElement).addClass(statusClass);

    // remove the added class and alert after some time
    window.setTimeout(function() {
        $(statusElement).removeClass(statusClass);
    }, timeout);
};

INDICATORIMPORTERUTILITY.retrieveParameter = function(parameterName, parameterArray=false, bool=false) {
    var parameterOutput;

    if (parameterArray) {
        var parameterObject = getParameterArrayByName(parameterName);
        parameterOutput = [];

        for (var key in parameterObject) {
            if (parameterObject[key] !== "") {
                parameterOutput.push(parameterObject[key]);
            }
        }
    } else {
        parameterOutput = getParameterByName(parameterName);

        if (bool) {
            parameterOutput = (parameterOutput == 'true');
        }
    }

    return parameterOutput;
};

INDICATORIMPORTERUTILITY.queryVT = function(fileHash) {
    /* Simple script to query a VT for a file using VT's public API. */
    var sp = TCREQUESTER.tc.secureProxy();
    var vtAPIKey = INDICATORIMPORTERUTILITY.retrieveParameter("vtAPIKey");
    var vtURL = `https://www.virustotal.com/vtapi/v2/file/report?apikey=${vtAPIKey}&resource=${fileHash}`;

    // increment the count of API calls made to VT
    VUEAPPMANAGER.phaseOneVue.vtApiCallCount += 1;

    // check to make sure that the max VT queries has not been exceeded
    if (VUEAPPMANAGER.phaseOneVue.vtApiCallCount >= VUEAPPMANAGER.phaseOneVue.maxVTQueries) {
        $.jGrowl("The maximum number of VT queries (" + VUEAPPMANAGER.phaseOneVue.maxVTQueries + ") has been met or exceeded (" + VUEAPPMANAGER.phaseOneVue.vtApiCallCount + "). I'm not going to enrich any more files at the moment.", { group: 'warning-growl'});

        // stop the button from being a spinner
        $('[data-addCart]').removeClass('is-adding');
    } else {
        sp.method('POST')
            .url(vtURL)
            .done(function(response) {
                // if the file was not found in VT
                if (response.response_code === 0) {
                    VUEAPPMANAGER.phaseOneVue.vtQueryCallback();
                    // $('[data-addCart]').removeClass('is-adding');
                } else {
                    // create a consolidated response with just the file hashes
                    var consolidatedResponse = {
                        md5: response.md5.toLowerCase(),
                        sha1: response.sha1.toLowerCase(),
                        sha256: response.sha256.toLowerCase()
                    };

                    VUEAPPMANAGER.phaseOneVue.consolidateFileHashes(consolidatedResponse);
                    VUEAPPMANAGER.phaseOneVue.vtQueryCallback();
                }
            })
            .error(function(response) {
                $.jGrowl("Error merging files from VT: " + response.error + ". Make sure you have added your VT API key in the config for this app.", { group: 'failure-growl'});
                VUEAPPMANAGER.phaseOneVue.vtQueryCallback();
                $('[data-addCart]').removeClass('is-adding');
            })
            .request();
    }
};

INDICATORIMPORTERUTILITY.handleCompleteFiles = function(fileHashes) {
    /* Handle complete file indicators that look like: `<md5 hash> : <sha1 hash> : <sha256 hash>`. */
    var hashes = fileHashes.split(" : ");
    var completeFile = {};

    for (var i = hashes.length - 1; i >= 0; i--) {
        if (hashes[i].length === 32) {
            completeFile['md5'] = hashes[i];
        }
        else if (hashes[i].length === 40) {
            completeFile['sha1'] = hashes[i];
        }
        else if (hashes[i].length === 64) {
            completeFile['sha256'] = hashes[i];
        }
    }

    // return the file hashes as a dictionary
    return completeFile;
};
