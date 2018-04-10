function escapeRegExp(str) {
    return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
}

function getDataset(datasetURL, regexList, escapeRegex=false) {
    /* Regest the given dataset and retrieve each of the regexes from it. */
    var xmlHttp = new XMLHttpRequest();

    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
            var regexResponse = JSON.parse(xmlHttp.responseText);

            // format the regexes
            for (var i = regexResponse.length - 1; i >= 0; i--) {
                // create a regex based on the escaped string value from the API
                var newRegex;

                if (!escapeRegex) {
                    // if we are not escaping the 'find' regex...
                    newRegex = {
                        "find": new RegExp(regexResponse[i].find, "gi"),
                        "replace": regexResponse[i].replace
                    };
                } else {
                    // if we are escaping the 'find' regex...
                    newRegex = {
                        "find": new RegExp(escapeRegExp(regexResponse[i].find), "gi"),
                        "replace": regexResponse[i].replace
                    };
                }

                regexList.push(newRegex);
            }
        }
    };

    xmlHttp.open("GET", datasetURL, true);
    xmlHttp.send(null);
}

var refangRegexes = [];

// retrieve the regexes for refanging
getDataset("https://raw.githubusercontent.com/ioc-fang/ioc_fanger/master/ioc_fanger/fang.json", refangRegexes, escapeRegex=true);

function removeRegex(str) {
    /* Make a regex into a string. */
    // remove the "/" and "/ig" before and after the regex
    var cleanedRegex = str.slice(1, -3);

    // remove all backslashes
    cleanedRegex = cleanedRegex.replace(/\\/g, "");

    return cleanedRegex;
}

function fang(regexes, text) {
    /* Run through each of the regexes and make the replacements in the given text. */
    for (var i = regexes.length - 1; i >= 0; i--) {
        var matches = regexes[i].find.exec(text);
        if (matches) {
            // TODO: there may be a more efficient way to do the chunk below... I haven't look into it yet
            if (matches.length > 1) {
                console.log("many matches found: ", String(regexes[i].find));
                function replacer(match, selection1) {
                    /* Replace selection1 with the replacement. */
                    return match.replace(selection1, regexes[i].replace);
                }
                text = text.replace(regexes[i].find, replacer);
            } else {
                console.log("one match found", removeRegex(String(regexes[i].find)));
                console.log("find", removeRegex(String(regexes[i].find)));
                console.log("replace", regexes[i].replace);
                text = text.replace(regexes[i].find, regexes[i].replace);
            }
        }
    }

    return text;
}

function takeAction() {
    /* Refang or Defang the text. */
    // find the input text
    var text = document.getElementById('indicator-textarea').value;

    text = fang(refangRegexes, text);

    $('#indicator-textarea').val(text);
}
