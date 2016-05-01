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
        Coyote.Comparison.runDifferenceAlgorithm(combinedStoredTabData).done(function(differenceAlgorithmOutput) {

          console.log("Processing is complete.");

          // Processing is complete!
          let endTime = Date.now();
          let calculationTime = endTime - startTime;

          // Display the output.
          Coyote.Comparison.displayOutput(combinedStoredTabData, differenceAlgorithmOutput, calculationTime).done(function() {

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

    console.log("Retrieving stored tab data.");

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

// Runs the difference algorithm.
Coyote.Comparison.runDifferenceAlgorithm = function(combinedStoredTabData) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Running the difference algorithm.");

    let firstTabBodyLines = $.trim(combinedStoredTabData.firstTabData.tabBodyTextContent).split("\n");
    let secondTabBodyLines = $.trim(combinedStoredTabData.secondTabData.tabBodyTextContent).split("\n");

    console.log("Getting distinct taxonomic path prefixes.");

    let firstDistinctPrefixesPromise = Coyote.Comparison.getDistinctPrefixes(firstTabBodyLines);
    let secondDistinctPrefixesPromise = Coyote.Comparison.getDistinctPrefixes(secondTabBodyLines);

    $.when(firstDistinctPrefixesPromise, secondDistinctPrefixesPromise).done(function(firstDistinctPrefixes, secondDistinctPrefixes) {

      Coyote.Comparison.mergeDistinctPrefixes(firstDistinctPrefixes, secondDistinctPrefixes).done(function(mergedDistinctPrefixes) {

        // Collate the output.
        // After collation, both arrays are guaranteed to have the same number of items.
        let firstCollatedOutputPromise = Coyote.Comparison.collateOutput(firstTabBodyLines, mergedDistinctPrefixes);
        let secondCollatedOutputPromise = Coyote.Comparison.collateOutput(secondTabBodyLines, mergedDistinctPrefixes);

        $.when(firstCollatedOutputPromise, secondCollatedOutputPromise).done(function(firstCollatedOutput, secondCollatedOutput) {

          // Synchronize fields from both collated output items.
          Coyote.Comparison.synchronizeCollatedOutput(firstCollatedOutput, secondCollatedOutput).done(function(combinedFlatOutput) {

            result.resolve({
              combinedFlatOutput: combinedFlatOutput,
              mergedDistinctPrefixes: mergedDistinctPrefixes
            });

          }).fail(function(errorMessage) {
            result.reject(errorMessage);
          });;
        }).fail(function(errorMessage) {
          result.reject(errorMessage);
        });
      }).fail(function(errorMessage) {
        result.reject(errorMessage);
      });
    }).fail(function(errorMessage) {
      result.reject(errorMessage);
    });
  }, 0);

  return result.promise();
}

// Gets an array of distinct text element path prefixes.
// This method assumes ordered input.
Coyote.Comparison.getDistinctPrefixes = function(lines) {

  let result = new $.Deferred();

  setTimeout(function() {

    let distinctPrefixes = [];

    let previousPrefix = null;
    for(let index = 0; index < lines.length; index++) {

      let line = lines[index];
      let prefix = line.substring(0, line.indexOf(":"));

      if(prefix !== previousPrefix) {
        distinctPrefixes.push(prefix);
      }

      previousPrefix = prefix;
    }

    result.resolve(distinctPrefixes);
  }, 0);

  return result.promise();
}

// Merges differences between the two path prefix arrays.
Coyote.Comparison.mergeDistinctPrefixes = function(firstDistinctPrefixes, secondDistinctPrefixes) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Merging distinct taxonomic path prefixes.");

    let sequenceMatcher = new difflib.SequenceMatcher(null, firstDistinctPrefixes, secondDistinctPrefixes, false);
    let opcodes = sequenceMatcher.getOpcodes();

    for(let opcodeIndex = opcodes.length - 1; opcodeIndex > -1 ; opcodeIndex--) {

      let opcodeSegment = opcodes[opcodeIndex];

      if(opcodeSegment[0] === "delete") {

        // Insert elements from the first array into the second.
        let firstSubarray = firstDistinctPrefixes.slice(opcodeSegment[1], opcodeSegment[2]);
        Coyote.Common.insertArrayElements(secondDistinctPrefixes, firstSubarray, opcodeSegment[3]);
      }
      else if(opcodeSegment[0] === "insert") {

        // Insert elements from the second array into the first.
        let secondSubarray = secondDistinctPrefixes.slice(opcodeSegment[3], opcodeSegment[4]);
        Coyote.Common.insertArrayElements(firstDistinctPrefixes, secondSubarray, opcodeSegment[1]);
      }
      else if(opcodeSegment[0] === "replace") {

        // Insert elements from the first array into the second and vice versa.
        let firstSubarray = firstDistinctPrefixes.slice(opcodeSegment[1], opcodeSegment[2]);
        let secondSubarray = secondDistinctPrefixes.slice(opcodeSegment[3], opcodeSegment[4]);
        Coyote.Common.insertArrayElements(secondDistinctPrefixes, firstSubarray, opcodeSegment[3]);
        Coyote.Common.insertArrayElements(firstDistinctPrefixes, secondSubarray, opcodeSegment[2]);
      }
    }

    result.resolve(firstDistinctPrefixes);
  }, 0);

  return result.promise();
}

