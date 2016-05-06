// This script implements the match process.

// Create the VisualComparison namespace.
Coyote.createNamespace("VisualComparison");
CVC = Coyote.VisualComparison;

CVC.whitespace = /^\s*$/;

CVC.fieldMap = {
    'IMG': 'src'
};

CVC.debugNum = 0;

/**
 * References to wrapper root DOM node.
 */
CVC.wrapper = null;

/**
 * Numeric index to do qo quick find of wrapper nodes.
 */
CVC.wrapperNodeStore = [];
CVC.wrapperNodeStoreCount = 0;

/**
 * References to sample root DOM nodes.
 */
CVC.samples = [];

/**
 * Numeric index to do qo quick find of sample nodes.
 */
CVC.sampleNodeStore = [];
CVC.sampleNodeStoreCount = 0;

/**
 * Enumeration of all inline element types
 */
CVC.inlineTypes = [
	"b", "big", "i", "small", "tt",
	"abbr", "acronym", "cite", "code", "dfn", "em", "kbd", "strong", "samp", "time", "var",
	"a", "bdo", "br", "img", "map", "object", "q", "script", "span", "sub", "sup",
	"button", "input", "label", "select", "textarea", "#text"
];




// can be used as next field num or as current field count
//CVC.nextFieldNum = 0;
CVC.nextPCDataNum = 0;


CVC.runDifferenceAlgorithm = function(combinedTabData) {
	
	var result = new $.Deferred();

	var heading = $("#heading");
	
	// get the content from the passed data
	var content1 = CVC.removeScripts(combinedTabData.firstTabData.tabBodyTextContent.textcontent);
	var content2 = CVC.removeScripts(combinedTabData.secondTabData.tabBodyTextContent.textcontent);
	
	// find the containers
	var sampleContainer1 = $("#first-tab-output-container");
	var sampleContainer2 = $("#second-tab-output-container");
	// insert the content into the containers
	sampleContainer1.append(content1);
	sampleContainer2.append(content2);

	// get a copy of the first content page as the wrapper
	var content0 = content1;
	// find the wrapper container
	var wrapperContainer = $("#wrapper-container");
	// insert the wrapper into the wrapper container
	wrapperContainer.append(content0);
	

	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	// convert over to numeric arrays instead of
	// textual variables
	
	// retain references to root nodes of samples
	CVC.samples = [
        sampleContainer1[0],
        sampleContainer2[0]
    ];
	CVC.wrapper = wrapperContainer[0];
	
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	
	
	// reduce extraneous information from each sample and the wrapper
	var i = 0;
    for (i=0; i<CVC.samples.length; i++) {
    	// force two adjacent texts into one
   	   	CVC.samples[i].normalize();
   	   	// remove all whitespace, and various non-handled nodes
   	   	CVC.compress('', CVC.samples[i], 0);
    }
    CVC.wrapper.normalize();
    CVC.compress('', CVC.wrapper, 0);
	
    //console.log('references to root nodes');
	//console.dir(CVC.wrapper);
	//console.dir(CVC.samples[0]);
	//console.dir(CVC.samples[1]);

	// pre-process the DOM tree of the wrapper and each sample
   	pageRootNodeId = CVC.preprocess(CVC.wrapperNodeStore, CVC.wrapper, 0, 0);
    for (i=0; i<CVC.samples.length; i++) {
    	pageRootNodeId = CVC.preprocess(CVC.sampleNodeStore, CVC.samples[i], 0, 0);
    }
    
    //CVC.showTree(CVC.wrapper);
    //CVC.showTree(CVC.samples[1]);
    
    //console.log('node stores');
	//console.dir(CVC.wrapperNodeStore);
	//console.dir(CVC.sampleNodeStore);

	//console.log('generalizing sample 1');
	var generalizeResult = CVC.match(
			CVC.wrapper,
			CVC.samples[1],
			true);
	//console.log('generalizing sample 0');
	var generalizeResult = CVC.match(
			CVC.wrapperNodeStore[CVC.wrapper.c_cid],
			CVC.sampleNodeStore[CVC.samples[0].c_cid],
			true);

    //CVC.showTree(CVC.wrapper);
    
	result.resolve();
	return result.promise();
    
};

/**
 * Preprocess an entire DOM tree.
 * @param store - the store where we will put quick reference ids
 * @param node - the node in focus right now
 * @param childNum - the index of this node in it's parent childNodes container
 * @param depth - the depth of this node from root
 */
