// This script is used with the Coyote toolbar dialog.

"use strict";

// Create the Toolbar namespace.
Coyote.createNamespace("Toolbar");

// Toolbar initialization function.
Coyote.Toolbar.initialize = function() {

	console.log("Initializing toolbar.");

	// Create a data structure to keep track of the selected tabs.
	Coyote.Toolbar.tabsData = Coyote.Toolbar.TabsData();

	// Executed when the toolbar dialog is loaded.
	$(function() {

		// Remove unused stored tab data.
		Coyote.Toolbar.removeUnusedStoredTabData().done(function() {

			// Get an array of regular browser tabs.
			Coyote.Toolbar.getTabs().done(function(tabs) {

				// Build the tab selection list.
				Coyote.Toolbar.buildTabSelectionList(tabs);

				// Register a tab selection click event handler.
				Coyote.Toolbar.registerTabSelectionClickEventHandler();

				// Register a form submission handler.
				Coyote.Toolbar.registerFormSubmissionHandler();

			}).fail(function(errorMessage) {
				Coyote.Common.displayErrorMessage(errorMessage);
			});
		}).fail(function(errorMessage) {
			Coyote.Common.displayErrorMessage(errorMessage);
		});
	});
}

// A data structure to keep track of the selected tabs.
Coyote.Toolbar.TabsData = function() {

	console.log("Instantiating tabs data.");

	let selectedTabIDs = [];

	return {

		// Routine for managing the array of selected tab IDs.
		modifySelectedTabIDs: function(tabID) {

			// Both positions of the array are empty.
			// Add the selected tab ID to the first position of the array.
			if(selectedTabIDs.length === 0) {
				selectedTabIDs.push(tabID);
			}

			// The first position of the array is populated, and the second position of the array is empty.
			else if(selectedTabIDs.length === 1) {

				let firstTabID = selectedTabIDs[0];

				// Remove the first tab ID from the array if it equals the selected tab.
				if(firstTabID === tabID) {
					selectedTabIDs.shift();
				}

				// Otherwise, add the selected tab ID to the second position of the array.
				else {
					selectedTabIDs.push(tabID);
				}
			}

			// Both positions of the array are populated.
			else if(selectedTabIDs.length === 2) {

				let firstTabID = selectedTabIDs[0];
				let secondTabID = selectedTabIDs[1];

				// Remove the first tab ID from the array if it equals the selected tab ID.
				if(firstTabID === tabID) {
					selectedTabIDs.shift();
				}

				// Remove the second tab ID from the array if it equals the selected tab ID.
				else if(secondTabID === tabID) {
					selectedTabIDs.pop();
				}

				// Remove the first tab ID from the array and add the selected tab ID to the second position of the array.
				else {
					selectedTabIDs.shift();
					selectedTabIDs.push(tabID);
				}
			}
			else {
				// This code path should not be possible to reach in practice, and is included only for completeness;
				Coyote.Common.displayErrorMessage("No more than two selected tab IDs can be stored.");
			}
		},

		// Gets the array of selected tab IDs.
		getSelectedTabIDs: function() {
			return selectedTabIDs;
		},

		// Gets the selected tab count.
		getSelectedTabCount: function() {
			return selectedTabIDs.length;
		}
	}
}

// Returns an array of browser tabs.
Coyote.Toolbar.getTabs = function(tabType) {

	console.log("Getting browser tabs.");

	let result = new $.Deferred();
	let tabs = [];

	chrome.windows.getAll({
		populate: true,
		windowTypes: ["normal"]
	}, function(windows) {

		for (let windowIndex = 0; windowIndex < windows.length; windowIndex++) {
			let window = windows[windowIndex];

			for (let tabIndex = 0; tabIndex < window.tabs.length; tabIndex++) {
				let tab = window.tabs[tabIndex];

				if(tabType === "coyote" && Coyote.Toolbar.isCoyoteTab(tab)) {

					tabs.push(tab);
				}
				else if(Coyote.Toolbar.isRegularTab(tab)) {

					tabs.push(tab);
				}
			}
		}

		result.resolve(tabs);
	});

	return result.promise();
}

// Selects only Coyote tabs.
Coyote.Toolbar.isCoyoteTab = function(tab) {

	let coyoteTab = false;

	let tabURL = new URL(tab.url);

	let tabProtocol = tabURL.protocol;
	if(tabProtocol !== undefined && tabProtocol !== null) {
		if(tabProtocol === "chrome-extension:") {

			let tabURLPath = tabURL.pathname;
			if(tabURLPath !== undefined && tabURLPath !== null) {

				if(tabURLPath.endsWith("coyote-comparison.html")) {

					coyoteTab = true;
				}
			}
		}
	}

	return coyoteTab;
}

