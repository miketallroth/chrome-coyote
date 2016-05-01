// Common variables and functions.

"use strict";

// Create the Coyote root namespace.
var Coyote = Coyote || {};

// Utility method for creating namespaces.
// Adapted from https://www.kenneth-truyers.net/2013/04/27/javascript-namespaces-and-modules/.
Coyote.createNamespace = function(namespace) {

	let namespaceParts = namespace.split(".");

	let parent = Coyote;

	// loop through the namespace parts and create a nested namespace if necessary.
	for (let index = 0; index < namespaceParts.length; index++) {

		let namespacePartName = namespaceParts[index];

		// Check if the current parent already has the namespace declared.  If not, create it.
		if (typeof parent[namespacePartName] === "undefined") {

			parent[namespacePartName] = {};
		}

		// Set the parent to the deepest element in the hierarchy so far.
		parent = parent[namespacePartName];
	}

	return parent;
};

// Create the Common namespace.
Coyote.createNamespace("Common");

// Helper function to get a valid favicon URL.
Coyote.Common.getFavIconUrl = function(originalFavIconUrl) {

	let actualFavIconUrl = $.trim(originalFavIconUrl);

	if(actualFavIconUrl.length === 0) {

		actualFavIconUrl = "../../images/chrome-icon-24px.png";
	}
	else if(actualFavIconUrl.indexOf("chrome") === 0) {

		actualFavIconUrl = "../../images/chrome-icon-24px.png";
	}

	return actualFavIconUrl;
}

// A regular expression that matches one or more whitespace characters.
Coyote.Common.whitespaceRegEx = new RegExp("\\s+", "g");

// A collection of non-standard text elements that should be ignored.
Coyote.Common.nonStandardElements = {

	iframe:   true,
	noscript: true,
	script:   true,
	style:    true
};

// Helper function for checking if an element is non-standard and should be ignored.
Coyote.Common.isNonStandardElement = function(elementName) {
	return Coyote.Common.nonStandardElements[$.trim(elementName).toLowerCase()] === true;
}

// A collection of elements that do not add meaningful structure to the HTML document.
Coyote.Common.ignoredElements = {

	/* Inline elements */
	/* https://developer.mozilla.org/en-US/docs/Web/HTML/Inline_elements#Elements */
	a:         true,
	abbr:      true,
	acronym:   true,
	b:         true,
	bdo:       true,
	big:       true,
	br:        true,
	button:    true,
	cite:      true,
	code:      true,
	dfn:       true,
	em:        true,
	i:         true,
	img:       true,
	input:     true,
	kbd:       true,
	label:     true,
	map:       true,
	object:    true,
	q:         true,
	samp:      true,
	select:    true,
	small:     true,
	script:    true,
	span:      true,
	strong:    true,
	sub:       true,
	sup:       true,
	textarea:  true,
	time:      true,
	tt:        true,
	var:       true,

	/* Inline text semantic elements */
	/* https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Inline_text_semantics */
	/* abbr:      true, *//* Element repeated above. */
	/* b:         true, *//* Element repeated above. */
	bdi:       true,
	/* bdo:       true, *//* Element repeated above. */
	/* br:        true, *//* Element repeated above. */
	/* cite:      true, *//* Element repeated above. */
	/* code:      true, *//* Element repeated above. */
	data:      true,
	/* dfn:       true, *//* Element repeated above. */
	/* em:        true, *//* Element repeated above. */
	/* i:         true, *//* Element repeated above. */
	/* kbd:       true, *//* Element repeated above. */
	mark:      true,
	/* q:         true, *//* Element repeated above. */
	rp:        true,
	rt:        true,
	rtc:       true,
	ruby:      true,
	s:         true,
	/* samp:      true, *//* Element repeated above. */
	/* small:     true, *//* Element repeated above. */
	/* span:      true, *//* Element repeated above. */
	/* strong:    true, *//* Element repeated above. */
	/* sub:       true, *//* Element repeated above. */
	/* sup:       true, *//* Element repeated above. */
	/* time:      true, *//* Element repeated above. */
	u:         true,
	/* var:       true, *//* Element repeated above. */
	wbr:       true,

	/* Obsolete and deprecated elements */
	/* https://developer.mozilla.org/en-US/docs/Web/HTML/Element#Obsolete_and_deprecated_elements */
	/* acronym:   true, *//* Element repeated above. */
	applet:    true,
	basefont:  true,
	/* big:       true, *//* Element repeated above. */
	blink:     true,
	center:    true,
	command:   true,
	content:   true,
	dir:       true,
	font:      true,
	frame:     true,
	frameset:  true,
	isindex:   true,
	keygen:    true,
	listing:   true,
	marquee:   true,
	noembed:   true,
	plaintext: true,
	spacer:    true,
	strike:    true,
	/* tt:        true, *//* Element repeated above. */
	xmp:       true
};

