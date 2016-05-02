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






/**
 * Section 5. of Roadrunner paper says:
 * "... we disallow adjacencies between iterators and optionals."
 * and,
 * (A)+ = A is repeated one or more times
 * (A)? = A is optional, occurs either 0 or 1 times
 * (A)* = ((A)+)?
 * 
 * Therefore, possible options are
 *  ---
 *  A
 *  ---
 * 	(A)+ -or- (A)? -or- (A)*
 *  ---
 * 	A
 * 	(B)+ -or- (B)? -or- (B)*
 * 	---
 * 	(A)+ -or- (A)? -or- (A)*
 * 	B
 * 	---
 * 	A
 * 	(B)+ -or- (B)? -or- (B)*
 *  C
 * 	---
 */

/**
 * Match
 * 
 * When children are present on at least one side
 * states: (states progress from first to last in this list, searching for each type of match)
 *  topmatch, botmatch, iterator, optional, done
 *  
 */
/**
 * @param W
 * @param S
 * @param GEN - bool - directive to generalize the wrapper or not
 */
CVC.match = function(W, S, GEN) {
	
	//console.log('---------------------');
	//console.log(W.c_depth + ":" + GEN);
	//console.dir(W.c_value);
	//console.dir(W);
	//console.dir(S.c_value);
	//console.dir(S);
	
	var state = 'topbotmatch';
	var topEqualCount = 0;
	var botEqualCount = 0;
	var goodIterator = false;
	var goodOptional = false;
	var result = 'equal';
	
	// when at least one side has no children present
	if (W.c_leaf || S.c_leaf) {

		//console.log('at least one side has no children');
		
		if (W.nodeName == S.nodeName) {
		    // if the node is already marked as pcdata, then anything goes
		    if (W.c_pcdata !== null) {
		        if (GEN) {
		            S.c_wid = W.c_cid;
		        }
		        return 'equal';
		    }
		    if ((W.c_leaf || W.c_childrenInline) && (S.c_leaf || S.c_childrenInline) &&
		        W.c_value == S.c_value) {
		        if (GEN) {
		            S.c_wid = W.c_cid;
		        }
		        return 'equal';
		    }
		    if ((W.c_leaf || W.c_childrenInline) && (S.c_leaf || S.c_childrenInline)) {
		        if (GEN) {
		            W.c_pcdata = CVC.nextPCDataNum++;
		            S.c_wid = W.c_cid;
		        }
		        return 'diff-string';
		    }

		    // if we made it here, we could be dealing with an optional
		    // TODO - is this right???
		    nextstate = 'optional';


		} else {
			return 'diff-tag';
		}
		
		state = nextstate;
	}
	
	
	// when at least one side has some children present
	if (!W.c_leaf || !S.c_leaf) {
		
		//console.log('at least one side has children');

		// before iterating, check to see if everything below is inline
		if (W.c_childrenInline && S.c_childrenInline && W.c_value == S.c_value) {
		    if (GEN) {
		        S.c_wid = W.c_cid;
		    }
		    return 'equal';
		}


		if (state == 'topbotmatch') {
			CVC.topbotmatch(W,S,'topmatch');
			state = 'datamatch';
		}

		if (state == 'datamatch') {
			CVC.datamatch(W,S);
			state = 'iterator';
		}

		
		if (false && state == 'iterator') {

		    // If we arrived here, it means both sides have unmatched children
		    // indicating its an iterator, not an optional. Therefore, if we
		    // have trouble generalizing here, its an error.
			let i;
			let j;
		    let nextstate = 'done';
		    let mini = topEqualCount;
		    let minj = topEqualCount;
		    let maxi = W.childNodes.length-1-botEqualCount;
		    let maxj = S.childNodes.length-1-botEqualCount;

		    // run through all remaining children confirming valid iterator
		    goodIterator = true;
		    // step through sample side iterators
		    for (i=mini,j=minj; (i<=maxi && j<=maxj); j++) {
		        let m = CVC.match(W.childNodes[i],S.childNodes[j],false);
                //console.log(W.c_depth + " : " + GEN + " : " + m);
		        // equal or pcdata could be applied to make them equivalent
		        if (m == 'equal' || m == 'diff-string') {
		            // do nothing
		        } else {
		            // if not equal or resolvable, error. see note above.
		            nextstate = 'done';
		            goodIterator = false;
		            break;
		        }
		    }
		    // now step through wrapper side iterators
		    for (i=mini,j=mini+1; (i<=maxi && j<=maxi); j++) {
		        let m = CVC.match(W.childNodes[i],W.childNodes[j],false);
                //console.log(W.c_depth + " : " + GEN + " : " + m);
		        // equal or pcdata could be applied to make them equivalent
		        if (m == 'equal' || m == 'diff-string') {
		            // do nothing
		        } else {
		            // if not equal or resolvable, error. see note above.
		            nextstate = 'done';
		            goodIterator = false;
		            break;
		        }
		    }
		    
		    // if all children can be absorbed into the iterator, then do it
		    if (goodIterator) {
		        if (GEN) {
		            // mark wrapper side as iterator pivot point
		            W.childNodes[i].c_iterator = true;
		            // step through sample side iterators
		            for (i=mini,j=minj; (i<=maxi && j<=maxj); j++) {
		                let m = CVC.match(W.childNodes[i],S.childNodes[j],true);
		                //console.log(W.c_depth + " : " + GEN + " : " + m);
		                S.childNodes[j].c_wid = W.childNodes[i].c_cid;
		            }
		            // remove any extra wrapper side iterators
		            for (i=mini,j=mini+1; (i<=maxi && j<=maxi); j++) {
		                W.removeChild(W.childNodes[j]);
		            }
		        }
		    } else {
		        // TODO (??? is this the right result value?)
		        result = 'diff-tag';
		    }

		    state = nextstate;

		}

	}
	
	if (state == 'done') {
		return result;
	}
	
	return 'error';
}