CVC.preprocess = function(store, node, childNum, depth) {

	//console.dir(node);
    if (node.childNodes.length) {

        // process the children
        var current = node.firstChild;
        let currentChildNum = 0;
        while (current != null) {
            var childIndex = CVC.preprocess(store, current, currentChildNum, depth+1);
            current = current.nextSibling;
            currentChildNum++;
        }

        // process myself
        return CVC.preprocessNode(store, node, childNum, depth);

    } else {
        // process myself
        return CVC.preprocessNode(store, node, childNum, depth);
    }
}

/**
 * Preprocess individual node.
 * Add in reference information to help process the tree.
 * @param store - the store where we will put quick reference ids
 * @param node - the node in focus right now
 * @param childNum - the index of this node in it's parent childNodes container
 * @param depth - the depth of this node from root
 */
CVC.preprocessNode = function(store, node, childNum, depth) {

	// add it to the quick reference store
	var pos = store.push(node) - 1;

	// add a coyote-id and a wrapper-id to this node
    node.c_cid = pos;
	node.c_wid = null;
	node.c_depth = depth;
	node.c_childNum = childNum;
	
	// gather metrics about the node

	// if this is a leaf node,
	// then we can say its a leaf
	if (node.childNodes.length == 0) {
		node.c_leaf = true;
	}
	// otherwise,
	// we can say its not a leaf
	else {
		node.c_leaf = false;
	}
	
	// if this is a leaf node,
	// then set the value to the nodeValue,
	if (node.c_leaf === true) {
		node.c_value = node.nodeValue;
	}
	// otherwise, set it to the innerHtml
	// (this compresses the inline elements into one string)
	else {
		node.c_value = node.innerHTML;
	}
	
	// if this node has exactly one child, and its already been designated single,
	// 	-or- it is a leaf,
	// then we can say this node is also single
	if ((node.childNodes.length == 1 && node.childNodes[0].c_single === true) || (node.c_leaf === true)) {
		node.c_single = true;
	}
	// otherwise, we know its not single
	else {
		node.c_single = false;
	}
	
	// if all our children are inline,
	// then record children as inline
	let inlineChildren = true; // assume inline to start
	for (var i=0; i<node.childNodes.length; i++) {
		if (node.childNodes[i].c_inline === false) {
			inlineChildren = false;
			break;
		}
	}
	node.c_inlineChildren = inlineChildren;

	// if this node is an inline tag,
	// then if children are also inline, then record inline
	if (CVC.isInlineTag(node) && node.c_inlineChildren === true) {
		node.c_inline = true;
	}
	// otherwise, not inline
	else {
		node.c_inline = false;
	}
		
	node.c_pcdata = null;
	node.c_iterator = null;
	node.c_optional = null;
	node.c_topEqualCount = null;
	node.c_botEqualCount = null;
	node.c_multi = null;
	
    return pos;
}
        

CVC.isInlineTag = function(node) {
	if (CVC.inlineTypes.indexOf(node.nodeName.toLowerCase()) >= 0) {
		return true;
	} else {
		return false;
	}
}


/**
 * For debugging only
 */
CVC.showTree = function(node) {
    // display myself
    let indent = new Array(node.c_depth*4 + 1).join(' ');
    let content = '';

    if (node.c_topEqualCount > 0) {
    	content += ' (#top-' + node.c_topEqualCount + ')';
    }
    if (node.c_botEqualCount > 0) {
    	content += ' (#bot-' + node.c_botEqualCount + ')';
    }
    if (node.c_pcdata !== null) {
    	content += ' (#pcdata-' + node.c_pcdata + ')';
    }
    if (node.c_iterator !== null) {
    	content += ' (#iterator)';
    }
    if (node.c_optional !== null) {
    	content += ' (#optional)';
    }
    if (node.c_wid !== null) {
    	content += ' (#wid-' + node.c_wid + ')';
    }

    if (node.nodeName == '#text') {
    	content += ' - ' + node.c_value;
    }
    console.log(indent + node.nodeName + content);

    if (node.childNodes.length) {
        // process the children
        let current = node.firstChild;
        while (current != null) {
            CVC.showTree(current);
            current = current.nextSibling;
        }
    }
}

	
CVC.displayOutput = function(combinedTabData) {
	
	CVC.loadStyle(combinedTabData.firstTabData.tabBodyTextContent.stylesheets);
	CVC.loadStyle(combinedTabData.secondTabData.tabBodyTextContent.stylesheets);

	var result = new $.Deferred();
	
	//console.log('highlighting sample 0');
	CVC.applyVisuals(CVC.samples[0]);
	//console.log('highlighting sample 1');
	CVC.applyVisuals(CVC.samples[1]);

	result.resolve();
	return result.promise();
};