// Produces collated output.
Coyote.Comparison.collateOutput = function(lines, distinctPrefixes) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Collating output.");

    Coyote.Comparison.mapValuesToDistinctPrefixes(distinctPrefixes, lines).done(function(distinctPrefixValueMap) {

      Coyote.Comparison.buildValueTree(distinctPrefixValueMap).done(function(valueTree) {

        result.resolve(valueTree);

      }).fail(function(errorMessage) {
        result.fail(errorMessage);
      });
    }).fail(function(errorMessage) {
      result.fail(errorMessage);
    });
  }, 0);

  return result.promise();
}

// Maps each text value to a distinct prefix.
Coyote.Comparison.mapValuesToDistinctPrefixes = function(distinctPrefixes, lines) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Mapping values to distinct taxonomic prefixes.");

    let distinctPrefixLineMap = [];
    let lineIndex = 0;

    for(let distinctPrefixIndex = 0; distinctPrefixIndex < distinctPrefixes.length; distinctPrefixIndex++) {

      let distinctPrefix = distinctPrefixes[distinctPrefixIndex];

      distinctPrefixLineMap.push({
        distinctPrefix: distinctPrefix,
        values: []
      });

      let continueIteration = true;
      while(continueIteration) {

        if(lineIndex < lines.length) {

          let line = lines[lineIndex];
          let indexOfValueSeparator = line.indexOf(":");
          let linePrefix = line.substring(0, indexOfValueSeparator);

          if(distinctPrefix === linePrefix) {
            distinctPrefixLineMap[distinctPrefixIndex].values.push(line.substring(indexOfValueSeparator + 1));
            lineIndex++;
          }
          else {
            continueIteration = false;
          }
        }
        else {
          continueIteration = false;
        }
      }
    }

    result.resolve(distinctPrefixLineMap);
  }, 0);

  return result.promise();
}

// Converts a flat value data structure into a tree data structure.
Coyote.Comparison.buildValueTree = function(distinctPrefixValueMap) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Building value tree.");

    let valueTree = [];

    for(let index = 0; index < distinctPrefixValueMap.length; index++) {

      let distinctPrefixComponents = distinctPrefixValueMap[index].distinctPrefix.substring(1).split("/");
      let values = distinctPrefixValueMap[index].values;

      Coyote.Comparison.buildValueTreeHelper(distinctPrefixComponents, values, valueTree, null, "");
    }

    result.resolve(valueTree);
  }, 0);

  return result.promise();
}

// Recursive helper function to convert a flat value data structure into a tree data structure.
Coyote.Comparison.buildValueTreeHelper = function(distinctPrefixComponents, values, valueTree, parentNode, nodePath) {

  let isLeafNode = false, createChildNode = true;

  if(distinctPrefixComponents.length > 0) {

    for(let index = 0 ; index < valueTree.length; index++) {

      if(distinctPrefixComponents[0] === valueTree[index].distinctPrefixComponent) {

        let subsequentDistinctPrefixComponents = distinctPrefixComponents.splice(1, distinctPrefixComponents.length);
        createChildNode = Coyote.Comparison.buildValueTreeHelper(subsequentDistinctPrefixComponents, values, valueTree[index].childNodes, valueTree[index], valueTree[index].nodePath);
        break;
      }
    }

    if(createChildNode) {

      let subsequentDistinctPrefixComponents = distinctPrefixComponents.splice(1, distinctPrefixComponents.length);
      let distinctPrefixComponent = distinctPrefixComponents[0];

      let childNode = {
        nodeID: Coyote.Common.generateUUID(),
        nodePath: nodePath + "/" + distinctPrefixComponent,
        distinctPrefixComponent: distinctPrefixComponent,
        parentNode: parentNode,
        childNodes: [],
        siblingNodes: null,
        values: null,
      };

      valueTree.push(childNode);

      if(Coyote.Comparison.buildValueTreeHelper(subsequentDistinctPrefixComponents, values, childNode.childNodes, childNode, childNode.nodePath)) {

        // This is a leaf node.
        childNode.childNodes = null;
        childNode.values = values;
      }
    }
  }
  else {
    isLeafNode = true;
  }

  return isLeafNode;
}

// Synchronizes fields between sibling elements of the two trees.
Coyote.Comparison.synchronizeCollatedOutput = function(firstCollatedOutput, secondCollatedOutput) {

  let result = new $.Deferred();

  console.log("Synchronizing collated output.");

  let firstFlatOutputPromise = Coyote.Comparison.normalizeCollatedOutputHelper(firstCollatedOutput);
  let secondFlatOutputPromise = Coyote.Comparison.normalizeCollatedOutputHelper(secondCollatedOutput);

  $.when(firstFlatOutputPromise, secondFlatOutputPromise).done(function(firstFlatOutput, secondFlatOutput) {

    let firstAssignedSiblingsPromise = Coyote.Comparison.assignSiblingNodes(firstFlatOutput);
    let secondAssignedSiblingsPromise = Coyote.Comparison.assignSiblingNodes(secondFlatOutput);

    $.when(firstAssignedSiblingsPromise, secondAssignedSiblingsPromise).done(function() {

      Coyote.Comparison.removeIdenticalItems(firstFlatOutput, secondFlatOutput).done(function() {

        Coyote.Comparison.setEmptyValuePlaceholders(firstFlatOutput, secondFlatOutput).done(function() {

          result.resolve({
            firstFlatOutput: firstFlatOutput,
            secondFlatOutput: secondFlatOutput
          });

        }).fail(function(errorMessage) {
          result.reject(errorMessage);
        });
      }).fail(function(errorMessage) {
        result.reject(errorMessage);
      });
    }).fail(function(errorMessage) {
      result.reject(errorMessage);
    });
  }).fail(function(errorMessage) {
    result.reject(errorMessage);
  });

  return result.promise();
}

