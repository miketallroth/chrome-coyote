// This script runs in the foreground of all web pages when the Coyote extension is active.
// See https://developer.chrome.com/extensions/content_scripts for more information.

"use strict";

// Create the Foreground namespace.
Coyote.createNamespace("Foreground");

// Foreground initialization function.
Coyote.Foreground.initialize = function() {

  // Register a handler to process messages from the toolbar script.
  Coyote.Foreground.registerMessageHander();
}

// Registers a handler to process messages from the toolbar script.
Coyote.Foreground.registerMessageHander = function() {
  chrome.runtime.onMessage.addListener(Coyote.Foreground.handleMessage);
}

// Handles messages from the toolbar script.
Coyote.Foreground.handleMessage = function(request, sender, sendResponse) {

  if(request.action === "getBodyTextContent") {

    sendResponse(Coyote.Foreground.getBodyTextContent());
  }
  else {
    throw "The message request action was not recognized.";
  }
}

// Gets text content from the document body.
Coyote.Foreground.getBodyTextContent = function() {
  let bodyTextContent = null;

  let bodyElements = document.getElementsByTagName("body");

  if(bodyElements !== undefined && bodyElements !== null && bodyElements.length === 1) {
    bodyTextContent = Coyote.Foreground.getTextContent(bodyElements[0]);
  }

  return bodyTextContent;
}

// Gets text content from the specified root element.
Coyote.Foreground.getTextContent = function(rootElement) {

  let textContent = "";

  let nodeIterator = document.createNodeIterator(rootElement, NodeFilter.SHOW_TEXT);
  let currentNode = null;

  while(currentNode = nodeIterator.nextNode()) {

    if(currentNode.parentNode !== undefined && currentNode.parentNode !== null) {

      // Ignore non-standard elements.
      if(Coyote.Common.isNonStandardElement(currentNode.parentNode.nodeName) === false) {

        // Ignore text elements that only have whitespace.
        let nodeText = $.trim(currentNode.nodeValue);
        if(nodeText.length > 0) {

          // Ignore text elements that are not visible.
          if(Coyote.Foreground.isVisible(currentNode)) {

            currentNode = $(currentNode);

            // Normalize whitespace.
            nodeText = nodeText.replace(Coyote.Common.whitespaceRegEx, " ");

            let parentNodes = currentNode.parentsUntil(rootElement);

            let nodePath = "";
            for(let index = parentNodes.length - 1; index > -1; index--) {

              let parentNode = parentNodes[index];
              let parentNodeName = parentNode.nodeName.toLowerCase();

              // Exclude ignored elements.
              if(Coyote.Common.isIgnoredElement(parentNodeName) === false) {

                nodePath = nodePath + "/" + parentNodeName + "[" + $(parentNode).index() + "]";
              }
            }

            textContent = textContent + nodePath + "/leaf:" + nodeText + "\n";
          }
        }
      }
    }
  }

  return textContent;
}

// Checks if an element is visible.
Coyote.Foreground.isVisible = function(currentNode) {

  let visible = false;

  if($(currentNode.parentNode).is(":visible")) {

     if($(currentNode.parentNode).css("visibility") !== "hidden") {

       visible = true;
     }
  }

  return visible;
}

// Perform initialization.
Coyote.Foreground.initialize();
