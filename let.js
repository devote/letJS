/**
 * letJS library 0.2
 *
 * @version 0.2
 * @author Copyright 2012-2013, <a href="mailto:spb.piksel@gmail.com">Dmitrii Pakhtinov</a>
 * date 03/30/2012
 */
(function(window, False, Null) {
    var
        document = window.document,
        input = document.createElement('input'),
        hasInputSelection = 'selectionStart' in input,
        hasCreateTextRange = 'createTextRange' in input,
        bookmarkKey = '__rangeBookmark';

    /**
     * Получение или установка границ выделения
     *
     * @param [start]   Задает стартовое значение границы выделения
     * @param [end]     Задает конечно значение границы выделения
     * @return {Array}  Возвращает массив текущих координат [Start, End]
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
            range = target.createTextRange();
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

    function rulesHandler(rules) {
        // стандартные обработчики атрибутов
        return rules['attr'] === 'data-let-input' ? rules['insertValue'] === '' || (rules['regExp']
            || new RegExp("^[" + rules['rule'] + "]+$", "g")).test(rules['insertValue'])
            : rules['attr'] === 'data-let-template' ? (rules['regExp']
            || new RegExp("(" + rules['rule'] + ")", "g")).test(rules['expectedValue'])
            : !+rules['rule'] || rules['expectedValue'].length <= +rules['rule'];
    }

    // если библиотеку уже инициализировали
    if ('letJS' in window) {
        // то и делать тут нечего
        return;
    }

    var letAttributes = window['letJS'] = {
        "data-let-input": rulesHandler,
        "data-let-template": rulesHandler,
        "data-let-length": rulesHandler
    };

    /**
     * Entry Point
     */
    (function(elem, types, handler) {
        // вешаем обработчик на все типы событий в массиве types
        for(var i = 0; i < types.length; i++) {
            if (elem.addEventListener) {
                // для хороших браузеров
                elem.addEventListener(types[i], handler, False);
            } else if (elem.attachEvent) {
                // для Боже упаси! Такой браузер =)
                elem.attachEvent('on' + types[i], function(e) {
                    handler.call(elem, window.event);
                });
            }
        }
        // Internet Explorer некоторые события не ловит на HTMLDocument
        // поэтому делегировать будем на корневом элементе HTMLHtmlElement
    })(document.documentElement, [
        // события которые мы будем слушать и обрабатывать
        'keypress', 'keydown', 'paste', 'cut',
        'dragstart', 'dragenter', 'dragover', 'drop'
    ], function(e) {
        var
            type = e.type,
            target = e.target || e.srcElement,
            insertValue = '',
            m, attr;

        // нам нужны только элементы textarea и input
        if (!target || !(target.nodeName in {'INPUT': 1, 'TEXTAREA': 1})) {
            // если что-то другое, то выходим отсюда
            return;
        }

        // в старых ИЕ нет свойства which
        var which = e.which == Null ? e.charCode != Null ? e.charCode : e.keyCode : e.which;

        // получаем текущие границы выделения
        var
            position = selection.call({'target': target}),
            insertStart = position[0],
            insertEnd = position[1],
            cropStart = insertStart,
            cropEnd = insertEnd;

        // получаем текущее значение поля
        var value = 'value' in target ? target.value : '';

        // ищем обработчик текущего типа события
        switch(type) {
            case 'paste':
                // обработка события вставки текста из буфера обмена
                var clipboardData = e.clipboardData || window.clipboardData || '';
                insertValue = clipboardData && clipboardData.getData('Text');
            case 'cut':
                // если получили событие вырезать,
                // ничего не делаем все произойдет само.
                break;
            case 'keydown':
                // обработка спецклавиш
                which = which === 46 ? -1 : which === 8 ? 8 : 0;
            case 'keypress':
                if (which === 0 || e.ctrlKey || e.altKey) {
                    // ничего существенного не нажато
                    return;
                } else if (which === 8) {
                    // обработка клавиши удаления, левого символа от текущей позиции курсора
                    cropStart -= cropStart == cropEnd && cropStart > 0 ? 1 : 0;
                } else if (which === -1) {
                    // обработка клавиши удаления, правого символа от текущей позиции курсора
                    cropEnd += cropStart == cropEnd && cropEnd < value.length ? 1 : 0;
                } else {
                    // обработка вставки нажатой символьной клавиши
                    insertValue = String.fromCharCode(which);
                }
                break;
            case 'dragstart':
            case 'dragenter':
            case 'dragover':
            case 'drop':
                // тут обрабатываем события связанные с drag&drop
                // к сожалению не все браузеры работают с ним хорошо
                // поэтому пока ставим заглушку, до тех пор, пока
                // FireFox, Chrome, Safari не реализуют нормальную
                // поддержку этой технологии.
                insertValue = False;
                break;
            default:
                return;
        }

        for(attr in letAttributes) {
            if (insertValue === False || (Object.prototype.hasOwnProperty.call(letAttributes, attr) &&
                (m = target.getAttribute(attr)) !== Null && letAttributes[attr].call(target, {
                'type': type,
                'attr': attr,
                'rule': m,
                'target': target,
                'selection': selection,
                'value': value,
                'insertValue': insertValue,
                'cropValue': value.substring(cropStart, cropEnd) || '',
                // предположительный текст, который будет отображен в поле ввода
                'expectedValue': value.substr(0, cropStart < insertStart ? cropStart : insertStart)
                    + insertValue + value.substring(cropEnd > insertEnd ? cropEnd : insertEnd),
                'regExp': (m = /^\/(.*)\/(?:([igm]+))?$/.exec(m)) && new RegExp(m[1], m[2]) || Null,
                'insertStart': insertStart,
                'insertEnd': insertEnd,
                'cropStart': cropStart,
                'cropEnd': cropEnd
            }) === False)) {
                // запрещаем ввод и отменяем действия по умолсанию
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