// Filters out Chrome utility tabs and unusual URL protocols.
Coyote.Toolbar.isRegularTab = function(tab) {

	let regularTab = false;

	let tabProtocol = new URL(tab.url).protocol;
	if(tabProtocol !== undefined && tabProtocol !== null) {
		if(tabProtocol === "http:" || tabProtocol === "https:" || tabProtocol === "file:") {
			regularTab = true;
		}
	}

	return regularTab;
}

// Returns a browser tab by ID.
Coyote.Toolbar.getTab = function(tabID) {

	let result = new $.Deferred();

	chrome.tabs.get(parseInt(tabID), function(tab) {

		result.resolve(tab);
	});

	return result.promise();
}

// Builds the tab selection list.
Coyote.Toolbar.buildTabSelectionList = function(tabs) {

	console.log("Building tab selection list.");

	let tabSelectionContainer = $("#tab-selection-container");

	let columnCount = Math.ceil(tabs.length / 5);
	for(let columnIndex = 0; columnIndex < columnCount; columnIndex++) {

		let tabSelectionList = $("<ul>")
		.addClass("tab-selection-list");

		for(let tabIndex = columnIndex * 5; tabIndex < Math.min((columnIndex * 5) + 5, tabs.length); tabIndex++) {
			let tab = tabs[tabIndex];

			let tabHostnameValue = new URL(tab.url).hostname;

			let tabSelectionIcon = $("<div>")
			.addClass("tab-selection-icon")
			.attr("title", tabHostnameValue)
			.css("background-image", "url(" + Coyote.Common.getFavIconUrl(tab.favIconUrl) + ")")
			.css("background-size", "18px 18px")
			.css("background-repeat", "no-repeat");

			let tabTitle = $("<span>")
			.addClass("tab-title")
			.attr("title", tab.title)
			.text(Coyote.Common.truncate(tab.title, 40));

			let tabHostname = $("<span>")
			.addClass("tab-hostname")
			.attr("title", tabHostnameValue)
			.text(tabHostnameValue);

			let tabSelectionItemContent = $("<div>")
			.addClass("tab-selection-item-content")
			.append(tabTitle)
			.append("<br>")
			.append(tabHostname);

			let tabSelectionItemContentContainer = $("<div>")
			.addClass("tab-selection-item-content-container")
			.append(tabSelectionIcon)
			.append(tabSelectionItemContent);

			let tabSelectionListItem = $("<li>")
			.addClass("tab-selection-list-item")
			.attr("data-tab-id", tab.id)
			.append(tabSelectionItemContentContainer);

			tabSelectionList.append(tabSelectionListItem);
		}

		tabSelectionContainer.append(tabSelectionList);
	}

	let tabSelectionContainerWidth = (columnCount * 162) + (columnCount * 26) + 8;
	tabSelectionContainer.css("width", tabSelectionContainerWidth + "px");

	// Increase the width as needed to account for the horizontal scrollbar.
	if(tabSelectionContainerWidth > $("body").width()) {
		tabSelectionContainer.css("width", (tabSelectionContainerWidth + 8) + "px");
	}
}

// Registers a tab selection click handler.
Coyote.Toolbar.registerTabSelectionClickEventHandler = function() {

	$(".tab-selection-list").on("click", ".tab-selection-list-item", function() {
		Coyote.Toolbar.handleTabSelectionClickEvent(this);
	});
}

// Handles a tab selection click event.
Coyote.Toolbar.handleTabSelectionClickEvent = function(tabSelectionListItem) {

	// Update the tab selection display.
	Coyote.Toolbar.updateTabSelectionDisplay(tabSelectionListItem);

	// Set the compare button state.
	Coyote.Toolbar.setCompareButtonState();
}

// Updates the tab selection display.
Coyote.Toolbar.updateTabSelectionDisplay = function(clickedTabSelectionListItem) {

	clickedTabSelectionListItem = $(clickedTabSelectionListItem);

	let tabID = clickedTabSelectionListItem.attr("data-tab-id");
	let selectionResult = Coyote.Toolbar.tabsData.modifySelectedTabIDs(tabID);

	let selectedTabIDs = Coyote.Toolbar.tabsData.getSelectedTabIDs();

	// Remove all existing tab selection highlighting and display index badges.
	$(".active-tab-selection").removeClass("active-tab-selection");
	$(".display-index-badge").remove();

	// Add selection highlighting and display index badges to the selected tab list items.
	$.each(selectedTabIDs, function(index, selectedTabID) {

		let selectedTabListItem = $(".tab-selection-list-item[data-tab-id=" + selectedTabID + "]");

		selectedTabListItem.addClass("active-tab-selection");
		Coyote.Toolbar.addDisplayIndexBadge(index + 1, selectedTabListItem);
	});
}