CVC.datamatch = function(W, S) {
	/*
	console.log('---datamatch------------------');
	console.log(W.c_depth);
	console.dir(W.c_value);
	console.dir(W);
	console.dir(S.c_value);
	console.dir(S);
	*/
	
	let m = CVC.leafmatch(W, S);
	if (m == 'equal') {
		return 'equal';
	}

	let topEqualCount = W.c_topEqualCount || 0;
	let botEqualCount = W.c_botEqualCount || 0;

    // If we arrived here, it means both sides have unmatched children
    // indicating its an iterator, not an optional. Therefore, if we
    // have trouble generalizing here, its an error.
	let i;
	let j;
    let nextstate = 'done';
    let mini = topEqualCount;
    let minj = topEqualCount;
    let maxi = W.childNodes.length-1-botEqualCount;
    let maxj = S.childNodes.length-1-botEqualCount;
    for (i=mini,j=minj; (i<=maxi && j<=maxj); i++,j++) {
        m = CVC.datamatch(W.childNodes[i],S.childNodes[j]);
    }
		    
    return m;
}





CVC.topbotmatch = function(W, S, state) {

	let m = CVC.leafmatch(W, S);
	if (m == 'equal' || m == 'diff-tag') {
		return m;
	}

	let i;
	let j;
	let topEqualCount = W.c_topEqualCount || 0;
	let botEqualCount = W.c_botEqualCount || 0;
    let nextstate = 'datamatch';
    let mini = 0;
    let minj = 0;
    let maxi = W.childNodes.length-1;
    let maxj = S.childNodes.length-1;
    
    if (state == 'topmatch') {
    
    for (i=mini,j=minj; (i<=maxi && j<=maxj); i++,j++) {
        m = CVC.topbotmatch(W.childNodes[i],S.childNodes[j], 'topmatch');
        //console.log(W.c_depth + " : " + m);
        
        // if same tag (in same place) then link them
        if (m !== 'diff-tag') {
            S.childNodes[j].c_wid = W.childNodes[i].c_cid;
        }
        
        if (m == 'equal') {
            //S.childNodes[j].c_wid = W.childNodes[i].c_cid;
            topEqualCount = i+1;
            // if both sides finished at same time
            if (i==maxi && j==maxj) {
                // no more children to process
                // nothing more to do
                nextstate = 'done';
                break;
            }
            // if only one side finished
            if (i==maxi || j==maxj) {
                // then only one side has remaining children
                // only possibility is an optional
                nextstate = 'optional';
                break;
            }
        } else {
            // both sides have remaining children
            // do next step
            nextstate = 'botmatch';
            break;
        }
    }
    W.c_topEqualCount = topEqualCount;
    state = nextstate;

    }
    
    
    if (state != 'botmatch') {
    	return m;
    }
    

    nextstate = 'iterator';
    mini = topEqualCount;
    minj = topEqualCount;
    maxi = W.childNodes.length-1;
    maxj = S.childNodes.length-1;
    for (i=maxi,j=maxj; (i>=mini && j>=minj); i--,j--) {
        m = CVC.topbotmatch(W.childNodes[i],S.childNodes[j],'botmatch');
        //console.log(W.c_depth + " : " + m);
        
        if (m !== 'diff-tag') {
            S.childNodes[j].c_wid = W.childNodes[i].c_cid;
        }

        if (m == 'equal') {
            //m = CVC.match(W.childNodes[i],S.childNodes[j],true);
            //console.log(W.c_depth + " : " + m);
            // TODO
            // if this next step is already done in the previous, then both (prev and next)
            // should be collapsed into the call to match above using "GEN" as the third param
            botEqualCount = maxi-i+1;
            // if both sides finished at same time
            // (shouldn't really happen because if this condition existed
            // it should have been caught in the top matches)
            if (i==mini && j==minj) {
                // no more children to process
                // nothing more to do
                nextstate = 'done';
                break;
            }
            // if only one side finished
            if (i==mini || j==minj) {
                // then only one side has remaining children
                // only possibility is an optional
                nextstate = 'optional';
                break;
            }
        } else {
            // both sides have remaining children
            // do next step
            nextstate = 'iterator';
            break;
        }
    }
    W.c_botEqualCount = botEqualCount;
    state = nextstate;
    
    return m;
}