// Normalizes the collated output.
Coyote.Comparison.normalizeCollatedOutputHelper = function(collatedOutput) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Normalizing collated output.");

    let traversedOutput = [];
    Coyote.Comparison.traverseCollatedOutput(collatedOutput, 0, traversedOutput);
    Coyote.Comparison.flattenTraversedOutput(traversedOutput, 0);

    result.resolve(traversedOutput);
  }, 0);

  return result.promise();
}

// Ignore superflous layers of the tree to determine the relative depth of each leaf node.
Coyote.Comparison.traverseCollatedOutput = function(collatedOutput, relativeDepth, traversedOutput) {

  for(let index = 0; index < collatedOutput.length; index++) {

    let dataElement = collatedOutput[index];

    if(dataElement.childNodes === null) {

      // This is a leaf node.
      traversedOutput.push({
        relativeDepth: relativeDepth,
        dataElement: dataElement
      });
    }
    else {
      Coyote.Comparison.traverseCollatedOutput(dataElement.childNodes, relativeDepth + 1, traversedOutput);
    }
  }
}

// Produce a flat representation of the tree.
Coyote.Comparison.flattenTraversedOutput = function(traversedOutput, iteration) {

  let lowestRelativeDepth = Infinity;

  for(let index = 0; index < traversedOutput.length; index++) {

    let currentRelativeDepth = traversedOutput[index].relativeDepth;

    if(currentRelativeDepth > iteration && currentRelativeDepth < lowestRelativeDepth) {
      lowestRelativeDepth = currentRelativeDepth;
    }
  }

  for(let index = 0; index < traversedOutput.length; index++) {

    let currentRelativeDepth = traversedOutput[index].relativeDepth;

    if(currentRelativeDepth >= lowestRelativeDepth) {
      traversedOutput[index].relativeDepth = currentRelativeDepth - lowestRelativeDepth + iteration;
    }
  }

  if(lowestRelativeDepth < Infinity) {
    Coyote.Comparison.flattenTraversedOutput(traversedOutput, iteration + 1);
  }
}

// Identifies and assigns sibling nodes to each node.
Coyote.Comparison.assignSiblingNodes = function(flatOutput) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Assigning sibling nodes.");

    for(let index = 0; index < flatOutput.length; index++) {

      let siblingNodes = [];

      let flatOutputItem = flatOutput[index];
      let currentNode = flatOutputItem.dataElement;

      let intermediateChildNode = null;
      let siblingNodePath = currentNode.distinctPrefixComponent;
      let parentNode = currentNode.parentNode;

      if(parentNode !== null) {

        // Walk up the tree until the first divergent path is found.
        while(parentNode.childNodes.length === 1 && parentNode.parentNode != null) {

          intermediateChildNode = parentNode;
          siblingNodePath =  parentNode.distinctPrefixComponent + "/" + siblingNodePath;
          parentNode = parentNode.parentNode;
        }

        // Walk down the other sibling paths until the leaf is found.
        // Compare the paths to determine the sibling relationship between the original node and each potential sibling.
        for(let otherSiblingIndex = 0; otherSiblingIndex < parentNode.childNodes.length; otherSiblingIndex++) {

          let otherSibling = parentNode.childNodes[otherSiblingIndex];
          if(otherSibling !== intermediateChildNode) {

            let otherSiblingNodePath = otherSibling.distinctPrefixComponent;

            while(otherSibling.childNodes !== null) {
              otherSibling = otherSibling.childNodes[0];
              otherSiblingNodePath = otherSiblingNodePath + "/" + otherSibling.distinctPrefixComponent;
            }

            // Siblings have identical paths after the point of divergence from their common ancestor.
            if(siblingNodePath.substring(siblingNodePath.indexOf("/") + 1) === otherSiblingNodePath.substring(otherSiblingNodePath.indexOf("/") + 1)) {
              siblingNodes.push(otherSibling);
            }
          }
        }
      }

      currentNode.siblingNodes = siblingNodes;
    }

    result.resolve();
  }, 0);

  return result.promise();
}