// Adds the display index badge.
Coyote.Toolbar.addDisplayIndexBadge = function(displayIndex, tabSelectionListItem) {

	let displayIndexBadgeText = $("<span>")
	.addClass("display-index-badge-text")
	.append(displayIndex);

	let displayIndexBadge = $("<div>")
	.addClass("display-index-badge")
	.append(displayIndexBadgeText);

	$(tabSelectionListItem).find(".tab-selection-item-content-container").append(displayIndexBadge);
}

// Sets the compare button state.
Coyote.Toolbar.setCompareButtonState = function() {

	let compareButton = $("#compare-button");

	if(Coyote.Toolbar.tabsData.getSelectedTabCount() === 2) {
		compareButton.removeAttr("disabled");
	}
	else {
		compareButton.attr("disabled", "disabled");
	}
}

// Registers a form submission handler.
Coyote.Toolbar.registerFormSubmissionHandler = function() {

	// Set up a form submission handler.
	$("#tab-selection-container").submit(function(event) {
		event.preventDefault();
		Coyote.Toolbar.processFormSubmission();
	});
}

// Processes the form submission.
Coyote.Toolbar.processFormSubmission = function() {

	console.log("Processing comparison form submission.");

	let selectedTabIDs = Coyote.Toolbar.tabsData.getSelectedTabIDs();
	if(selectedTabIDs.length === 2) {

		let firstTabID = parseInt(selectedTabIDs[0]);
		let firstTabStoragePromise = Coyote.Toolbar.storeTabData(firstTabID);

		let secondTabID = parseInt(selectedTabIDs[1]);
		let secondTabStoragePromise = Coyote.Toolbar.storeTabData(secondTabID);

		// Persist the select tab data to storage.
		$.when(firstTabStoragePromise, secondTabStoragePromise).done(function(firstTabStorageKey, secondTabStorageKey) {

			// Build the comparison tab URL.
			let comparisonTabURL = "../../pages/coyote-comparison.html?firstTabStorageKey=" + firstTabStorageKey + "&secondTabStorageKey=" + secondTabStorageKey;

			// Open the comparison tab.
			// The Coyote toolbar will automatically close when the comparison tab is opened.
			// This stops execution of the toolbar script.  Therefore, no code can be executed after this point.
			chrome.tabs.create({active: true, url: comparisonTabURL}, function(comparisonTab) {

				// This code would only run if the comparison tab failed to open.
				if(chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) {

					// Clean up any stored tab data if a failure occurs.
					Coyote.Common.removeStoredTabData(firstTabStorageKey);
					Coyote.Common.removeStoredTabData(secondTabStorageKey);

					Coyote.Common.displayErrorMessage("The comparison tab could not be opened.  Chrome API error message:  " + chrome.runtime.lastError.message);
				}
				else {
					// This code path should not be possible to reach in practice, and is included only for completeness;
					window.close();
				}
			});

		}).fail(function(errorMessage) {
			Coyote.Common.displayErrorMessage(errorMessage);
		});
	}
	else {
		Coyote.Common.displayErrorMessage("Exactly two selected tab IDs were expected.");
	}
}

// Helper function to persist tab data to Chrome local storage.
Coyote.Toolbar.storeTabData = function(tabID) {

	console.log("Storing tab data.");

	let result = new $.Deferred();

	// Get the tab.
	Coyote.Toolbar.getTab(tabID).done(function(tab) {

		// Get the text content from the tab document body.
		Coyote.Toolbar.getTabBodyTextContent(tabID).done(function(tabBodyTextContent) {

			// Build a data structure for the tab to persist to storage.
			let tabData = Coyote.Toolbar.buildTabData(tab, tabBodyTextContent);

			// Build a storage entry.
			let storageEntry = {};
			let prefixedTabDataStorageKey = "coyote-comparison-" + tabData.tabDataUUID;
			storageEntry[prefixedTabDataStorageKey] = tabData;

			// Persist the tab data to storage.
			chrome.storage.local.set(storageEntry, function() {

				if(chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) {
					result.reject("The tab data could not be stored.  Chrome API error message:  " + chrome.runtime.lastError.message);
				}
				else {
					result.resolve(tabData.tabDataUUID);
				}
			});
		}).fail(function(errorMessage) {
			result.reject(errorMessage);
		});
	}).fail(function(errorMessage) {
		result.reject(errorMessage);
	});

	return result.promise();
}

