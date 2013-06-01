/**
 * letJS library 0.4
 *
 * @version 0.4
 * @author Copyright 2012-2013, <a href="mailto:spb.piksel@gmail.com">Dmitrii Pakhtinov</a>
 * date 03/30/2012
 */
(function(window, False, Null) {
    var
        document = window.document,
        documentElement = document.documentElement,
        input = document.createElement('input'),
        hasInputSelection = 'selectionStart' in input,
        hasCreateTextRange = 'createTextRange' in input,
        letAttributes = window['letJS'] = window['letJS'] || {},
        standardAttr = ['data-let-input', 'data-let-template', 'data-let-length'],
        bookmarkKey = '__rangeBookmark';

    /**
     * Getting or setting boundaries selection text
     *
     * @param {int} [start] Sets the initial value of the text selection
     * @param {int} [end] Sets the final value of the text selection
     * @return {Array} Returns an array of the current position [Start, End]
     */
    function selection(start, end) {
        var
            target = this.target,
            hasResult = arguments.length === 0;

        end = arguments.length > 1 ? end : start;

        if (hasInputSelection) {
            if (hasResult) {
                start = target.selectionStart;
                end = target.selectionEnd;
            } else {
                target.setSelectionRange(start, end);
            }
        } else if (hasCreateTextRange) {
            var range = document.selection.createRange();
            if (range.parentElement() === target) {
                target[bookmarkKey] = range.getBookmark();
            }
            try {
                // IE throws an exception if the element has removed from the DOM
                range = target.createTextRange();
            } catch(_e_) {}
            if (!hasResult) {
                range.collapse(true);
                range.moveEnd('character', end);
                range.moveStart('character', start);
                range.select();
                target[bookmarkKey] = range.getBookmark();
            } else if (target[bookmarkKey]) {
                range.moveToBookmark(target[bookmarkKey]);
                end = range.text.length;
                range.collapse(true);
                range.moveStart('character', -target.value.length);
                start = range.text.length;
                end += start;
            }
        }
        return [start, end];
    }

    /**
     * Handler built in library attributes
     *
     * @param {Object} rules
     * @returns {boolean}
     */
    function rulesHandler(rules) {
        // standard attribute handlers
        return rules['attr'] === 'data-let-input' ? rules['insertValue'] === '' || (rules['regExp']
            || new RegExp("^[" + rules['rule'] + "]+$", "g")).test(rules['insertValue'])
            : rules['attr'] === 'data-let-template' ? (rules['regExp']
            || new RegExp("(" + rules['rule'] + ")", "g")).test(rules['expectedValue'])
            : !+rules['rule'] || rules['expectedValue'].length <= +rules['rule'];
    }

    // if the library is already initialized
    if (documentElement['letJSLoaded']) {
        return;
    }

    /**
     * Entry Point
     */
    (function(elem, types, handler) {
        // add handlers for the standard attributes
        for(var index = 0; index < standardAttr.length; index++) {
            if (!letAttributes.hasOwnProperty(standardAttr[index])) {
                letAttributes[standardAttr[index]] = rulesHandler;
            }
        }
        // flag
        elem['letJSLoaded'] = true;
        // hang up the event handler for all types of events in the types array
        for(var i = 0; i < types.length; i++) {
            if (elem.addEventListener) {
                // for good browsers
                elem.addEventListener(types[i], handler, true);
            } else if (elem.attachEvent) {
                // for God forbid! This browser =)
                var type = {'focus': 'focusin', 'blur': 'focusout'};
                elem.attachEvent('on' + (type[types[i]] || types[i]), function(e) {
                    handler.call(elem, window.event);
                });
            }
        }
        // Internet Explorer does not catch some of the events on the HTMLDocument,
        // so the delegated will be on the root element HTMLHtmlElement
    })(documentElement, [
        // events that we will listen and process
        'keypress', 'keydown', 'paste', 'cut', 'mousedown', 'mouseup',
        'dragstart', 'dragenter', 'dragover', 'drop', 'focus', 'blur'
    ], function(e) {
        var
            type = e.type,
            target = e.target || e.srcElement,
            insertValue = '',
            m, attr;

        // we only need the input and textarea elements
        if (!target || !(target.nodeName in {'INPUT': 1, 'TEXTAREA': 1})
            || (target.type in {'radio': 1, 'checkbox': 1})) {
            // If something else, then go out from here
            return;
        }

        // in old IE there is no property which
        var which = e.which == Null ? e.charCode != Null ? e.charCode : e.keyCode : e.which;

        // get the current text selection range
        var
            position = selection.call({'target': target}),
            insertStart = position[0],
            insertEnd = position[1],
            cropStart = insertStart,
            cropEnd = insertEnd;

        // get the current value of the field
        var value = 'value' in target ? target.value : '';

        // looking for this type of event handler
        switch(type) {
            case 'paste':
                // event handling paste text from the clipboard
                var clipboardData = e.clipboardData || window.clipboardData || False;
                insertValue = clipboardData && clipboardData.getData('Text');
            case 'cut':
                // if the event got cut, do not do anything it will all happen by itself.
                break;
            case 'focusin':
            case 'focusout':
                type = type === 'focusin' ? 'focus' : 'blur';
            case 'focus':
            case 'blur':
            case 'mousedown':
            case 'mouseup':
                which = 33;
            case 'keydown':
                // processing dedicated buttons
                which = which === 46 ? -1 : which === 8 ? 8 : which > 32 && which < 41 ? -2 : 0;
            case 'keypress':
                if (which === 0 || (e.ctrlKey && which > 0) || e.altKey) {
                    // nothing significant has pressed
                    return;
                } else if (which === 8) {
                    // processing the delete key, the left character on the current cursor position
                    cropStart -= cropStart == cropEnd && cropStart > 0 ? 1 : 0;
                } else if (which === -1) {
                    // processing the delete key, right character from the current cursor position
                    cropEnd += cropStart == cropEnd && cropEnd < value.length ? 1 : 0;
                } else if (which > 0) {
                    // processing pressing the symbol
                    insertValue = String.fromCharCode(which);
                }
                break;
            case 'dragstart':
            case 'dragenter':
            case 'dragover':
            case 'drop':
                // then process the events associated with the drag'n'drop,
                // unfortunately, not all browsers work with it well so long
                // as we put the cap as long as FireFox, Chrome, Safari do not
                // implement proper support for this technology.
                insertValue = False;
                break;
            default:
                return;
        }

        for(attr in letAttributes) {
            if (insertValue === False || (Object.prototype.hasOwnProperty.call(letAttributes, attr) &&
                (which === -2 && letAttributes[attr].length > 1 || which !== -2) &&
                (m = target.getAttribute(attr)) !== Null && letAttributes[attr].call(target, {
                'originalEvent': e,
                'type': type,
                'attr': attr,
                'rule': m,
                'target': target,
                'selection': selection,
                'value': value,
                'insertValue': insertValue,
                'cropValue': value.substring(cropStart, cropEnd) || '',
                // presumptive text that will be displayed in the input field
                'expectedValue': value.substr(0, cropStart < insertStart ? cropStart : insertStart)
                    + insertValue + value.substring(cropEnd > insertEnd ? cropEnd : insertEnd),
                'regExp': (m = /^\/(.*)\/(?:([igm]+))?$/.exec(m)) && new RegExp(m[1], m[2]),
                'insertStart': insertStart,
                'insertEnd': insertEnd,
                'cropStart': cropStart,
                'cropEnd': cropEnd
            }, which === -2) === False)) {
                // cancel the insertion of the text and to cancel the default action
                if (e.preventDefault) {
                    e.preventDefault();
                } else {
                    e.returnValue = False;
                }
                return False;
            }
        }
    });
})(window, false, null);