// Removes identical items within sibling groups, and removes entire flat output columns if no distinct fields are present.
Coyote.Comparison.removeIdenticalItems = function(firstFlatOutput, secondFlatOutput)  {

  let result = new $.Deferred();

  if(Coyote.Comparison.preserveIdenticalFields() === false) {

    console.log("Removing identical items.");

    Coyote.Comparison.removeEqualValues(firstFlatOutput, secondFlatOutput).done(function() {

      let removedFlatOutputIndexes = {};

      // Both arrays are guaranteed to have the same number of items.
      for(let flatOutputIndex = 0; flatOutputIndex < firstFlatOutput.length; flatOutputIndex++) {

        // Create a grouping of siblings.
        let allSiblings = Coyote.Comparison.bundleSiblings(firstFlatOutput, secondFlatOutput, flatOutputIndex);

        // Determine the number of values in the current grouping.
        let valueCount = Coyote.Comparison.getValueCount(allSiblings);

        if(valueCount > 0) {

          // Find different values that occur across all siblings.
          let preservedValueIndexes = Coyote.Comparison.getPreservedValueIndexes(allSiblings, valueCount);

          // Remove identical items within each sibling group.
          if(Object.keys(preservedValueIndexes).length > 0) {
            Coyote.Comparison.removeUnpreservedValueIndexes(allSiblings, preservedValueIndexes);
          }
          else {
            removedFlatOutputIndexes[flatOutputIndex] = true;
          }
        }
        else {
          removedFlatOutputIndexes[flatOutputIndex] = true;
        }
      }

      // Remove entire flat output columns if no distinct fields are present.
      if(Object.keys(removedFlatOutputIndexes).length > 0) {
        for(let flatOutputIndex = firstFlatOutput.length - 1; flatOutputIndex > -1 ; flatOutputIndex--) {
          if(removedFlatOutputIndexes[flatOutputIndex] === true) {

            Coyote.Common.removeArrayElements(firstFlatOutput, flatOutputIndex, flatOutputIndex + 1);
            Coyote.Common.removeArrayElements(secondFlatOutput, flatOutputIndex, flatOutputIndex + 1);
          }
        }
      }

      result.resolve();

    }).fail(function(errorMessage) {
      Coyote.Common.displayErrorMessage(errorMessage);
    });
  }
  else {

    console.log("Identical items will be preserved.");

    result.resolve();
  }

  return result.promise();
}

// Helper function to get the value of the preserveIdenticalFields query string parameter.
Coyote.Comparison.preserveIdenticalFields = function() {

  // Get the URL query string parameters.
  let queryStringParameters = Coyote.Common.parseURLQueryString(window.location.toString());

  let preserveIdenticalFields = $.trim(Coyote.Common.getQueryStringParameterValue(queryStringParameters, "preserveIdenticalFields"));
  preserveIdenticalFields = (preserveIdenticalFields.toLowerCase() === "true" ? true : false);

  return preserveIdenticalFields;
}

// Removes equal values.
Coyote.Comparison.removeEqualValues = function(firstFlatOutput, secondFlatOutput) {

  let result = new $.Deferred();

  setTimeout(function() {

    let removedFlatOutputIndexes = {};

    // Both arrays are guaranteed to have the same number of items.
    for(let flatOutputIndex = 0; flatOutputIndex < firstFlatOutput.length; flatOutputIndex++) {

      let firstValues = firstFlatOutput[flatOutputIndex].dataElement.values;
      let secondValues = secondFlatOutput[flatOutputIndex].dataElement.values;

      let sequenceMatcher = new difflib.SequenceMatcher(null, firstValues, secondValues, false);
      let opcodes = sequenceMatcher.getOpcodes();

      for(let opcodeIndex = opcodes.length - 1; opcodeIndex > -1 ; opcodeIndex--) {

        let opcodeSegment = opcodes[opcodeIndex];

        if(opcodeSegment[0] === "equal") {

          Coyote.Common.removeArrayElements(firstValues, opcodeSegment[1], opcodeSegment[2]);
          Coyote.Common.removeArrayElements(secondValues, opcodeSegment[3], opcodeSegment[4]);
        }
      }

      if(firstValues.length === 0 && secondValues.length === 0) {
        removedFlatOutputIndexes[flatOutputIndex] = true;
      }
    }

    // Remove entire flat output columns if no distinct fields are present.
    if(Object.keys(removedFlatOutputIndexes).length > 0) {
      for(let flatOutputIndex = firstFlatOutput.length - 1; flatOutputIndex > -1 ; flatOutputIndex--) {
        if(removedFlatOutputIndexes[flatOutputIndex] === true) {

          Coyote.Common.removeArrayElements(firstFlatOutput, flatOutputIndex, flatOutputIndex + 1);
          Coyote.Common.removeArrayElements(secondFlatOutput, flatOutputIndex, flatOutputIndex + 1);
        }
      }
    }

    result.resolve();
  }, 0);

  return result.promise();
}

// Helper function to bundle the siblings from both flat output collections.
Coyote.Comparison.bundleSiblings = function(firstFlatOutput, secondFlatOutput, flatOutputIndex) {

  let allSiblings = [];

  allSiblings.push(firstFlatOutput[flatOutputIndex].dataElement);
  Coyote.Common.insertArrayElements(allSiblings, firstFlatOutput[flatOutputIndex].dataElement.siblingNodes, allSiblings.length);

  allSiblings.push(secondFlatOutput[flatOutputIndex].dataElement);
  Coyote.Common.insertArrayElements(allSiblings, secondFlatOutput[flatOutputIndex].dataElement.siblingNodes, allSiblings.length);

  return allSiblings;
}

// Determine the number of values in the current sibling grouping.
Coyote.Comparison.getValueCount = function(allSiblings) {

  // Within each group, each siblings is guaranteed to have either zero values or exactly N values.
  // It is also guaranteed that at least one sibling in the group will have N values, i.e. one or more siblings will have a non-empty collection of values.

  let valueCount = 0;

  for(let siblingIndex = 0; siblingIndex < allSiblings.length; siblingIndex++) {

    if(allSiblings[siblingIndex].values.length > valueCount) {
      valueCount = allSiblings[siblingIndex].values.length;
    }
  }

  return valueCount;
}