/**
 * Apply visual effect to each real node deemed a pcdata field
 */
CVC.applyVisuals = function(sNode) {
	
	// Apply the visual highlighting
    // non-text node
    if (sNode.childNodes.length > 0) {

        // process the children
        var current = sNode.firstChild;
        while (current != null) {
            var childIndex = CVC.applyVisuals(current);
            current = current.nextSibling;
        }

    }
    // text node
    else {
    	let wNode = CVC.wrapperNodeStore[sNode.c_wid];

    	// if non-text, get from data-cnode attribute
    	if (wNode && wNode.c_pcdata !== null) {
    		// set basic field highlighting
   			sNode.parentNode.classList.add('coyote-variable');
   			// set id'ed field class
   			sNode.parentNode.classList.add('coyote-variable-' + wNode.c_pcdata);
   			// enable dynamic highlighting of hovered fields
   			sNode.parentNode.onmouseenter = function() {
   				let matchingValuesCellClassName = Coyote.Common.getClassNamesWithPrefix(this, "coyote-variable-")[0];
   				$("." + matchingValuesCellClassName).addClass("coyote-single-highlight");
   			}
   			sNode.parentNode.onmouseleave = function() {
   				let matchingValuesCellClassName = Coyote.Common.getClassNamesWithPrefix(this, "coyote-variable-")[0];
   				$("." + matchingValuesCellClassName).removeClass("coyote-single-highlight");
   			}
    	}

    }

}

CVC.audit = function(sNode, display, displayGood) {
	if (sNode.childNodes.length > 0) {
        var current = sNode.firstChild;
        while (current != null) {
            var childIndex = CVC.audit(current, displayGood);
            current = current.nextSibling;
        }
        //console.log(sNode.c_wid);
        if (sNode.c_wid === null) {
        	if (display && displayGood == false) {
        		console.log('error');
        		console.dir(sNode);
        	}
        } else {
        	if (display && displayGood == true) {
        		console.log('good');
        	}
        }
	} else {
        //console.log(sNode.c_wid);
        if (sNode.c_wid === null) {
        	if (display && displayGood == false) {
        		console.log('error');
        		console.dir(sNode);
        	}
        } else {
        	if (display && displayGood == true) {
        		console.log('good');
        	}
        }
	}
}

CVC.removeScripts = function(text) {

    var done = false;

    while (!done) {
        // define new re each iteration
        var re = /<script[^>]*>[\w\W\n]+?(?=<\/script[^>]*>)<\/script[^>]*>/i;

        // find first match
        var matches = re.exec(text);

        // if no match found, stop
        if (matches === null) {
            done = true;
            continue;
        }

        // chop out this script and continue
        var start = matches.index;
        var length = matches[0].length;
        var prefix = text.substring(0,start);
        var suffix = text.substring(start+length);
        text = prefix + suffix;
    }

    return text;

}

// TODO - refactor to simply call compress on each child, and handle the leaves in the primary 'else'
CVC.compress = function(path, element, depth) {

    if (element.hasChildNodes()) {

        var current = element.firstChild;
        while (current != null) {
            var next = current.nextSibling;

            // dump nodes that aren't ELEMENT_NODEs and TEXT_NODEs
            if (current.nodeType !== Node.ELEMENT_NODE && current.nodeType !== Node.TEXT_NODE) {
                element.removeChild(current);
            }
            // dump TEXT_NODEs if they are whitespace only
            else if (current.nodeName == "#text" && CVC.whitespace.test(current.textContent)) {
                element.removeChild(current);
            }
            // trim TEXT_NODEs to remove leading / trailing whitespace
            else if (current.nodeName == "#text") {
            	current.nodeValue = current.nodeValue.trim() + " ";
            }
            // dump IFRAME nodes
            else if (current.nodeName == "IFRAME") {
                element.removeChild(current);
            }
            // otherwise, keep digging
            else {
                CVC.compress('', current, depth+1);
            }
            current = next;
        }

    }
    
    // TODO - handle the true leaves here
    else {
    }

    return element;
}