// Helper function for checking if an element should be ignored.
Coyote.Common.isIgnoredElement = function(elementName) {
	return Coyote.Common.ignoredElements[$.trim(elementName).toLowerCase()] === true;
}

// Text truncation function.
Coyote.Common.truncate = function(text, maxLength) {

	let truncatedText = text;

	if (text.length > maxLength) {

		truncatedText = $.trim(text)
		.substring(0, maxLength)
		.split(" ")
		.slice(0, -1)
		.join(" ");

		truncatedText = truncatedText + "...";
	}

	return truncatedText;
}

// UUID character vector.
Coyote.Common.generateUUIDCharacterVector = [
	"00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "0a", "0b", "0c", "0d", "0e", "0f",
	"10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "1a", "1b", "1c", "1d", "1e", "1f",
	"20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "2a", "2b", "2c", "2d", "2e", "2f",
	"30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "3a", "3b", "3c", "3d", "3e", "3f",
	"40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "4a", "4b", "4c", "4d", "4e", "4f",
	"50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5a", "5b", "5c", "5d", "5e", "5f",
	"60", "61", "62", "63", "64", "65", "66", "67", "68", "69", "6a", "6b", "6c", "6d", "6e", "6f",
	"70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "7a", "7b", "7c", "7d", "7e", "7f",
	"80", "81", "82", "83", "84", "85", "86", "87", "88", "89", "8a", "8b", "8c", "8d", "8e", "8f",
	"90", "91", "92", "93", "94", "95", "96", "97", "98", "99", "9a", "9b", "9c", "9d", "9e", "9f",
	"a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aa", "ab", "ac", "ad", "ae", "af",
	"b0", "b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "ba", "bb", "bc", "bd", "be", "bf",
	"c0", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "ca", "cb", "cc", "cd", "ce", "cf",
	"d0", "d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "da", "db", "dc", "dd", "de", "df",
	"e0", "e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8", "e9", "ea", "eb", "ec", "ed", "ee", "ef",
	"f0", "f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "f9", "fa", "fb", "fc", "fd", "fe", "ff"
];

// Generates a UUID.
// Adapted from http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript and http://jsfiddle.net/jcward/7hyaC/3/.
Coyote.Common.generateUUID = function() {

	let vector = Coyote.Common.generateUUIDCharacterVector;

	let digit1 = Math.random() * 0xffffffff | 0;
	let digit2 = Math.random() * 0xffffffff | 0;
	let digit3 = Math.random() * 0xffffffff | 0;
	let digit4 = Math.random() * 0xffffffff | 0;

	let segment1 = vector[digit1 & 0xff] + vector[digit1 >> 8 & 0xff] + vector[digit1 >> 16 & 0xff] + vector[digit1 >> 24 & 0xff];
	let segment2 = vector[digit2 & 0xff] + vector[digit2 >> 8 & 0xff];
	let segment3 = vector[digit2 >> 16 & 0x0f | 0x40] + vector[digit2 >> 24 & 0xff];
	let segment4 = vector[digit3 & 0x3f | 0x80] + vector[digit3 >> 8 & 0xff];
	let segment5 = vector[digit3 >> 16 & 0xff] + vector[digit3 >> 24 & 0xff] + vector[digit4 & 0xff] + vector[digit4 >> 8 & 0xff] + vector[digit4 >> 16 & 0xff] + vector[digit4 >> 24 & 0xff];

	return segment1 + "-" + segment2 + "-" + segment3 + "-" + segment4 + "-" + segment5;
}