// Finds different values that occur across all siblings.
Coyote.Comparison.getPreservedValueIndexes = function(allSiblings, valueCount) {

  let preservedValueIndexes = [];

  for(let valueIndex = 0; valueIndex < valueCount; valueIndex++) {

    let previousValue = null;
    for(let siblingIndex = 0; siblingIndex < allSiblings.length; siblingIndex++) {

      let sibling = allSiblings[siblingIndex];

      if(sibling.values.length > 0) {

        if(previousValue === null) {
          previousValue = sibling.values[valueIndex];
        }
        else if (previousValue !== sibling.values[valueIndex]) {

          // Different values were found.  Preserve this index.
          preservedValueIndexes[valueIndex] = true;
          break;
        }
      }
      else if(previousValue !== null) {
        // Different values were found.  Preserve this index.
        preservedValueIndexes[valueIndex] = true;
        break;
      }
    }
  }

  return preservedValueIndexes;
}

// Helper function to remove unpreserved value indexes.
Coyote.Comparison.removeUnpreservedValueIndexes = function(allSiblings, preservedValueIndexes) {

  for(let siblingIndex = 0; siblingIndex < allSiblings.length; siblingIndex++) {

    let sibling = allSiblings[siblingIndex];

    for(let valueIndex = sibling.values.length - 1; valueIndex > -1; valueIndex--) {
      if(preservedValueIndexes[valueIndex] !== true) {
        Coyote.Common.removeArrayElements(sibling.values, valueIndex, valueIndex + 1);
      }
    }
  }
}

// Helper function to set empty value placeholders.
Coyote.Comparison.setEmptyValuePlaceholders = function(firstFlatOutput, secondFlatOutput)  {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Setting empty value placeholders.");

    for(let flatOutputIndex = 0; flatOutputIndex < firstFlatOutput.length; flatOutputIndex++) {

      let firstValues = firstFlatOutput[flatOutputIndex].dataElement.values;
      let secondValues = secondFlatOutput[flatOutputIndex].dataElement.values;

      if(firstValues.length < secondValues.length) {

        let valueCountDifference = secondValues.length - firstValues.length;
        Coyote.Common.insertArrayElements(firstValues, Array(valueCountDifference).fill("empty"), firstValues.length);
      }
      else if(firstValues.length > secondValues.length) {

        let valueCountDifference = firstValues.length - secondValues.length;
        Coyote.Common.insertArrayElements(secondValues, Array(valueCountDifference).fill("empty"), secondValues.length);
      }
    }

    result.resolve();

  }, 0);

  return result.promise();
}

// Display the output.
Coyote.Comparison.displayOutput = function(combinedStoredTabData, differenceAlgorithmOutput, calculationTime) {

  let result = new $.Deferred();

  setTimeout(function() {

    console.log("Displaying output.");

    Coyote.Comparison.findRelativeDepthBounds(differenceAlgorithmOutput.combinedFlatOutput.firstFlatOutput).done(function(relativeDepthBounds) {

      Coyote.Comparison.getPreservedColumnRelativeDepths(relativeDepthBounds, differenceAlgorithmOutput.combinedFlatOutput).done(function(preservedColumnRelativeDepths) {

        let firstTabOutputContainer = $("#first-tab-output-container");
        let secondTabOutputContainer = $("#second-tab-output-container");

        Coyote.Comparison.buildOutputHeading(firstTabOutputContainer, combinedStoredTabData.firstTabData, 1);
        Coyote.Comparison.buildOutputHeading(secondTabOutputContainer, combinedStoredTabData.secondTabData, 2);

        Coyote.Comparison.buildOutputTable(firstTabOutputContainer, differenceAlgorithmOutput.combinedFlatOutput.firstFlatOutput, relativeDepthBounds, preservedColumnRelativeDepths);
        Coyote.Comparison.buildOutputTable(secondTabOutputContainer, differenceAlgorithmOutput.combinedFlatOutput.secondFlatOutput, relativeDepthBounds, preservedColumnRelativeDepths);

        // Set equal heights for all matching values cells.
        Coyote.Comparison.setValuesCellsSameSize();

        // Add highlighting.
        Coyote.Comparison.addHighlighting();

        // Add tooltips.
        Coyote.Comparison.addTooltips();

        // Add the reload button.
        Coyote.Comparison.addReloadButton();

        // Set relative heights for the various container elements.
        Coyote.Comparison.setContainerHeights();

        // Synchronize scrolling between the two output table containers.
        Coyote.Comparison.synchronizeScrolling();

        // Build the tech stats section.
        Coyote.Comparison.buildTechStatsSection(differenceAlgorithmOutput.mergedDistinctPrefixes, calculationTime);

        result.resolve();

      }).fail(function(errorMessage) {
        result.reject(errorMessage);
      });
    }).fail(function(errorMessage) {
      result.reject(errorMessage);
    });
  }, 0);

  return result.promise();
}

// Helper function to find columns that have content.
Coyote.Comparison.getPreservedColumnRelativeDepths = function(relativeDepthBounds, combinedFlatOutput) {

  let result = new $.Deferred();

  setTimeout(function() {

    let preservedColumnRelativeDepths = {};

    for(let flatOutputIndex = 0; flatOutputIndex < combinedFlatOutput.firstFlatOutput.length; flatOutputIndex++) {

      for(let tableColumnIndex = relativeDepthBounds.lowerRelativeDepth; tableColumnIndex < relativeDepthBounds.upperRelativeDepth; tableColumnIndex++) {

        let flatOutputItem = combinedFlatOutput.firstFlatOutput[flatOutputIndex];

        for(let tableColumnIndex = relativeDepthBounds.lowerRelativeDepth; tableColumnIndex < relativeDepthBounds.upperRelativeDepth; tableColumnIndex++) {

          if(flatOutputItem.relativeDepth === tableColumnIndex) {
            preservedColumnRelativeDepths[tableColumnIndex] = true;
          }
        }
      }
    }

    result.resolve(preservedColumnRelativeDepths);
  }, 0);

  return result.promise();
}

