// This script is used with the Coyote comparison page.

"use strict";

// Create the Comparison namespace.
Coyote.createNamespace("Comparison");

// Comparison initialization function.
Coyote.Comparison.initialize = function() {

  // Executed when the comparison page is loaded.
  $(function() {

    let startTime = Date.now();

    setTimeout(function() {

      // Get the stored tab data.
      Coyote.Comparison.getCombinedStoredTabData().done(function(combinedStoredTabData) {

        // Perform the comparison.
        Coyote.VisualComparison.runDifferenceAlgorithm(combinedStoredTabData).done(function() {

          // Display the output tables.
          Coyote.VisualComparison.displayOutput(combinedStoredTabData).done(function() {

            // Processing is complete!
            let endTime = Date.now();
            let elapsedTime = endTime - startTime;
            console.log("Elapsed time:  " + elapsedTime + "ms");

          }).fail(function(errorMessage) {
            Coyote.Common.displayErrorMessage(errorMessage);
          });
        }).fail(function(errorMessage) {
          Coyote.Common.displayErrorMessage(errorMessage);
        });

      }).fail(function(errorMessage) {
        Coyote.Common.displayErrorMessage(errorMessage);
      });
    }, 0);
  });
}

// Retrieves stored data from both tabs.
Coyote.Comparison.getCombinedStoredTabData = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    // Get the URL query string parameters.
    let queryStringParameters = Coyote.Common.parseURLQueryString(window.location.toString());

    // Get the first tab storage key.
    let firstTabStorageKey = Coyote.Common.getQueryStringParameterValue(queryStringParameters, "firstTabStorageKey");
    if(firstTabStorageKey === undefined || firstTabStorageKey === null || firstTabStorageKey.length === 0) {
      result.reject("The firstTabStorageKey URL query string parameter is missing or invalid.");
    }
    else {

      // Get the second tab storage key.
      let secondTabStorageKey = Coyote.Common.getQueryStringParameterValue(queryStringParameters, "secondTabStorageKey");
      if(secondTabStorageKey === undefined || secondTabStorageKey === null || secondTabStorageKey.length === 0) {
        result.reject("The secondTabStorageKey URL query string parameter is missing or invalid.");
      }
      else {

        // Retrieve the stored tab data.
        let firstTabDataPromise = Coyote.Comparison.getStoredTabData(firstTabStorageKey);
        let secondTabDataPromise = Coyote.Comparison.getStoredTabData(secondTabStorageKey);

        $.when(firstTabDataPromise, secondTabDataPromise).done(function(firstTabData, secondTabData) {

          if(firstTabData === undefined || firstTabData === null || secondTabData === undefined || secondTabData === null) {
            result.reject("The tab data could not be retrieved from storage.  Note that opening the Coyote toolbar will delete any stored tab data.");
          }
          else {

            result.resolve({
              firstTabData: firstTabData,
              secondTabData: secondTabData
            });
          }
        }).fail(function(errorMessage) {
          result.reject(errorMessage);
        });
      }
    }
  }, 0);

  return result.promise();
}

// Retrieves stored tab data.
Coyote.Comparison.getStoredTabData = function(tabStorageKey) {

  let result = new $.Deferred();

  let prefixedTabDataStorageKey = "coyote-comparison-" + tabStorageKey;
  chrome.storage.local.get(prefixedTabDataStorageKey, function(tabData) {

    if(chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) {
      Coyote.Common.displayErrorMessage("The tab data could not be retrieved.  Chrome API error message:  " + chrome.runtime.lastError.message);
    }
    else {
      result.resolve(tabData[prefixedTabDataStorageKey]);
    }
  });

  return result.promise();
}

// Perform initialization.
Coyote.Comparison.initialize();