CVC.loadStyle = function(sheetArray) {
	
	let i;
	var head  = document.getElementsByTagName('head')[0];
	for (i=0; i<sheetArray.length; i++) {
		let type = sheetArray[i].type;
		let href = sheetArray[i].href;
		let media = sheetArray[i].media;
		// avoid duplicates
		for (var j = 0; j < document.styleSheets.length; j++){
			if (document.styleSheets[j].href == href){
				return;
			}
		}
		var link  = document.createElement('link');
		link.rel  = 'stylesheet';
		link.type = type;
		link.href = href;
		link.media = media;
		head.appendChild(link);
	}
}

CVC.match = function(W, S) {
	
	//console.log('---' + W.c_depth + '---------------');
	//console.dir(W);
	//console.dir(S);
	
	// if tags are different, then fail fast
	if (W.nodeName !== S.nodeName) {
		return {tag: 'diff', text: 'diff'};
	}
	
	// if all children are inline (basically different forms of text)
	if (W.c_inlineChildren && S.c_inlineChildren) {
		if (W.c_value == S.c_value) {
			return {tag: 'same', text: 'same'};
		} else {
			return {tag: 'same', text: 'diff'};
		}
	}
	
	let i=0,j=0,ii=0;
	let state='normal';
	let bubbleValue = {tag: 'same', text: 'same'};
	
	// iterate through the children
	let count=0;
	while (i<W.childNodes.length && ii<W.childNodes.length && j<S.childNodes.length && bubbleValue.tag != 'diff' && state != 'done') {
		// prevent infinite loops when bad incrementers are used
		count++; if (count>50) {console.log(state); exit;}

		// TODO need some case for when searching for wIterator or optionals
		// because we need to send across two W's instead of one W and one S
		let childrv;
		if (state == 'wIteratorSearch') {
			childrv = CVC.match(W.childNodes[i], W.childNodes[ii]);
		} else {
			childrv = CVC.match(W.childNodes[i], S.childNodes[j]);
		}

		switch (state) {
			case 'normal':
				if (CVC.equalRV(childrv, CVC.SS) || CVC.equalRV(childrv, CVC.SP)) {
					CVC.linkNodes(W.childNodes[i], S.childNodes[j]);
					W.c_topEqualCount++;
					i++,j++;
					if (i>=W.childNodes.length) {
						if (j>=S.childNodes.length) {
							state = 'done';
							bubbleValue = CVC.updateRV(bubbleValue, childrv);
							continue;
						} else {
							state = 'sOptionalSearch';
							bubbleValue = CVC.updateRV(bubbleValue, childrv);
							continue;
						}
					} else {
						if (j>=S.childNodes.length) {
							state = 'wOptionalSearch';
							bubbleValue = CVC.updateRV(bubbleValue, childrv);
							continue;
						}
					}
					state = 'normal';
					bubbleValue = CVC.updateRV(bubbleValue, childrv);
				} else if (CVC.equalRV(childrv, CVC.SD)) {
					CVC.linkNodes(W.childNodes[i], S.childNodes[j]);
					W.childNodes[i].c_pcdata = CVC.nextPCDataNum++;
					state = 'sIteratorSearch';
					bubbleValue = CVC.updateRV(bubbleValue, CVC.SP);
					j++; // walk thru sample side, keep wrapper pointer fixed
				} else if (CVC.equalRV(childrv, CVC.DD)) {
					return childrv;
				} else {
					CVC.matchError(W.childNodes[i], W.childNodes[ii], state, childrv);
				}
				break;
			case 'sIteratorSearch':
				if (CVC.equalRV(childrv, CVC.SD) || CVC.equalRV(childrv, CVC.SS) || CVC.equalRV(childrv, CVC.SP)) {
					CVC.linkNodes(W.childNodes[i], S.childNodes[j]);
					W.childNodes[i].c_iterator = true;
					state = 'sIteratorSearch';
					bubbleValue = CVC.updateRV(bubbleValue, CVC.SP);
					j++; // walk thru sample side
					if (j>=S.childNodes.length) {
						state = 'wIteratorSearch';
						ii = i+1; // setup ii iterator to walk thru wrapper side
						if (ii>=W.childNodes.length) {
							state = 'done';
						}
					}
				} else if (CVC.equalRV(childrv, CVC.DD)) {
					state = 'wIteratorSearch';
					ii = i+1; // setup ii iterator to walk thru wrapper side
					if (ii>=W.childNodes.length) {
						state = 'done';
					}
				} else {
					CVC.matchError(W.childNodes[i], W.childNodes[ii], state, childrv);
				}
				break;
			case 'wIteratorSearch':
				if (CVC.equalRV(childrv, CVC.SD)) {
					// eliminate any adjacent iterator nodes from wrapper
					W.removeChild(W.childNodes[ii]);
					state = 'wIteratorSearch';
					bubbleValue = CVC.updateRV(bubbleValue, childrv);
					ii++; // walking thru wrapper side
					if (ii>=W.childNodes.length) {
						state = 'sOptionalSearch';
					}
				} else if (CVC.equalRV(childrv, CVC.DD)) {
					i = ii;
					state = 'normal';
					if (i>=W.childNodes.length) {
						state = 'sOptionalSearch';
					}
				} else {
					CVC.matchError(W.childNodes[i], W.childNodes[ii], state, childrv);
				}
				break;
			default:
				CVC.matchError(W.childNodes[i], S.childNodes[j], state);
		}
		//console.log('state(' + state + ') childrv(' + JSON.stringify(childrv) + ')');
		
		//let a1,a2,a3,a4,a5;
		//console.log(a1 = i<W.childNodes.length);
		//console.log(a2 = ii<W.childNodes.length);
		//console.log(a3 = j<S.childNodes.length);
		//console.log(a4 = bubbleValue.tag != 'diff');
		//console.log(a5 = state != 'done');
		//if ((a1 && a2 && a3 && a4 && a5) === false) {
			//exit;
		//}
	}
	return bubbleValue;
}