// Builds an output heading detail section.
Coyote.Comparison.buildOutputHeading = function(tabOutputContainer, tabData, tabNumber) {

  let tabOutputHeadingContainer = $("<div>")
  .addClass("tab-output-heading-container");

  let tabHostnameValue = new URL(tabData.tabURL).hostname;

  let tabOutputIconImage = $("<img>")
  .addClass("tab-output-icon-image")
  .attr("src", Coyote.Common.getFavIconUrl(tabData.tabFavIconURL))
  .attr("title", tabHostnameValue)
  .attr("alt", tabHostnameValue);

  let tabOutputHeadingText = $("<span>")
  .addClass("tab-output-heading-text")
  .text("Output from Tab " + tabNumber);

  let tabOutputHeading = $("<h2>")
  .addClass("tab-output-heading")
  .append(tabOutputIconImage)
  .append(tabOutputHeadingText);

  tabOutputIconImage.on("load", function() {
    let rightMargin = $(this).width() + 16;
    tabOutputHeadingText.css("margin-right", rightMargin + "px");
  });

  tabOutputHeadingContainer.append(tabOutputHeading);

  let tabOutputTitle = $("<span>")
  .addClass("tab-output-title")
  .attr("title", tabData.tabTitle)
  .text(Coyote.Common.truncate(tabData.tabTitle, 100));

  let tabOutputHostname = $("<span>")
  .addClass("tab-output-hostname")
  .attr("title", tabHostnameValue)
  .text(tabHostnameValue);

  let tabOutputSubheading = $("<div>")
  .addClass("tab-output-subheading")
  .append(tabOutputTitle)
  .append("<br>")
  .append(tabOutputHostname);

  tabOutputHeadingContainer.append(tabOutputSubheading)

  tabOutputContainer.append(tabOutputHeadingContainer);
}

// Builds an output tables.
Coyote.Comparison.buildOutputTable = function(parentContainer, flatOutput, relativeDepthBounds, preservedColumnRelativeDepths) {

  let outputTableContainer = $("<div>")
  .addClass("output-table-container");

  let outputTable = $("<table>")
  .addClass("output-table");
  outputTableContainer.append(outputTable);

  for(let flatOutputIndex = 0; flatOutputIndex < flatOutput.length; flatOutputIndex++) {

    let outputTableRow = $("<tr>")
    .addClass("output-table-row")
    .addClass("output-table-row-" + flatOutputIndex);
    outputTable.append(outputTableRow);

    let flatOutputItem = flatOutput[flatOutputIndex];

    for(let tableColumnIndex = relativeDepthBounds.lowerRelativeDepth; tableColumnIndex < relativeDepthBounds.upperRelativeDepth; tableColumnIndex++) {

      if(preservedColumnRelativeDepths[tableColumnIndex] === true) {

        let outputTableColumn = $("<td>")
        .addClass("output-table-column")
        .addClass("output-table-column-" + tableColumnIndex);
        outputTableRow.append(outputTableColumn);

        if(flatOutputItem.relativeDepth === tableColumnIndex) {

          let valuesTable = $("<table>")
          .addClass("values-table")
          .addClass("values-table-" + flatOutputIndex + "-" + tableColumnIndex);

          let valuesTableHeaderRow = $("<tr>")
          .addClass("values-table-header-row")
          valuesTable.append(valuesTableHeaderRow);

          let valuesTableInfoIcon = $("<img>")
          .addClass("values-table-info-icon")
          .addClass("values-table-info-icon-tooltip")
          .attr("src", "../../images/info-icon-16px.png")
          .attr("title", "Taxonomic path:<br>" + flatOutputItem.dataElement.nodePath);

          let valuesTableHeaderCell = $("<td>")
          .addClass("values-table-header-cell")
          .attr("colspan", flatOutputItem.dataElement.values.length)
          .append(valuesTableInfoIcon);
          valuesTableHeaderRow.append(valuesTableHeaderCell);

          for(let valuesIndex = 0; valuesIndex < flatOutputItem.dataElement.values.length; valuesIndex++) {

            let valuesRow = $("<tr>")
            .addClass("values-row")
            .addClass("values-row-" + flatOutputIndex + "-" + tableColumnIndex + "-" + valuesIndex);
            valuesTable.append(valuesRow);

            let valuesCell = $("<td>")
            .addClass("values-cell")
            .addClass("values-cell-" + flatOutputIndex + "-" + tableColumnIndex + "-" + valuesIndex)
            .text(flatOutputItem.dataElement.values[valuesIndex]);
            valuesRow.append(valuesCell);
          }

          outputTableColumn.append(valuesTable);
        }
      }
    }
  }

  parentContainer.append(outputTableContainer);
}