// Parses a URL query string into key / value pairs.
Coyote.Common.parseURLQueryString = function(input) {

	let output = [];

	let inputURL = new URL(input);
	let queryString = inputURL.search;

	// Determine whether the URL has a query string.
	if(queryString !== undefined && queryString !== null && queryString.length > 0 && queryString.indexOf("?") === 0) {

		// Remove the leading question mark character.
		queryString = queryString.substring(1);

		// Iterate over each key / value pair.
		let keyValuePairs = queryString.split("&");
		for(let index = 0; index < keyValuePairs.length; index++) {

			// Separate each key and value.
			let keyValuePair = keyValuePairs[index].split("=");
			if(keyValuePair.length === 2) {

				// Store each key / value pair in the output array.
				output.push({
					key: decodeURIComponent(keyValuePair[0]),
					value: decodeURIComponent(keyValuePair[1])
				});
			}
		}
	}

	return output;
}

// Helper function for getting URL query string parameter value.
Coyote.Common.getQueryStringParameterValue = function(queryStringParameters, queryStringParameterName) {

  let queryStringParameterValue = null;

  for(let index = 0; index < queryStringParameters.length; index++) {
    let queryStringParameter = queryStringParameters[index];

    if(queryStringParameter.key === queryStringParameterName) {
      queryStringParameterValue = queryStringParameter.value;
    }
  }

  return queryStringParameterValue;
}

// Helper function for removing elements from an array.
Coyote.Common.removeArrayElements = function(array, startingIndex, endingIndex) {
	return array.splice(startingIndex, (endingIndex - startingIndex));
}

// Helper function for inserting elements into an array.
// Adapted from http://stackoverflow.com/questions/7032550/javascript-insert-an-array-inside-another-array.
Coyote.Common.insertArrayElements = function(originalArray, subarray, insertionIndex) {

	for(let index = 0; index < subarray.length; index++) {
			originalArray.splice((insertionIndex + index), 0, subarray[index]);
	}

	return originalArray;
}

Coyote.Common.equalArrays = function(firstArray, secondArray) {

	let equal = true;

	if(firstArray.length === secondArray.length) {
		for(let index = 0; index < firstArray.length; index++) {
			if(firstArray[index] !== secondArray[index]) {
				equal = false;
				break;
			}
		}
	}

	return equal;
}

// Helper function to get all class names that start with a given prefix.
Coyote.Common.getClassNamesWithPrefix = function(element, classNamePrefix) {

		let matchingClassNames = [];

		$(element).attr("class", function(attributeIndex, classAttributeValue) {

			let allClassNames = $.trim(classAttributeValue).split(Coyote.Common.whitespaceRegEx);
			$(allClassNames).each(function(classNameIndex, className) {

				if(className.indexOf(classNamePrefix) === 0) {
					matchingClassNames.push(className);
				}
			});
		});

		return matchingClassNames;
}

// Error handling routine.
Coyote.Common.displayErrorMessage = function(errorMessage) {

	console.error(errorMessage);

	let errorMessageHeader = $("<h1>")
	.addClass("error-message-header")
	.append("Sorry, an error has occurred.  Right-click on this message, then choose Inspect to check the Chrome developer console for more information.");

	let errorMessageImage = $("<img>")
	.addClass("error-message-image")
	.attr("src", "../images/error.png")
	.attr("alt", "That's all folks!");

	let errorMessageComtainer = $("<div>")
	.addClass("error-message-container")
	.append(errorMessageHeader)
	.append(errorMessageImage);

	$("body")
	.empty()
	.append(errorMessageComtainer);

	new Audio("../../audio/road-runner.wav").play();
}
