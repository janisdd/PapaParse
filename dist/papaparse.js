/* @license
Papa Parse
v5.0.0-custom-1.2.0
https://github.com/mholt/PapaParse
License: MIT
commit: 49170b76b382317356c2f707e2e4191430b8d495
fork -> https://github.com/janisdd/PapaParse/tree/fix609_main
*/
/*

NOTE that the minified version is not in sync!!
you need to manually compress it, e.g. with https://javascript-minifier.com/

changelog: (latest first)

- started to track versions with `-custom-1.0.0` suffix

- added config options:
  - `calcInverseMappings: bool` the other mappings are from source file to csv table, this options calculates the inverse mappings (csv table to source file)
    - the result will contain `outCsvCellToSourceFilePositionMapping` (where each entry is the start & end position of the cell in the source file)
        - one row for each row in the csv table
      - one entry for each cell in each csv row
      - entry: {start: number, end: number}
- added config options:
  - `calcLineIndexToCsvLineIndexMapping: bool` and `calcColumnIndexToCsvColumnIndexMapping: bool`
  - if set to true, the result will contain `outLineIndexToCsvLineIndexMapping` and `outColumnIndexToCsvColumnIndexMapping`
    - outLineIndexToCsvLineIndexMapping: for every line in the input text the csv line it refers to
    - outColumnIndexToCsvColumnIndexMapping: the end string indices for every csv line fields (for every csv row)
      - note that the last col has no separator, and if it's empty the last end second last indices will be the same!!
- fixed and issue where multi-character delimiter won't work
- added option `quoteEmptyOrNullFields` (defaults to false) to unparse which defines how null, undefined and empty strings are quoted
- fixes issue where all fields quoted and missing closing quote on last field will hang the function guessDelimiter
    - this is because the field in the row will not terminated by the new line because the closing quote is missing (\n is also valid inside multi line fields)
    - in combination with an unknown delimiter (the wrong one) will cause that no quote is accepted as closing quote and we never find a single valid row (after 10 we normally stop guessing)
        - this is because a valid closing quote is followed by the delimiter `"..." DEL` or new line `"..."\n
    - to resolve this we added the config option `isGuessingDelimiter` to the parser and allow a field `maxGuessLength` (default to ~5000) to stop searching for the closing quote
    - also the new line char is not properly recognized if a closing quote is missing because all new line chars are inside quotes (guessLineEndings removes everything in between quotes) -> we never stop at `"..."\n` because we actually could have `"..."\r\n` so after the quote the `\r` follows, not the new line character

- added option to parsing to retain quote information for columns
    - the returned type is now: oldResult & {columnIsQuoted: boolean[] or null if option is not set}
    - the parse option is: retainQuoteInformation: {boolean}

- added parse/unparse option `rowInsertCommentLines_commentsString`
    - used to treat comments as normal 1 cell rows
    - parse: rowInsertCommentLines_commentsString !== null, left trimmed strings starting with it are treated as comments and are parsed into a row with 1 cell
    - unparse: rowInsertCommentLines_commentsString !== null, left trimmed strings first cells will be trimmed left and only the first cell will be exported

- fixed issue https://github.com/mholt/PapaParse/issues/1035 (same as https://github.com/janisdd/vscode-edit-csv/issues/167)
  - also fixes https://github.com/mholt/PapaParse/issues/1068
  - issue: the escape char was not properly set when only the quoteChar was changed
  - subsequent issue: do determine if a field must be quoted `BAD_DELIMITERS` was used, which always includes `"` and `Papa.BYTE_ORDER_MARK`
    - it also didn't check the actual quoteChar

- added option `_quoteLeadingSpace` and `_quoteTrailingSpace`
  - `_quoteLeadingSpace` defaults to true: if a field starts with a whitespace, should it be quoted (true) or not (false)
  - `_quoteTrailingSpace` defaults to true: if a field ends with a whitespace, should it be quoted (true) or not (false)

- added option `_determineFieldHasQuotesFunc` to determine if a field should be quoted (it cannot remove quotes!!)
  - if a field contains some special characters, it is quoted, e.g. delimiter, quotes, new line, ...
  - this func can be used to add quotes to fields (but not to remove quotes!) it is OR-ed with the other indicators

- when setting `retainQuoteInformation` to `true`, we now also output `cellIsQuotedInfo` which contains the information if a cell was quoted or not
- `cellIsQuotedInfo` now respects `skipEmptyLines` and returns the same amount of rows as the data array
*/
const parseConfigUserDefaults = {
    delimiter: '',
    newline: '',
    comments: null,
    quoteChar: '"',
    retainQuoteInformation: false,
    escapeChar: '"', //TODO
    skipEmptyLines: true,
    delimitersToGuess: [',', '\t', '|', ';', String.fromCharCode(30), String.fromCharCode(31)],
    maxDelimiterGuessLength: 5000,
    previewInRows: null,
    rowInsertCommentLines_commentsString: null,
    calcColumnIndexToCsvColumnIndexMapping: false,
    calcLineIndexToCsvLineIndexMapping: false,
};
const unparseConfigUserDefaults = {
    delimiter: ',',
    newlineChar: '\r\n',
    quoteChar: '"',
    escapeChar: '"',
    skipEmptyLines: true,
    quotes: false,
    quoteEmptyOrNullFields: false,
    quoteLeadingSpace: true,
    quoteTrailingSpace: true,
    determineFieldHasQuotesFunc: undefined,
    rowInsertCommentLines_commentsString: null
};
export class Papa {
    static parse(input, _config) {
        let _realConfig = Object.assign(Object.assign({}, parseConfigUserDefaults), _config);
        let _handle = new ParserHandle(input, _realConfig);
        let results = _handle.parse(input);
        return results;
    }
    static unparse(data, _config) {
        let _realConfig = Object.assign(Object.assign({}, unparseConfigUserDefaults), _config);
        const unparser = new UnParser(data, _realConfig);
        let csv = unparser.unparse();
        return csv;
    }
}
Papa.RECORD_SEP = String.fromCharCode(30);
Papa.UNIT_SEP = String.fromCharCode(31);
Papa.BYTE_ORDER_MARK = '\ufeff';
Papa.BAD_DELIMITERS = ['\r', '\n', '"', '\ufeff'];
Papa.NEED_QUOTES_CHARS = ['\r', '\n'];
Papa.DefaultDelimiter = ','; // Used if not specified and detection fails
Papa.DefaultQuoteChar = '"';
Papa.DefaultEscapeChar = '"';
/** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
class ParserHandle {
    constructor(input, _config) {
        var _a, _b;
        this.input = input;
        this._errors = [];
        let newLine = _config.newline;
        if (!newLine) {
            newLine = this._guessLineEndings(input, _config.quoteChar);
        }
        let comments = (_a = _config.comments) !== null && _a !== void 0 ? _a : '';
        this._delimiterError = false;
        let usedDelimiter = _config.delimiter;
        if (!_config.delimiter) {
            let skipEmptyLines = _config.skipEmptyLines === 'greedy' || _config.skipEmptyLines;
            let delimGuess = this._guessDelimiter(input, newLine, skipEmptyLines, comments, _config.delimitersToGuess);
            if (delimGuess.successful && delimGuess.bestDelimiter) {
                usedDelimiter = delimGuess.bestDelimiter;
            }
            else {
                this._delimiterError = true; // add error after parsing (otherwise it would be overwritten)
                usedDelimiter = Papa.DefaultDelimiter;
            }
        }
        this._effectiveConfig = Object.assign(Object.assign({}, _config), { newline: newLine, previewInRows: (_b = _config.previewInRows) !== null && _b !== void 0 ? _b : 0, comments, delimiter: usedDelimiter });
        this._isGreedySkipEmptyLines = this._effectiveConfig.skipEmptyLines === 'greedy';
    }
    parse(input) {
        let _parser = new Parser(input, this._effectiveConfig, false);
        let result = _parser.parse(input);
        this._processResults(result, this._delimiterError);
        return result;
    }
    _processResults(result, hasDelimiterError) {
        if (result && hasDelimiterError) {
            this._addError('Delimiter', 'UndetectableDelimiter', 'Unable to auto-detect delimiting character; defaulted to \'' + Papa.DefaultDelimiter + '\'');
        }
        // even if skip empty lines is set, we have empty lines here, we filter them out later
        if (this._effectiveConfig.calcLineIndexToCsvLineIndexMapping) {
            //true: calculate a line mapping from input text to csv lines
            var outLineIndexToCsvLineIndexMapping = [];
            var currentCsvLineIndex = 0;
            var lastRealCsvLineIndex = 0;
            for (var i = 0; i < result.data.length; i++) {
                /** @type {Array<String>} */
                var csvLine = result.data[i];
                for (var j = 0; j < csvLine.length; j++) {
                    var csvField = csvLine[j];
                    //csv line cells might contain new line chars...
                    var newLinesCount = csvField.split(this._effectiveConfig.newline).length - 1;
                    for (var k = 0; k < newLinesCount; k++) {
                        outLineIndexToCsvLineIndexMapping.push(currentCsvLineIndex);
                    }
                }
                outLineIndexToCsvLineIndexMapping.push(currentCsvLineIndex);
                //for empty lines we want the next csv line index
                if (this._effectiveConfig.skipEmptyLines && this._testEmptyLine(csvLine, this._isGreedySkipEmptyLines)) {
                    //don't change the index
                }
                else {
                    lastRealCsvLineIndex = currentCsvLineIndex;
                    currentCsvLineIndex++;
                }
            }
            //there is a special case then the last lines are empty, and we want to skip empty lines
            //then the csv line index of that last line should be the last csv line (before it would be an invalid index after we filter out the empty lines)
            //e.g.
            // before:
            // 1,2,3  --> 0
            //			  --> 1
            //				--> 1
            // 4,5,6	--> 1
            // 7,8,9	--> 2
            //				--> 3
            //				--> 4
            //---
            // after:
            // 1,2,3  --> 0
            //			  --> 1
            //				--> 1
            // 4,5,6	--> 1
            // 7,8,9	--> 2
            //				--> 2 (corrected)
            //				--> 2 (corrected)
            if (result.data.length > 0 && this._effectiveConfig.skipEmptyLines) {
                var correctingLineIndexIndex = outLineIndexToCsvLineIndexMapping.length - 1;
                for (var m = result.data.length - 1; m >= 0; m--) {
                    var _csvLine = result.data[m];
                    if (this._testEmptyLine(_csvLine, this._isGreedySkipEmptyLines)) {
                        outLineIndexToCsvLineIndexMapping[correctingLineIndexIndex] = lastRealCsvLineIndex;
                        correctingLineIndexIndex--;
                    }
                    else {
                        // after we find the first line with content, we can stop
                        break;
                    }
                }
            }
            result.meta.outLineIndexToCsvLineIndexMapping = outLineIndexToCsvLineIndexMapping;
        }
        if (this._effectiveConfig.skipEmptyLines) {
            //see https://github.com/mholt/PapaParse/pull/912/files
            // for (var i = 0; i < _results.data.length; i++)
            // 	if (testEmptyLine(_results.data[i]))
            // 		_results.data.splice(i--, 1);
            var filterData = result.data.map((row) => {
                return !this._testEmptyLine(row, this._isGreedySkipEmptyLines);
            });
            result.data = result.data.filter(function (d, i) {
                return filterData[i];
            });
            if (result.meta.cellIsQuotedInfo) {
                result.meta.cellIsQuotedInfo = result.meta.cellIsQuotedInfo.filter(function (d, i) {
                    return filterData[i];
                });
            }
        }
    }
    _guessDelimiter(input, newline, skipEmptyLines, comments, delimitersToGuess) {
        let bestDelim = null;
        let bestDelta = null;
        let maxFieldCount = null;
        let fieldCountPrevRow = null;
        for (let i = 0; i < delimitersToGuess.length; i++) {
            let delim = delimitersToGuess[i];
            let delta = 0, avgFieldCount = 0, emptyLinesCount = 0;
            fieldCountPrevRow = null;
            const configForGuessing = Object.assign(Object.assign({}, this._effectiveConfig), { comments: comments, delimiter: delim, newline: newline, previewInRows: 10, calcColumnIndexToCsvColumnIndexMapping: false, calcLineIndexToCsvLineIndexMapping: false, retainQuoteInformation: false });
            let parserForGuessing = new Parser(input, configForGuessing, true);
            let preview = parserForGuessing.parse(input);
            for (let j = 0; j < preview.data.length; j++) {
                if (skipEmptyLines && this._testEmptyLine(preview.data[j], this._isGreedySkipEmptyLines)) {
                    emptyLinesCount++;
                    continue;
                }
                let fieldCount = preview.data[j].length;
                avgFieldCount += fieldCount;
                if (fieldCountPrevRow === null) {
                    fieldCountPrevRow = fieldCount;
                    continue;
                }
                else if (fieldCount > 0) {
                    delta += Math.abs(fieldCount - fieldCountPrevRow);
                    fieldCountPrevRow = fieldCount;
                }
            }
            if (preview.data.length > 0) {
                avgFieldCount /= (preview.data.length - emptyLinesCount);
            }
            if ((bestDelta === null || delta <= bestDelta)
                && (maxFieldCount === null || avgFieldCount > maxFieldCount) && avgFieldCount > 1.99) {
                bestDelta = delta;
                bestDelim = delim;
                maxFieldCount = avgFieldCount;
            }
        }
        return {
            successful: bestDelim !== null,
            bestDelimiter: bestDelim
        };
    }
    //this does not play nice with unmatched quotes on the last field (because all new lines are removed by the regex)
    //the regex works but maybe it should be ([^*]*?)?
    _guessLineEndings(input, quoteChar) {
        input = input.substr(0, 1024 * 1024); // max length 1 MB
        // Replace all the text inside quotes
        let re = new RegExp(escapeRegExp(quoteChar) + '([^]*?)' + escapeRegExp(quoteChar), 'gm');
        input = input.replace(re, '');
        let r = input.split('\r');
        let n = input.split('\n');
        let nAppearsFirst = (n.length > 1 && n[0].length < r[0].length);
        if (r.length === 1 || nAppearsFirst) {
            return '\n';
        }
        let numWithN = 0;
        for (let i = 0; i < r.length; i++) {
            if (r[i][0] === '\n') {
                numWithN++;
            }
        }
        return numWithN >= r.length / 2
            ? '\r\n'
            : '\r';
    }
    _addError(type, code, msg, row) {
        this._errors.push({
            type: type,
            code: code,
            message: msg,
            row: row
        });
    }
    /**
     * tests if a line is considered empty
     */
    _testEmptyLine(line, greedy) {
        return greedy
            ? line.join('').trim() === ''
            : line.length === 1 && line[0].length === 0;
    }
}
class Parser {
    constructor(input, config, isGuessingDelimiter) {
        this._input = input;
        this._config = config;
        this._quoteSearch = -1;
        this._nextNewline = -1;
        this._cursor = 0;
        this._lastCursor = -1;
        this._data = [];
        this._row = [];
        this._errors = [];
        this._delim = config.delimiter;
        this._newlineString = config.newline;
        this._quoteChar = config.quoteChar;
        this._inputLen = input.length;
        this._escapeChar = config.escapeChar;
        this._previewInRows = config.previewInRows;
        this._firstQuoteInformationRowFound = false;
        this._currentRowStartIndex = 0;
        this._isGuessingDelimiter = isGuessingDelimiter;
        this._retainQuoteInformation = config.retainQuoteInformation;
        this._maxGuessLength = config.maxDelimiterGuessLength;
        this._comments = config.comments;
        this._rowInsertCommentLines_commentsString = config.rowInsertCommentLines_commentsString;
        //out
        this._columnIsQuoted = [];
        this._cellIsQuotedInfo = [];
        this._outColumnIndexToCsvColumnIndexMapping = config.calcColumnIndexToCsvColumnIndexMapping
            ? []
            : null;
        this._currRowColumnIndexToCsvColumnIndexMapping = [];
        //for output
        this._cellIsQuotedInfoRow = [];
        //some checks
        if (!this._quoteChar) {
            this._quoteChar = Papa.DefaultQuoteChar;
        }
        if (!this._escapeChar) {
            this._escapeChar = Papa.DefaultEscapeChar;
        }
        // Delimiter must be valid
        if (Papa.BAD_DELIMITERS.indexOf(this._delim) > -1) {
            this._delim = Papa.DefaultDelimiter;
        }
        // Comment character must be valid
        if (this._comments === this._delim) {
            throw new Error('Comment character same as delimiter');
        }
        else if (Papa.BAD_DELIMITERS.indexOf(this._comments) > -1) {
            this._comments = '';
        }
        // Newline must be valid: \r, \n, or \r\n
        if (this._newlineString !== '\n' && this._newlineString !== '\r' && this._newlineString !== '\r\n') {
            this._newlineString = '\n';
        }
    }
    parse(input) {
        let _config = this._config;
        // We don't need to compute some of these every time parse() is called,
        // but having them in a more local scope seems to perform better
        var delimLen = _config.delimiter.length, newlineLen = _config.newline.length, commentsLen = _config.comments.length;
        if (!input) {
            return this.returnable();
        }
        if (input.indexOf(this._quoteChar) === -1) {
            let rows = input.split(this._newlineString);
            let row = '';
            for (var i = 0; i < rows.length; i++) {
                row = rows[i];
                //we could trim left here but this would not be compatible with not fast mode...
                let isCommentRow = this._rowInsertCommentLines_commentsString && row.startsWith(this._rowInsertCommentLines_commentsString);
                let _row = null;
                //although we know that there are no quotes (--> columnIsQuoted must be all false entries...)
                //but we want/need to set the right length for the quote array (first real row)
                this._cursor += row.length;
                if (i !== rows.length - 1) {
                    this._cursor += this._newlineString.length;
                }
                if (this._comments && row.substr(0, commentsLen) === this._comments) {
                    continue;
                }
                _row = !isCommentRow
                    ? row.split(this._delim)
                    : [row];
                if (this._retainQuoteInformation && this._firstQuoteInformationRowFound === false) {
                    //in fast mode there are no quote characters...
                    this._columnIsQuoted = Array(_row.length).fill(false);
                }
                if (this._outColumnIndexToCsvColumnIndexMapping) {
                    if (isCommentRow) {
                        //only one string in the row
                        this._currRowColumnIndexToCsvColumnIndexMapping.push(row.length - 1); //-1 to get 0 based index
                    }
                    else {
                        //we have only delimiters...
                        var _cummulativeLength = 0;
                        // eslint-disable-next-line no-loop-func
                        _row.forEach((value, index) => {
                            if (index !== _row.length - 1) {
                                _cummulativeLength += value.length + delimLen;
                            }
                            else {
                                _cummulativeLength += value.length;
                            }
                            this._currRowColumnIndexToCsvColumnIndexMapping.push(_cummulativeLength - 1); //-1 to get 0 based index
                        });
                    }
                }
                this.pushRow(_row);
                if (this._previewInRows && i >= this._previewInRows) {
                    this._data = this._data.slice(0, this._previewInRows);
                    return this.returnable();
                }
            }
            if (!this._isGuessingDelimiter && this._retainQuoteInformation) {
                //in fast mode we don't have quotes
                this._cellIsQuotedInfo = Array(this._data.length);
                for (var rowI = 0; rowI < this._data.length; rowI++) {
                    var cells = this._data[rowI];
                    this._cellIsQuotedInfo[rowI] = Array(cells.length).fill(false);
                }
            }
            return this.returnable();
        }
        let nextDelim = input.indexOf(this._delim, this._cursor);
        this._nextNewline = input.indexOf(this._newlineString, this._cursor);
        let quoteCharRegex = new RegExp(escapeRegExp(this._escapeChar) + escapeRegExp(this._quoteChar), 'g');
        this._quoteSearch = input.indexOf(this._quoteChar, this._cursor);
        //we don't use fast mode so we assume some field is quoted...
        this._columnIsQuoted = [];
        this._cellIsQuotedInfo = [];
        this._cellIsQuotedInfoRow = [];
        let currentFieldEndIndex = -1;
        //if the text does not contain the delimiter (not even in quoted fields) we can return early
        if (this._isGuessingDelimiter && nextDelim === -1 && this._cursor === 0) {
            return this.finish('');
        }
        // Parser loop
        for (;;) {
            // Field has opening quote
            if (input[this._cursor] === this._quoteChar) {
                // Start our search for the closing quote where the cursor is
                this._quoteSearch = this._cursor;
                if (this._retainQuoteInformation) {
                    if (this._firstQuoteInformationRowFound === false) {
                        this._columnIsQuoted.push(true);
                    }
                    this._cellIsQuotedInfoRow.push(true);
                }
                // Skip the opening quote
                this._cursor++;
                for (;;) {
                    // Find closing quote
                    this._quoteSearch = input.indexOf(this._quoteChar, this._quoteSearch + 1);
                    // we exceeded the max search length for the delimiter, give up
                    if (this._isGuessingDelimiter && this._maxGuessLength && this._quoteSearch > this._maxGuessLength) {
                        return this.finish('');
                    }
                    //No other quotes are found - no other delimiters
                    if (this._quoteSearch === -1) {
                        if (true) {
                            // No closing quote... what a pity
                            this._errors.push({
                                type: 'Quotes',
                                code: 'MissingQuotes',
                                message: 'Quoted field unterminated',
                                row: this._data.length, // row has yet to be inserted
                                index: this._cursor
                            });
                        }
                        if (this._nextNewline === -1) {
                            this.addColumnIndexMapping(this._inputLen - 1);
                        }
                        else {
                            this.addColumnIndexMapping(this._nextNewline - 1);
                        }
                        return this.finish();
                    }
                    // Closing quote at EOF
                    if (this._quoteSearch === this._inputLen - 1) {
                        var value = input.substring(this._cursor, this._quoteSearch).replace(quoteCharRegex, this._quoteChar);
                        currentFieldEndIndex = this._quoteSearch;
                        this.addColumnIndexMapping(currentFieldEndIndex);
                        return this.finish(value);
                    }
                    // If this quote is escaped, it's part of the data; skip it
                    // If the quote character is the escape character, then check if the next character is the escape character
                    if (this._quoteChar === this._escapeChar && input[this._quoteSearch + 1] === this._escapeChar) {
                        this._quoteSearch++;
                        continue;
                    }
                    // If the quote character is not the escape character, then check if the previous character was the escape character
                    if (this._quoteChar !== this._escapeChar && this._quoteSearch !== 0 && input[this._quoteSearch - 1] === this._escapeChar) {
                        continue;
                    }
                    if (nextDelim !== -1 && nextDelim < (this._quoteSearch + 1)) {
                        nextDelim = input.indexOf(this._delim, (this._quoteSearch + 1));
                    }
                    if (this._nextNewline !== -1 && this._nextNewline < (this._quoteSearch + 1)) {
                        this._nextNewline = input.indexOf(this._newlineString, (this._quoteSearch + 1));
                    }
                    // Check up to nextDelim or nextNewline, whichever is closest
                    var checkUpTo = this._nextNewline === -1
                        ? nextDelim
                        : Math.min(nextDelim, this._nextNewline);
                    var spacesBetweenQuoteAndDelimiter = this.extraSpaces(checkUpTo);
                    // Closing quote followed by delimiter or 'unnecessary spaces + delimiter'
                    if (input.substr(this._quoteSearch + 1 + spacesBetweenQuoteAndDelimiter, delimLen) === this._delim) {
                        currentFieldEndIndex = this._quoteSearch + spacesBetweenQuoteAndDelimiter + delimLen;
                        this.addColumnIndexMapping(currentFieldEndIndex);
                        this._row.push(input.substring(this._cursor, this._quoteSearch).replace(quoteCharRegex, this._quoteChar));
                        this._cursor = this._quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen;
                        // If char after following delimiter is not quoteChar, we find next quote char position
                        if (input[this._quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen] !== this._quoteChar) {
                            this._quoteSearch = input.indexOf(this._quoteChar, this._cursor);
                        }
                        nextDelim = input.indexOf(this._delim, this._cursor);
                        this._nextNewline = input.indexOf(this._newlineString, this._cursor);
                        break;
                    }
                    var spacesBetweenQuoteAndNewLine = this.extraSpaces(this._nextNewline);
                    // Closing quote followed by newline or 'unnecessary spaces + newLine'
                    if (input.substr(this._quoteSearch + 1 + spacesBetweenQuoteAndNewLine, newlineLen) === this._newlineString) {
                        //special case for mapping because the new line is the row terminator
                        currentFieldEndIndex = this._quoteSearch + spacesBetweenQuoteAndNewLine;
                        this.addColumnIndexMapping(currentFieldEndIndex);
                        this._row.push(input.substring(this._cursor, this._quoteSearch).replace(quoteCharRegex, this._quoteChar));
                        this.saveRow(this._quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen);
                        nextDelim = input.indexOf(this._delim, this._cursor); // because we may have skipped the nextDelim in the quoted field
                        this._quoteSearch = input.indexOf(this._quoteChar, this._cursor); // we search for first quote in next line
                        if (this._previewInRows && this._data.length >= this._previewInRows) {
                            return this.returnable();
                        }
                        break;
                    }
                    // Checks for valid closing quotes are complete (escaped quotes or quote followed by EOF/delimiter/newline) -- assume these quotes are part of an invalid text string
                    this._errors.push({
                        type: 'Quotes',
                        code: 'InvalidQuotes',
                        message: 'Trailing quote on quoted field is malformed',
                        row: this._data.length, // row has yet to be inserted
                        index: this._cursor
                    });
                    this._quoteSearch++;
                    continue;
                }
                continue;
            }
            if (this._retainQuoteInformation) {
                if (this._firstQuoteInformationRowFound === false) {
                    this._columnIsQuoted.push(false);
                }
                this._cellIsQuotedInfoRow.push(false);
            }
            // Comment found at start of new line
            if (this._comments && this._row.length === 0 && input.substr(this._cursor, commentsLen) === this._comments) {
                if (this._nextNewline === -1) // Comment ends at EOF
                 {
                    return this.returnable();
                }
                this._cursor = this._nextNewline + newlineLen;
                this._nextNewline = input.indexOf(this._newlineString, this._cursor);
                nextDelim = input.indexOf(this._delim, this._cursor);
                continue;
            }
            // eslint-disable-next-line camelcase
            if (this._row.length === 0 && this._rowInsertCommentLines_commentsString && input.substr(this._cursor, this._rowInsertCommentLines_commentsString.length) === this._rowInsertCommentLines_commentsString) {
                if (this._nextNewline === -1) {
                    //add the last comment
                    // eslint-disable-next-line camelcase
                    currentFieldEndIndex = input.length - 1;
                    this.addColumnIndexMapping(currentFieldEndIndex);
                    this._row.push(input.substring(this._cursor));
                    this.pushRow(this._row); // is called in finish
                    return this.returnable();
                }
                currentFieldEndIndex = this._nextNewline - 1;
                this.addColumnIndexMapping(currentFieldEndIndex);
                this._row.push(input.substring(this._cursor, this._nextNewline));
                this.saveRow(this._nextNewline + newlineLen);
                nextDelim = input.indexOf(this._delim, this._cursor);
                continue;
            }
            // Next delimiter comes before next newline, so we've reached end of field
            if (nextDelim !== -1 && (nextDelim < this._nextNewline || this._nextNewline === -1)) {
                // we check, if we have quotes, because delimiter char may be part of field enclosed in quotes
                if (this._quoteSearch > nextDelim) { //patched
                    // we have quotes, so we try to find the next delimiter not enclosed in quotes and also next starting quote char
                    var nextDelimObj = this.getNextUnqotedDelimiter(nextDelim, this._quoteSearch, this._nextNewline);
                    // if we have next delimiter char which is not enclosed in quotes
                    if (nextDelimObj.nextDelim !== null && nextDelimObj.quoteSearch !== null) {
                        nextDelim = nextDelimObj.nextDelim;
                        this._quoteSearch = nextDelimObj.quoteSearch;
                        currentFieldEndIndex = nextDelim;
                        this.addColumnIndexMapping(currentFieldEndIndex);
                        this._row.push(input.substring(this._cursor, nextDelim));
                        this._cursor = nextDelim + delimLen;
                        // we look for next delimiter char
                        nextDelim = input.indexOf(this._delim, this._cursor);
                        continue;
                    }
                }
                else {
                    currentFieldEndIndex = nextDelim;
                    this.addColumnIndexMapping(currentFieldEndIndex);
                    this._row.push(input.substring(this._cursor, nextDelim));
                    this._cursor = nextDelim + delimLen;
                    nextDelim = input.indexOf(this._delim, this._cursor);
                    continue;
                }
            }
            // End of row
            if (this._nextNewline !== -1) {
                currentFieldEndIndex = this._nextNewline - 1;
                this.addColumnIndexMapping(currentFieldEndIndex);
                this._row.push(input.substring(this._cursor, this._nextNewline));
                this.saveRow(this._nextNewline + newlineLen);
                //remove this? why? this only disables the next if??
                if (this._firstQuoteInformationRowFound) {
                }
                if (this._previewInRows && this._data.length >= this._previewInRows) {
                    return this.returnable();
                }
                continue;
            }
            break;
        }
        currentFieldEndIndex = input.length - 1;
        this.addColumnIndexMapping(currentFieldEndIndex);
        return this.finish();
    }
    pushRow(row) {
        this._data.push(row);
        this._lastCursor = this._cursor;
        if (this._outColumnIndexToCsvColumnIndexMapping) {
            this._outColumnIndexToCsvColumnIndexMapping.push(this._currRowColumnIndexToCsvColumnIndexMapping);
            this._currRowColumnIndexToCsvColumnIndexMapping = [];
        }
        this._currentRowStartIndex = this._cursor;
        if (this._retainQuoteInformation) {
            this._cellIsQuotedInfo.push(this._cellIsQuotedInfoRow);
            this._cellIsQuotedInfoRow = [];
        }
        if (this._firstQuoteInformationRowFound === false) {
            if (this._row.length === 1 &&
                (this._row[0] === '' //empty row is skipped in ui --> no quote information
                    || this._rowInsertCommentLines_commentsString && this._row[0].startsWith(this._rowInsertCommentLines_commentsString))) { //comment row should not give
                this._firstQuoteInformationRowFound = false;
                this._columnIsQuoted = []; //reset for next row
            }
            else {
                this._firstQuoteInformationRowFound = true;
            }
        }
    }
    /**
     * adds the given index to the column mapping if we still calculate it
     * @param cumulativeColumnIndex
     */
    addColumnIndexMapping(cumulativeColumnIndex) {
        if (this._outColumnIndexToCsvColumnIndexMapping) {
            this._currRowColumnIndexToCsvColumnIndexMapping.push(cumulativeColumnIndex - this._currentRowStartIndex);
        }
    }
    /**
     * Appends the remaining input from cursor to the end into
     * row, saves the row, calls step, and returns the results.
     */
    finish(value) {
        if (typeof value === 'undefined') {
            value = this._input.substr(this._cursor);
        }
        this._row.push(value);
        this._cursor = this._inputLen; // important in case parsing is paused
        this.pushRow(this._row);
        return this.returnable();
    }
    /**
     * Appends the current row to the results. It sets the cursor
     * to newCursor and finds the nextNewline. The caller should
     * take care to execute user's step function and check for
     * preview and end parsing if necessary.
     */
    saveRow(newCursor) {
        this._cursor = newCursor;
        this.pushRow(this._row);
        this._row = [];
        this._nextNewline = this._input.indexOf(this._newlineString, this._cursor);
    }
    /** Returns an object with the results, errors, and meta. */
    returnable() {
        let result = {
            data: this._data,
            errors: this._errors,
            meta: {
                delimiter: this._delim,
                linebreak: this._newlineString,
                cursor: this._lastCursor,
                columnIsQuoted: this._columnIsQuoted,
                cellIsQuotedInfo: this._cellIsQuotedInfo,
                outColumnIndexToCsvColumnIndexMapping: this._outColumnIndexToCsvColumnIndexMapping,
                outLineIndexToCsvLineIndexMapping: null //is set in post-processing
            },
        };
        // use config because we use calcColumnIndexToCsvColumnIndexMapping to notify top
        if (this._outColumnIndexToCsvColumnIndexMapping) {
            result.meta.outColumnIndexToCsvColumnIndexMapping = this._outColumnIndexToCsvColumnIndexMapping;
        }
        return result;
    }
    /** Gets the delimiter character, which is not inside the quoted field */
    getNextUnqotedDelimiter(nextDelim, quoteSearch, nextNewline) {
        var result = {
            nextDelim: null,
            quoteSearch: null
        };
        // get the next closing quote character
        var nextQuoteSearch = this._input.indexOf(this._quoteChar, quoteSearch + 1);
        // if next delimiter is part of a field enclosed in quotes
        if (nextDelim > quoteSearch && nextDelim < nextQuoteSearch && (nextQuoteSearch < nextNewline || nextNewline === -1)) {
            // get the next delimiter character after this one
            var nextNextDelim = this._input.indexOf(this._delim, nextQuoteSearch);
            // if there is no next delimiter, return default result
            if (nextNextDelim === -1) {
                return result;
            }
            // find the next opening quote char position
            if (nextNextDelim > nextQuoteSearch) {
                nextQuoteSearch = this._input.indexOf(this._quoteChar, nextQuoteSearch + 1);
            }
            // try to get the next delimiter position
            result = this.getNextUnqotedDelimiter(nextNextDelim, nextQuoteSearch, nextNewline);
        }
        else {
            result = {
                nextDelim: nextDelim,
                quoteSearch: quoteSearch
            };
        }
        return result;
    }
    /**
     * checks if there are extra spaces after closing quote and given index without any text
     * if Yes, returns the number of spaces
     */
    extraSpaces(index) {
        let spaceLength = 0;
        if (index !== -1) {
            let textBetweenClosingQuoteAndIndex = this._input.substring(this._quoteSearch + 1, index);
            if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === '') {
                spaceLength = textBetweenClosingQuoteAndIndex.length;
            }
        }
        return spaceLength;
    }
}
class UnParser {
    constructor(_data, _config) {
        this._data = _data;
        this._quotes = _config.quotes;
        this._delimiter = _config.delimiter;
        this._newlineChar = _config.newlineChar;
        this._quoteChar = _config.quoteChar;
        // this._escapedQuote = this._quoteChar + this._quoteChar
        this._escapedQuote = _config.escapeChar + this._quoteChar;
        this._skipEmptyLines = _config.skipEmptyLines === 'greedy' || _config.skipEmptyLines;
        this._isGreedySkipEmptyLines = _config.skipEmptyLines === 'greedy';
        this._quoteLeadingSpace = _config.quoteLeadingSpace;
        this._quoteTrailingSpace = _config.quoteTrailingSpace;
        this._determineFieldHasQuotesFunc = _config.determineFieldHasQuotesFunc;
        this._rowInsertCommentLines_commentsString = _config.rowInsertCommentLines_commentsString;
        this._quoteEmptyOrNullFields = _config.quoteEmptyOrNullFields;
        this._quoteCharRegex = new RegExp(escapeRegExp(this._quoteChar), 'g');
        //some checks
        //we could use the check from parse: if (Papa.BAD_DELIMITERS.indexOf(this._delimiter) > -1) {
        //but this was already here and we don't want to change the behavior that much
        //user could set: +,+ as delimiter and this would be invalid but not equal to some of the BAD_DELIMITERS (only substring)
        // if (!Papa.BAD_DELIMITERS.filter(function(value) { return _config.delimiter.indexOf(value) !== -1; }).length)
        if (!Papa.BAD_DELIMITERS.some(value => _config.delimiter.indexOf(value) !== -1)) {
            this._delimiter = Papa.DefaultDelimiter;
        }
    }
    unparse() {
        var csv = '';
        // Then write out the data
        for (var row = 0; row < this._data.length; row++) {
            let maxCol = this._data[row].length;
            let emptyLine = false;
            let nullLine = this._data[row].length === 0;
            if (this._skipEmptyLines) {
                emptyLine = this._isGreedySkipEmptyLines
                    ? this._data[row].join('').trim() === ''
                    : this._data[row].length === 1 && this._data[row][0].length === 0;
            }
            if (!emptyLine) {
                // eslint-disable-next-line camelcase
                if (this._data[row].length > 0 && this._rowInsertCommentLines_commentsString) {
                    if (typeof this._data[row][0] === 'string' && this._data[row][0].startsWith(this._rowInsertCommentLines_commentsString)) {
                        csv += this._data[row][0] + this._newlineChar;
                        continue;
                    }
                }
                for (var col = 0; col < maxCol; col++) {
                    if (col > 0 && !nullLine) {
                        csv += this._delimiter;
                    }
                    var colIdx = col;
                    csv += this.safe(this._data[row][colIdx], row, col);
                }
                if (row < this._data.length - 1 && (!this._skipEmptyLines || (maxCol > 0 && !nullLine))) {
                    csv += this._newlineChar;
                }
            }
        }
        return csv;
    }
    /** Encloses a value around quotes if needed (makes a value safe for CSV insertion) */
    safe(str, row, col) {
        if (str === '' || str === null || str === undefined) {
            if (this._quoteEmptyOrNullFields) {
                return this._quoteChar + '' + this._quoteChar;
            }
            return '';
        }
        // if (str.constructor === Date) {
        //   return JSON.stringify(str).slice(1, 25);
        // }
        // str = str.toString();
        var containsQuotes = str.indexOf(this._quoteChar) > -1;
        str = str.replace(this._quoteCharRegex, this._escapedQuote);
        var _preTestNeedQuotes = false;
        if (this._determineFieldHasQuotesFunc) {
            _preTestNeedQuotes = this._determineFieldHasQuotesFunc(str, row, col);
            if (_preTestNeedQuotes === undefined || _preTestNeedQuotes === null) {
                _preTestNeedQuotes = false;
            }
        }
        let _quotes_option_is_array = Array.isArray(this._quotes);
        // eslint-disable-next-line camelcase
        var needsQuotes = (!_quotes_option_is_array && this._quotes)
            // eslint-disable-next-line camelcase
            || (_quotes_option_is_array && this._quotes[col])
            || _preTestNeedQuotes
            || this._hasAny(str, Papa.NEED_QUOTES_CHARS) // new line, \r
            || containsQuotes
            || str.indexOf(this._delimiter) > -1 //delimiter
            || this._quoteLeadingSpace && str.charAt(0) === ' ' // starts with a space
            || this._quoteTrailingSpace && str.charAt(str.length - 1) === ' '; // ends with a space
        return needsQuotes
            ? this._quoteChar + str + this._quoteChar
            : str;
    }
    _hasAny(str, substrings) {
        for (var i = 0; i < substrings.length; i++)
            if (str.indexOf(substrings[i]) > -1) {
                return true;
            }
        return false;
    }
}