// Helper function to find relative depth bounds.
Coyote.Comparison.findRelativeDepthBounds = function(flatOutput) {

  let result = new $.Deferred();

  setTimeout(function() {

    let lowerRelativeDepth = Infinity;
    let upperRelativeDepth = 0;

    for(let index = 0; index < flatOutput.length; index++) {

      let relativeDepth = flatOutput[index].relativeDepth;

      if(relativeDepth < lowerRelativeDepth) {
        lowerRelativeDepth = relativeDepth;
      }

      if(relativeDepth > upperRelativeDepth) {
        upperRelativeDepth = relativeDepth;
      }
    }

    // Increment the upper relative depth so that it is used as an exclusive bound in calculations, not as an inclusive bound.
    upperRelativeDepth++;

    result.resolve({
      lowerRelativeDepth: lowerRelativeDepth,
      upperRelativeDepth: upperRelativeDepth
    });

  }, 0);

  return result.promise();
}

// Sets each matching values cell to the same height.
Coyote.Comparison.setValuesCellsSameSize = function(valuesCellClassNames) {

  let result = new $.Deferred();

  setTimeout(function() {

    Coyote.Comparison.getValuesCellClassNames().done(function(valuesCellClassNames) {

      // Set equal heights for all matching values cells.
      Coyote.Comparison.setValuesCellsSameSizeHelper(valuesCellClassNames);

      // Register a listener to resize the output tables when the window is resized.
      $(window).resize(function() {
        Coyote.Comparison.setValuesCellsSameSizeHelper(valuesCellClassNames);
      });

      result.resolve();
    }).fail(function(errorMessage) {
      result.reject(errorMessage);
    });
  }, 0);

  return result.promise();
}

// Helper function to set each matching values cell to the same height.
Coyote.Comparison.setValuesCellsSameSizeHelper = function(valuesCellClassNames) {

  let result = new $.Deferred();

  setTimeout(function() {

    // Set each matching values cell to the same height.
    for(let index = 0; index < valuesCellClassNames.length; index++) {
      Coyote.Comparison.setSameHeight(valuesCellClassNames[index]);
    }

    result.resolve();
  }, 0);

  return result.promise();
}

// Helper function to get the values cells class names.
Coyote.Comparison.getValuesCellClassNames = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    let valuesCellClassNames = [];

    $("#first-tab-output-container .values-cell").each(function(valuesCellIndex, valuesCell) {
      Coyote.Common.insertArrayElements(valuesCellClassNames, Coyote.Common.getClassNamesWithPrefix(valuesCell, "values-cell-"), valuesCellClassNames.length);
    });

    result.resolve(valuesCellClassNames);
  }, 0);

  return result.promise();
}

// Sets all selected elements to the same height.
Coyote.Comparison.setSameHeight = function(className) {

  let result = new $.Deferred();

  setTimeout(function() {

    let valuesCells = $("." + className);

    let tallest = 0, currentHeight = 0;

    valuesCells.each(function() {
      currentHeight = $(this).height();
      tallest = currentHeight > tallest ? currentHeight : tallest;
    })
    .height(tallest);

    result.resolve();
  }, 0);

  return result.promise();
}

// Adds dynamic highlighting to the table cells, rows, and columns.
Coyote.Comparison.addHighlighting = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    // Add values cell highlighting.
    $(".values-cell").hover(function() {
      let matchingValuesCellClassName = Coyote.Common.getClassNamesWithPrefix(this, "values-cell-")[0];
      $("." + matchingValuesCellClassName).toggleClass("highlighted-values-cell");
    });

    // Add active table column highlighting.
    $(".output-table-column").hover(function() {
      let matchingOutputTableColumnClassName = Coyote.Common.getClassNamesWithPrefix(this, "output-table-column-")[0];
      $("." + matchingOutputTableColumnClassName).toggleClass("highlighted-output-table-column");
    });

    // Add active table row highlighting.
    $(".output-table-row").hover(function() {
      let matchingOutputTableRowClassName = Coyote.Common.getClassNamesWithPrefix(this, "output-table-row-")[0];
      $("." + matchingOutputTableRowClassName).toggleClass("highlighted-output-table-row");
    });

    result.resolve();
  }, 0);

  return result.promise();
}

// Helper function to add tooltips.
Coyote.Comparison.addTooltips = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    $(".values-table-info-icon-tooltip").tooltipster({
      contentAsHTML: true,
      interactive: true
    });

    result.promise();
  }, 0);

  return result.promise();
}

// Helper function to add the reload button
Coyote.Comparison.addReloadButton = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    // Get the URL query string parameters.
    let fullURL = window.location.toString();
    let queryStringParameters = Coyote.Common.parseURLQueryString(fullURL);

    // Get the tab storage keys.
    let firstTabStorageKey = Coyote.Common.getQueryStringParameterValue(queryStringParameters, "firstTabStorageKey");
    let secondTabStorageKey = Coyote.Common.getQueryStringParameterValue(queryStringParameters, "secondTabStorageKey");

    let fullURLSansQueryString = fullURL.substring(0, fullURL.indexOf("?"));
    let reloadURL = fullURLSansQueryString + "?" + "firstTabStorageKey=" + firstTabStorageKey + "&" + "secondTabStorageKey=" + secondTabStorageKey;

    let reloadText = $("<h3>")
    .addClass("reload-text");

    let reloadButton = $("<button>")
    .attr("id", "reload-button");

    if(Coyote.Comparison.preserveIdenticalFields()) {
      reloadText.text("All Fields are Displayed Now");
      reloadButton.text("Reload and Hide Identical Fields");

      reloadButton.click(function() {
        window.location = reloadURL + "&" + "preserveIdenticalFields=false";
      });
    }
    else {
      reloadText.text("Only Different Fields are Displayed Now");
      reloadButton.text("Reload and Show All Fields");

      reloadButton.click(function() {
        window.location = reloadURL + "&" + "preserveIdenticalFields=true";
      });
    }

    $("#reload-button-container")
    .append(reloadText)
    .append(reloadButton);

    result.resolve();
  }, 0);

  return result.promise();
}