CVC.exactmatch = function(W, S) {
	if (W.nodeName == S.nodeName && W.c_value == S.c_value) {
		return true;
	}
	return false;
}


	
CVC.leafmatch = function(W, S) {
	
	/*
	if (CVC.exactmatch(W,S)) {
		return 'equal';
	}
	*/

	// when at least one side has no children present
	if (W.c_leaf || S.c_leaf) {

		//console.log('at least one side has no children');
		
		if (W.nodeName == S.nodeName) {
		    // if the node is already marked as pcdata, then anything goes
		    if (W.c_pcdata !== null) {
		        S.c_wid = W.c_cid;
		        //return 'equal';
		        return 'diff-string';
		    }
		    if ((W.c_leaf || W.c_childrenInline) && (S.c_leaf || S.c_childrenInline) &&
		        W.c_value == S.c_value) {
		        S.c_wid = W.c_cid;
		        return 'equal';
		    }
		    if ((W.c_leaf || W.c_childrenInline) && (S.c_leaf || S.c_childrenInline)) {
	            W.c_pcdata = CVC.nextPCDataNum++;
	            S.c_wid = W.c_cid;
		        return 'diff-string';
		    }

		    // if we made it here, we could be dealing with an optional
		    // TODO - is this right???
		    nextstate = 'optional';


		} else {
			return 'diff-tag';
		}
		
		state = nextstate;
	}
	
	return null;
	
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