CVC.SS = {tag: 'same', text: 'same'};
CVC.SD = {tag: 'same', text: 'diff'};
CVC.SP = {tag: 'same', text: 'pcdata'};
CVC.DD = {tag: 'diff', text: 'diff'};


/**
 * Link up sample node to wrapper node.
 * If either side has inlineChildren, then link them all, recursively.
 * Does NOT link arbitrary nodes recursively, only those with
 * inlineChildren.
 */
CVC.linkNodes = function(W, S, recurseW) {
	
	// if false, skip recursing through W
	if (recurseW == null) {
		recurse = true;
	}

	// link up main nodes
	S.c_wid = W.c_cid;
	
	// link up inline children (both S and W) to wrapper main node
	let i;
	if (W.c_inlineChildren) {
		if (recurseW) {
			for (i=0; i<W.childNodes.length; i++) {
				CVC.linkNodes(W, W.childNodes[i], false);
			}
		}
	}
	if (S.c_inlineChildren) {
		for (i=0; i<S.childNodes.length; i++) {
			CVC.linkNodes(W, S.childNodes[i]);
		}
	}
}


/**
 * Display an error message with the objects.
 */
CVC.matchError = function(W, S, state, childrv) {
					
	// build up error message
	let statestr = 'state(' + state + ')';
	let rvstr = '';
	if (childrv !== null) {
		rvstr = ' childrv(' + JSON.stringify(childrv) + ')';
	}
	let message = statestr + rvstr + ' not matched';
					
	console.log('----------------------------');
	console.log(message);
	console.log(W.c_depth + ' : ' + W.c_value);
	console.dir(W);
	console.log(S.c_depth + ' : ' + S.c_value);
	console.dir(S);
	console.log(); // set breakpoint here
	exit;
}


/**
 * Compare two return value objects, each like;
 * {tag: tagValue, text: textValue}
 */
CVC.equalRV = function(rv1, rv2) {
	if (rv1.tag && rv2.tag && rv1.tag === rv2.tag &&
		rv1.text && rv2.text && rv1.text === rv2.text) {
		return true;
	}
	return false;
}

/**
 * Perform the logic to keep the value to be returned from the
 * match routine updated based on the child node comparisons.
 */
CVC.updateRV = function(inValue, rv) {
	
	var out = {
			tag: inValue.tag,
			text: inValue.text
	};
	
	// if tag diff, then downgrade everything
	if (rv.tag == 'diff') {
		out.tag = 'diff';
		out.text = 'diff';
		return out;
	}
	
	// if currently text is same, it can be downgraded by anything
	if (inValue.text == 'same') {
		out.text = rv.text;
	}
	
	// if currently text is pcdata, it can only by downgraded by diff
	else if (inValue.text == 'pcdata') {
		if (rv.text == 'diff') {
			out.text = rv.text;
		}
	}
	
	// if currently text is diff, then it won't be changed
	
	//console.log(JSON.stringify(inValue) + '+' + JSON.stringify(rv) + '==>' + JSON.stringify(inValue));
	return out;
}