// Sets relative heights for the various container elements.
Coyote.Comparison.setContainerHeights = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    // Set relative heights for the various container elements.
    Coyote.Comparison.setContainerHeightsHelper();

    // Register a handler to set the relative heights for the various container elements when the wnidow is resized.
    $(window).resize(Coyote.Comparison.setContainerHeightsHelper);

    result.resolve();
  }, 0);

  return result.promise();
}

// Adjusts the height of the various container elements to fit all content in a single page.
Coyote.Comparison.setContainerHeightsHelper = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    let outputTables = $(".output-table");

    if(outputTables.height() > 600) {

      if($(window).width() < 1350) {

        $("#parent-tab-output-container").height($("#flexible-tab-output-container").outerHeight());
      }
      else {

        let parentTabOutputContainerHeight = Math.max($("body").height() - $("#heading-container").height(), 600);

        // Adjust the height of the various container elements to fit all content in a single page.
        $("#parent-tab-output-container").height(parentTabOutputContainerHeight);

        $(".output-table-container").each(function() {
          let outputTableContainer = $(this);
          outputTableContainer.height(outputTableContainer.closest(".tab-output-container").height() - outputTableContainer.prev(".tab-output-heading-container").height() - 40);
        });
      }
    }

    result.resolve();
  }, 0);

  return result.promise();
}

// Synchronize scrolling between the two output table containers.
Coyote.Comparison.synchronizeScrolling = function() {

  let result = new $.Deferred();

  setTimeout(function() {

    let outputTableContainers = $(".output-table-container");
    let firstOutputTableContainer = $(outputTableContainers.get(0));
    let secondOutputTableContainer = $(outputTableContainers.get(1));

    let scrolledContainer = null;

    firstOutputTableContainer.on("scroll", function(event) {
      if(scrolledContainer !== "second") {
        scrolledContainer = "first";
        secondOutputTableContainer.scrollTop(firstOutputTableContainer.scrollTop());
        secondOutputTableContainer.scrollLeft(firstOutputTableContainer.scrollLeft());
      }
      else {
        scrolledContainer = null;
      }
    });

    secondOutputTableContainer.on("scroll", function(event) {
      if(scrolledContainer !== "first") {
        scrolledContainer = "second";
        firstOutputTableContainer.scrollTop(secondOutputTableContainer.scrollTop());
        firstOutputTableContainer.scrollLeft(secondOutputTableContainer.scrollLeft());
      }
      else {
        scrolledContainer = null;
      }
    });

    result.resolve();
  }, 0);

  return result.promise();
}

// Builds the tech stats section.
Coyote.Comparison.buildTechStatsSection = function(mergedDistinctPrefixes, calculationTime) {

  let result = new $.Deferred();

  setTimeout(function() {

    let techStatsContainer = $("#tech-stats-container");

    let calculationTimeIcon = $("<img>")
    .addClass("calculation-time-icon")
    .attr("src", "../../images/stopwatch-icon-32px.png");

    let calculationTimeText = $("<span>")
    .addClass("calculation-time-text")
    .text("Calculation Time: " + calculationTime + "ms");

    let calculationTimeHeader = $("<h2>")
    .addClass("calculation-time-header")
    .append(calculationTimeIcon)
    .append(calculationTimeText);

    techStatsContainer.append(calculationTimeHeader);

    let toggleDistinctPrefixesButton = $("<button>")
    .attr("id", "toggle-distinct-prefixes-button")
    .text("Show Taxonomic Paths");
    techStatsContainer.append(toggleDistinctPrefixesButton);

    let distinctPrefixesListContainer = $("<div>")
    .attr("id", "distinct-prefixes-list-container")
    .css("display", "none");

    let distinctPrefixesListHeader = $("<h2>")
    .addClass("distinct-prefixes-list-header")
    .text("Taxonomic Paths:");
    distinctPrefixesListContainer.append(distinctPrefixesListHeader);

    let distinctPrefixesList = $("<ul>")
    .addClass("distinct-prefixes-list");
    distinctPrefixesListContainer.append(distinctPrefixesList);

    for(let index = 0; index < mergedDistinctPrefixes.length; index++) {

      let distinctPrefixesListItem = $("<li>")
      .addClass("distinct-prefixes-list-item")
      .text(mergedDistinctPrefixes[index]);

      distinctPrefixesList.append(distinctPrefixesListItem);
    }

    techStatsContainer.append(distinctPrefixesListContainer);

    toggleDistinctPrefixesButton.click(function() {

      if(distinctPrefixesListContainer.is(":visible")) {

        distinctPrefixesListContainer.slideToggle();

        toggleDistinctPrefixesButton.text("Show Taxonomic Paths");
      }
      else {
        distinctPrefixesListContainer.slideToggle("medium", function() {
          $("html, body").animate({
            scrollTop: $(this).offset().top
          }, 100);
        });

        toggleDistinctPrefixesButton.text("Hide Taxonomic Paths");
      }
    });

    result.resolve();
  }, 0);

  return result.promise();
}

// Perform initialization.
Coyote.Comparison.initialize();
