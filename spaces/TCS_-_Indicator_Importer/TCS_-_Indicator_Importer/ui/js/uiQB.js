var UIQB = UIQB || {};

UIQB.startApp = function() {
    $('#phase-one').hide();

    // TESTING:
    $('#phase-two').hide();

    $('#bulk-indicator-app').css('visibility', 'visible');

    // lay the foundation
    $(document).foundation();

    // hide all alerts
    $('.alert').hide();

    // hide all joyride guides
    $('.joyride').hide();

    // destroy all previous joyrides
    jQuery(window).joyride("destroy");

    // check to see if the joyride for this phase has been run
    TCREQUESTER.joyrideComplete(0);

    // focus on the owner type-ahead
    window.setTimeout(function() {
        $('#owner-typeahead-input').focus();
    }, 500);

    // configure jgrowl to not show the [Close All]
    $.jGrowl.defaults.closer = false;

    // increment the usage counter in the analytics datastore for the app
    VUEAPPMANAGER.phaseZeroVue.handleAppAnalytics();
};

UIQB.confirmPhaseOneStart = function() {
    /* Confirm the start of phase one. */
    // check to make sure an owner is selected
    var owner = $('#owner-typeahead-input').val();
    // check to see if any of the indicators on phase one are selected
    var text = $('#indicator-textarea').val();

    if (text !== '' && owner !== '') {
        UIQB.startPhaseOne();
    } else {
        $.jGrowl('Please select an owner and enter text before moving to the next step.', {group: 'failure-growl'});
    }
};

UIQB.startPhaseOne = function() {
    // show the loading screen
    VUEAPPMANAGER.phaseZeroVue.loadingPhaseOne = true;

    // start the suggestion engines and vue apps
    VUEAPPMANAGER.startPhaseOne();
    INDICATORIMPORTER.parseIndicators();
    SUGGESTIONENGINE.initializePhaseTwoSuggestions();

    window.setTimeout(function() {
        VUEAPPMANAGER.phaseZeroVue.loadingSuffix += ".";
    }, 1500);

    window.setTimeout(function() {
        VUEAPPMANAGER.phaseZeroVue.loadingSuffix += ".";
    }, 3750);

    window.setTimeout(function() {
        VUEAPPMANAGER.phaseZeroVue.loadingSuffix += ".";
    }, 5750);

    window.setTimeout(function() {
        VUEAPPMANAGER.phaseZeroVue.loadingSuffix += ".";
    }, 7000);

    // set a timeout which will eventually show the UI for phase one
    window.setTimeout(function() {
        $('#phase-zero').hide();
        $('#phase-one').show();
        // start foundation for phase one (to handle the tabs)
        $('#phase-one').foundation();
        // destroy all previous joyrides
        jQuery(window).joyride("destroy");
        // check to see if the joyride for this phase has been run
        TCREQUESTER.joyrideComplete(1);
    }, 8000);
};

UIQB.confirmPhaseTwoStart = function() {
    /* Start phase two. */
    var indicatorsSelected = false;

    // check to see if any of the indicators on phase one are selected
    $('#phase-one-indicators .indicator-select').each(function() {
        if ($(this)[0].children[0].checked) {
            indicatorsSelected = true;
        }
    });

    if (indicatorsSelected) {
        // ask the user before navigating to the next step
        if(confirm("You have indicators currently selected that have not been created yet. Are you sure you want to continue?")) {
            UIQB.startPhaseTwo();
        }
    } else {
        UIQB.startPhaseTwo();
    }
};

UIQB.startPhaseTwo = function() {
    $('#phase-one').hide();
    $('#phase-two').show();
    VUEAPPMANAGER.startPhaseTwo();
    SUGGESTIONENGINE.startPhaseTwoSuggestions();
    // get the profiles from the datastore
    TCREQUESTER.getProfilesFromDatastore();
    // get the attributes from the datastore
    TCREQUESTER.getAttributesFromDatastore();

    // destroy all previous joyrides
    jQuery(window).joyride("destroy");

    // check to see if the joyride for this phase has been run
    TCREQUESTER.joyrideComplete(2);

    // initialize the button group for filtering
    setTimeout(function() {
        $('.button-toggle .button').click(function () {
            $(this).siblings().removeClass('is-active');
            $(this).addClass('is-active');
        });
        // start foundation to handle the off-screen panel on the left of phase two
        $('#phase-two').foundation();
    }, 100);
};

$(document).on('open.zf.reveal', '[data-reveal]', function() {
    /* Take actions when a modal is opened. */
    // focus on the type-ahead for this modal
    try {
        $(this).find('.typeahead')[1].focus();
    }
    catch(err) {}

    try {
        VUEAPPMANAGER.modalVue.updateCurrentAttributes();
    } catch(err) {}

    // show a warning if there are no selected indicators
    var selectedIndicators = VUEAPPMANAGER.phaseTwoVue.getSelectedIndicatorsFromBlock();
    if (selectedIndicators == null) {
        $.jGrowl("No indicators selected. Select some indicators and then come back.", { group: 'warning-growl'});
    }

    // reset the status of the status button for this modal
    $(this).find('button').removeClass('alert');
    $(this).find('button').removeClass('success');
});

$(document).on('closed.zf.reveal', '[data-reveal]', function() {
    /* Take actions when a modal is closed. */
    // clear the addedTags
    VUEAPPMANAGER.modalVue.addedTags = [];
});