// Removes unused stored tab data from Chrome local storage.
Coyote.Toolbar.removeUnusedStoredTabData = function() {

	console.log("Removing unused stored tab data.");

	let result = new $.Deferred();

	// Get all keys from local storage.
	chrome.storage.local.get(null, function(allStoredItems) {

		if(chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) {
			result.reject("The tab data could not be removed.  Chrome API error message:  " + chrome.runtime.lastError.message);
		}
		else {

			// Get the collection of all storage keys.
			let allStorageKeys = Object.keys(allStoredItems);

			// Get the collection of active Coyote tabs.
			Coyote.Toolbar.getTabs("coyote").done(function(coyoteTabs) {

				// Get the collection of active storage keys.
				let activeStorageKeys = Coyote.Toolbar.getActiveStorageKeys(coyoteTabs);

				let removedPromises = [];

				for(let index = 0; index < allStorageKeys.length; index++) {

					// Check if the current storage key is used with Coyote.
					let storageKey = allStorageKeys[index];
					if(storageKey.indexOf("coyote-comparison-") === 0) {

						// Preseve any data that is currently active.
						if(activeStorageKeys.indexOf(storageKey.substring(18)) < 0) {

							let removedPromise = Coyote.Toolbar.removeStoredTabData(storageKey);
							removedPromises.push(removedPromise);
						}
					}
				}

				$.when(removedPromises).done(function() {
					result.resolve();
				}).fail(function(errorMessage) {
					result.reject(errorMessage);
				});
			}).fail(function(errorMessage) {
				result.reject(errorMessage);
			});
		}
	});

	return result.promise();
}

// Helper function to get active Coyote storage keys.
Coyote.Toolbar.getActiveStorageKeys = function(coyoteTabs) {

	let activeStorageKeys = [];

	for(let tabIndex = 0; tabIndex < coyoteTabs.length; tabIndex++) {

		// Get the URL query string parameters.
		let queryStringParameters = Coyote.Common.parseURLQueryString(coyoteTabs[tabIndex].url);

		if(queryStringParameters !== undefined && queryStringParameters !== null && queryStringParameters.length > 0) {

			// Get the first tab storage key.
			let firstTabStorageKey = Coyote.Common.getQueryStringParameterValue(queryStringParameters, "firstTabStorageKey");
			if(firstTabStorageKey !== undefined && firstTabStorageKey !== null && firstTabStorageKey.length > 0) {
				activeStorageKeys.push(firstTabStorageKey);
			}

			// Get the second tab storage key.
			let secondTabStorageKey = Coyote.Common.getQueryStringParameterValue(queryStringParameters, "secondTabStorageKey");
			if(secondTabStorageKey !== undefined && secondTabStorageKey !== null && secondTabStorageKey.length > 0) {
				activeStorageKeys.push(secondTabStorageKey);
			}
		}
	}

	return activeStorageKeys;
}

// Helper function to remove stored tab data.
Coyote.Toolbar.removeStoredTabData = function(storageKey) {

	let result = new $.Deferred();

	// Delete the current item.
	chrome.storage.local.remove(storageKey, function() {
		if(chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) {
			result.reject("The tab data could not be removed.  Chrome API error message:  " + chrome.runtime.lastError.message);
		}
		else {
			result.resolve();
		}
	});

	return result.promise();
}

// Helper function to build tab data for storage.
Coyote.Toolbar.buildTabData = function(tab, tabBodyTextContent) {

	return {
		tabID: tab.id,
		tabURL: tab.url,
		tabFavIconURL: tab.favIconUrl,
		tabTitle: tab.title,
		tabDataUUID: Coyote.Common.generateUUID(),
		tabBodyTextContent: tabBodyTextContent
	};
}

// Gets text content from the tab document body.
Coyote.Toolbar.getTabBodyTextContent = function(tabID) {

	let result = new $.Deferred();

	chrome.tabs.sendMessage(parseInt(tabID), {action: "getBodyTextContent"}, function(tabBodyTextContent) {
		if(chrome.runtime.lastError !== undefined && chrome.runtime.lastError !== null) {
			result.reject("The tab body text content could not be retrieved.  Chrome API error message:  " + chrome.runtime.lastError.message);
		}
		else {
			result.resolve(tabBodyTextContent);
		}
	});

	return result.promise();
}

// Perform initialization.
Coyote.Toolbar.initialize();
