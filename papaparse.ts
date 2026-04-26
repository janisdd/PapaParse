/* @license
Papa Parse
v5.0.0-custom-2.1.0
https://github.com/mholt/PapaParse
License: MIT
commit: 49170b76b382317356c2f707e2e4191430b8d495
fork -> https://github.com/janisdd/PapaParse/tree/fix609_main
*/
/*

NOTE that the built version is not in sync!!

changelog: (latest first)

- `quoteChar` can now be empty `""` in read and write config to treat quotes as normal characters
- changed unparse result from string to object
  - now includes meta data about the result
    - mapping from csv fields to string position

- manually converted to typescript
  - added types
  - removed some unused code (node js stuff, streaming, ...)
  - dist includes real .d.ts file
  - dist includes umd version
  - dist includes minified version
  - changed to vitest for testing
- added tracking of csv field to input position mapping (includes extra spaces, added tests for this)
  - some features are not supported in preview mode (e.g. most mappings)

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

export type FieldPosition = {
  start: number
  end: number
}

export type ParseConfigAll = {
  /**
   * empty for auto-detect
   */
  delimiter: '' | string

  /**
   * empty for auto-detect
   */
  newline: '' | '\r' | '\n' | '\r\n'

  /**
   * when a cell starts with this string, it is treated as a comment and the row is ignored
   *
   * if you want to include comment rows in the parse result, use {@link rowInsertCommentLines_commentsString} and set this to null
   */
  comments: string | null

  /**
   * used to treat comments as normal 1 cell rows
   * - parse: rowInsertCommentLines_commentsString !== null, left trimmed strings starting with it are treated as comments and are parsed into a row with 1 cell
   * - unparse: rowInsertCommentLines_commentsString !== null, left trimmed strings first cells will be trimmed left and only the first cell will be exported
   */
  rowInsertCommentLines_commentsString: string | null


  /**
   * if a field should contain the delimiter but as data and not as delimiter, it must be quoted
   */
  quoteChar: string


  /**
   * quotes are normally ignored as they don't change the resulting data
   * but for some applications we need to know if a cell was quoted
   * true: the result will contain the information if a cell was quoted or not
   * see {@link ParseResult.columnIsQuoted} and {@link ParseResult.cellIsQuotedInfo}
   * false: information will be null
   */
  retainQuoteInformation: boolean

  /**
   * if a field should contain the quoteChar but as data and not as quoteChar, it must be escaped
   * empty to use quote char
   */
  escapeChar: '' | string


  /**
   * f true, lines that are completely empty (those which evaluate to an empty string) will be skipped. If set to 'greedy',
   * lines that evaluate to empty strings after processing will also be skipped.
   */
  skipEmptyLines: boolean | 'greedy'

  delimitersToGuess: string[]

  /**
   * the max number of characters of the input to guess the delimiter
   */
  maxDelimiterGuessLength: number

  /**
   * If > 0, only that many rows will be parsed.
   * null or <= 0 to not use preview
   */
  previewInRows: number | null

  //this is calculated in post-processing after parsing
  calcLineIndexToCsvLineIndexMapping: boolean
  calcColumnIndexToCsvColumnIndexMapping: boolean
  calcCsvFieldToInputPositionMapping: boolean

}
export type ParseConfig = Partial<ParseConfigAll>

export type ParseResult = {
  data: string[][]
  errors: ParseError[]
  /**
   * meta information about the parsing
   */
  meta: ParseResultMeta
}

export interface ParseResultMeta {
  /**
   * Delimiter used
   */
  delimiter: string
  /**
   * Line break sequence used
   */
  linebreak: string

  cursor: number;

  /**
   * when {@link ParseConfigAll.retainQuoteInformation} is set to true, this array contains the information if a column was quoted or not
   * a column is quoted if the first cell of the column was quoted
   *
   * @deprecated
   * this is more a legacy feature, use {@link cellIsQuotedInfo} instead
   */
  columnIsQuoted: boolean[] | null
  /**
   * when {@link ParseConfigAll.retainQuoteInformation} is set to true, this array contains the information if a cell was quoted or not
   */
  cellIsQuotedInfo: boolean[][] | null

  /**
   * for each line index in the input text the csv line index it refers to
   */
  outLineIndexToCsvLineIndexMapping: number[] | null
  //TODO
  outColumnIndexToCsvColumnIndexMapping: number[][] | null

  outCsvFieldToInputPositionMapping: FieldPosition[][] | null
}

export interface ParseError {
  /**
   * A generalization of the error
   */
  type: string
  /**
   * Standardized error code
   */
  code: string
  /**
   * Human-readable details
   */
  message: string
  /**
   * Row index of parsed data where error is
   */
  row?: number

  /**
   * column index (cursor position) of the error
   */
  index?: number
}

export type UnparseResult = {
  csv: string
  /**
   * meta information about the unparsing
   */
  meta: UnparseResultMeta
}

export interface UnparseResultMeta {
  outCsvFieldToInputPositionMapping: FieldPosition[][] | null
}

export type UnparseConfigAll = {

  delimiter: string
  newline: string
  quoteChar: string
  /**
   * empty to use quote char
   */
  escapeChar: '' | string
  skipEmptyLines: boolean | 'greedy'

  /**
   * If true, forces all fields to be enclosed in quotes.
   * If an array of true/false values, specifies which fields should be force-quoted (first boolean is for the first column, second boolean for the second column, ...)
   *
   * @note
   * old version used option columnIsQuoted for the array but we changed it back to one option
   */
  quotes: boolean | boolean[]

  /**
   * true: quote empty/null/undefined fields
   */
  quoteEmptyOrNullFields: boolean

  quoteLeadingSpace: boolean
  quoteTrailingSpace: boolean

  determineFieldHasQuotesFunc?: ((field: string, row: number, col: number) => boolean)

  /**
   * see {@link ParseConfigAll.rowInsertCommentLines_commentsString}
   */
  rowInsertCommentLines_commentsString: string | null

  calcCsvFieldToInputPositionMapping: boolean
}
export type UnparseConfig = Partial<UnparseConfigAll>

/**
 * some options might be unset or will bet auto-detected,
 * this is the effective configuration
 */
export interface ParseConfigEffective extends ParseConfigAll {
  delimiter: string
  newline: '\r' | '\n' | '\r\n'
  //empty when no comment string
  comments: string
  previewInRows: number
}


/**
 * only exports to inspect defaults
 */
export const __parseConfigUserDefaults: ParseConfigAll = {
  delimiter: '',
  newline: '',
  comments: null,
  quoteChar: '"',
  retainQuoteInformation: false,
  escapeChar: '',
  skipEmptyLines: false,
  delimitersToGuess: [',', '\t', '|', ';', String.fromCharCode(30), String.fromCharCode(31)],
  maxDelimiterGuessLength: 5000,
  previewInRows: null,
  rowInsertCommentLines_commentsString: null,
  calcColumnIndexToCsvColumnIndexMapping: false,
  calcLineIndexToCsvLineIndexMapping: false,
  calcCsvFieldToInputPositionMapping: false,
}

/**
 * only exports to inspect defaults
 */
export const __unparseConfigUserDefaults: UnparseConfigAll = {
  delimiter: ',',
  newline: '\r\n',
  quoteChar: '"',
  escapeChar: '', //empty to use quote char
  skipEmptyLines: false,
  quotes: false,
  quoteEmptyOrNullFields: false,
  quoteLeadingSpace: true,
  quoteTrailingSpace: true,
  determineFieldHasQuotesFunc: undefined,
  rowInsertCommentLines_commentsString: null,
  calcCsvFieldToInputPositionMapping: false,
}

export class Papa {
  //TODO const
  static RECORD_SEP = String.fromCharCode(30)
  static UNIT_SEP = String.fromCharCode(31)
  static BYTE_ORDER_MARK = '\ufeff'
  static BAD_DELIMITERS = ['\r', '\n', '"', '\ufeff']
  static NEED_QUOTES_CHARS = ['\r', '\n']
  static DefaultDelimiter = ','			// Used if not specified and detection fails
  static DefaultQuoteChar = '"'
  static DefaultEscapeChar = '"'

  static parse(input: string, _config?: ParseConfig) {
    const _realConfig: ParseConfigAll = {
      ...__parseConfigUserDefaults,
      ..._config
    }
    const _handle = new ParserHandle(input, _realConfig)
    const results = _handle.parse(input)
    return results
  }

  static unparse(data: Array<Array<string | null | undefined>>, _config?: UnparseConfig) {
    const _realConfig: UnparseConfigAll = {
      ...__unparseConfigUserDefaults,
      ..._config
    }

    const unparser = new UnParser(_realConfig)
    const csv = unparser.unparse(data)
    return csv
  }

}

/** https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

class ParserHandle {
  _effectiveConfig: ParseConfigEffective

  _delimiterError: boolean

  _isGreedySkipEmptyLines: boolean

  constructor(public input: string, _config: ParseConfigAll) {

    let newLine = _config.newline

    if (!newLine) {
      newLine = this._guessLineEndings(input, _config.quoteChar)
    }

    const comments = _config.comments ?? ''

    this._delimiterError = false
    let usedDelimiter = _config.delimiter

    if (!_config.delimiter) {
      const skipEmptyLines = _config.skipEmptyLines === 'greedy' || _config.skipEmptyLines
      const delimGuess = this._guessDelimiter(
        input,
        newLine,
        skipEmptyLines,
        comments,
        _config.quoteChar,
        _config.delimitersToGuess
      )

      if (delimGuess.successful && delimGuess.bestDelimiter) {
        usedDelimiter = delimGuess.bestDelimiter
      } else {
        this._delimiterError = true	// add error after parsing (otherwise it would be overwritten)
        usedDelimiter = Papa.DefaultDelimiter
      }
    }

    this._effectiveConfig = {
      ..._config,
      newline: newLine,
      previewInRows: _config.previewInRows ?? 0,
      comments,
      delimiter: usedDelimiter,
    }

    if (this._effectiveConfig.previewInRows < 0) {
      this._effectiveConfig.previewInRows = 0
    }

    this._isGreedySkipEmptyLines = this._effectiveConfig.skipEmptyLines === 'greedy'
  }

  parse(input: string) {
    const _parser = new Parser(this._effectiveConfig, false)
    const result = _parser.parse(input)

    //these are set to empty arrays to not initialize them differently
    //but user expects this to be null if quote info is not necessary
    if (!this._effectiveConfig.retainQuoteInformation) {
      result.meta.columnIsQuoted = null
      result.meta.cellIsQuotedInfo = null
    }

    this._processResults(result, this._delimiterError)
    return result
  }

  _processResults(result: ParseResult, hasDelimiterError: boolean) {
    if (result && hasDelimiterError) {
      this._addError(result, 'Delimiter', 'UndetectableDelimiter', 'Unable to auto-detect delimiting character; defaulted to \'' + Papa.DefaultDelimiter + '\'')
    }

    // even if skip empty lines is set, we have empty lines here, we filter them out later
    if (this._effectiveConfig.calcLineIndexToCsvLineIndexMapping) {
      //true: calculate a line mapping from input text to csv lines
      const outLineIndexToCsvLineIndexMapping = []
      let currentCsvLineIndex = 0
      let lastRealCsvLineIndex = 0

      for (let i = 0; i < result.data.length; i++) {
        /** @type {Array<String>} */
        const csvLine = result.data[i]

        for (let j = 0; j < csvLine.length; j++) {
          const csvField = csvLine[j]

          //csv line cells might contain new line chars...
          const newLinesCount = csvField.split(this._effectiveConfig.newline).length - 1

          for (let k = 0; k < newLinesCount; k++) {
            outLineIndexToCsvLineIndexMapping.push(currentCsvLineIndex)
          }
        }

        outLineIndexToCsvLineIndexMapping.push(currentCsvLineIndex)

        //for empty lines we want the next csv line index
        if (this._effectiveConfig.skipEmptyLines && ParserHandle._testEmptyLine(csvLine, this._isGreedySkipEmptyLines)) {
          //don't change the index
        } else {
          lastRealCsvLineIndex = currentCsvLineIndex
          currentCsvLineIndex++
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

        let correctingLineIndexIndex = outLineIndexToCsvLineIndexMapping.length - 1
        for (let m = result.data.length - 1; m >= 0; m--) {
          const _csvLine = result.data[m]

          if (ParserHandle._testEmptyLine(_csvLine, this._isGreedySkipEmptyLines)) {
            outLineIndexToCsvLineIndexMapping[correctingLineIndexIndex] = lastRealCsvLineIndex
            correctingLineIndexIndex--

          } else {
            // after we find the first line with content, we can stop
            break
          }
        }
      }

      result.meta.outLineIndexToCsvLineIndexMapping = outLineIndexToCsvLineIndexMapping
    }

    if (this._effectiveConfig.skipEmptyLines) {
      //see https://github.com/mholt/PapaParse/pull/912/files
      // for (var i = 0; i < _results.data.length; i++)
      // 	if (testEmptyLine(_results.data[i]))
      // 		_results.data.splice(i--, 1);
      const filterData = result.data.map((row) => !ParserHandle._testEmptyLine(row, this._isGreedySkipEmptyLines))

      result.data = result.data.filter((d, i) => filterData[i])

      if (result.meta.cellIsQuotedInfo) {
        result.meta.cellIsQuotedInfo = result.meta.cellIsQuotedInfo.filter((d, i) => filterData[i])
      }


    }
  }

  _guessDelimiter(input: string, newline: '\r' | '\n' | '\r\n', skipEmptyLines: boolean, comments: string, quoteChar: string, delimitersToGuess: string[]) {
    let bestDelim: string | null = null
    let bestDelta: number | null = null
    let maxFieldCount: number | null = null

    for (let i = 0; i < delimitersToGuess.length; i++) {
      const delim = delimitersToGuess[i]
      let delta = 0
      let avgFieldCount = 0
      let emptyLinesCount = 0
      let fieldCountPrevRow: number | null = null

      const configForGuessing: ParseConfigEffective = {
        ...this._effectiveConfig,
        comments: comments,
        delimiter: delim,
        newline: newline,
        quoteChar: quoteChar,
        previewInRows: 10,
        calcColumnIndexToCsvColumnIndexMapping: false,
        calcLineIndexToCsvLineIndexMapping: false,
        calcCsvFieldToInputPositionMapping: false,
        retainQuoteInformation: false,
      }

      const parserForGuessing = new Parser(configForGuessing, true)
      const preview = parserForGuessing.parse(input)

      for (let j = 0; j < preview.data.length; j++) {
        if (skipEmptyLines && ParserHandle._testEmptyLine(preview.data[j], this._isGreedySkipEmptyLines)) {
          emptyLinesCount++
          continue
        }
        const fieldCount = preview.data[j].length
        avgFieldCount += fieldCount

        if (fieldCountPrevRow === null) {
          fieldCountPrevRow = fieldCount
          continue
        } else if (fieldCount > 0) {
          delta += Math.abs(fieldCount - fieldCountPrevRow)
          fieldCountPrevRow = fieldCount
        }
      }

      if (preview.data.length > 0) {
        avgFieldCount /= (preview.data.length - emptyLinesCount)
      }

      if ((bestDelta === null || delta <= bestDelta)
        && (maxFieldCount === null || avgFieldCount > maxFieldCount) && avgFieldCount > 1.99) {
        bestDelta = delta
        bestDelim = delim
        maxFieldCount = avgFieldCount
      }
    }

    return {
      successful: bestDelim !== null,
      bestDelimiter: bestDelim
    }
  }

  //this does not play nice with unmatched quotes on the last field (because all new lines are removed by the regex)
  //the regex works but maybe it should be ([^*]*?)?
  _guessLineEndings(input: string, quoteChar: string) {

    input = input.substr(0, 1024 * 1024)	// max length 1 MB
    // Replace all the text inside quotes
    const re = new RegExp(escapeRegExp(quoteChar) + '([^]*?)' + escapeRegExp(quoteChar), 'gm')
    input = input.replace(re, '')

    const r = input.split('\r')
    const n = input.split('\n')
    const nAppearsFirst = (n.length > 1 && n[0].length < r[0].length)

    if (r.length === 1 || nAppearsFirst) {
      return '\n'
    }

    let numWithN = 0
    for (let i = 0; i < r.length; i++) {
      if (r[i][0] === '\n') {
        numWithN++
      }
    }

    return numWithN >= r.length / 2
           ? '\r\n'
           : '\r'
  }

  _addError(result: ParseResult, type: string, code: string, msg: string, row?: number) {
    result.errors.push({
      type: type,
      code: code,
      message: msg,
      row: row
    })
  }

  /**
   * tests if a line is considered empty
   *
   * skipEmptyLines:
   * If true, lines that are completely empty (those which evaluate to an empty string) will be skipped. empty lines do not have a delimiter, thus only one cell
   * If set to 'greedy', lines that don't have any content (those which have only whitespace after parsing) will also be skipped.
   */
  static _testEmptyLine(line: Array<string | null | undefined>, greedy: boolean): boolean {
    //tested: ['', null, undefined].join('').trim() --> ''
    //checking for line.length = 0 is not needed because all loops will not iterate once
    return greedy
           ? line.join('').trim() === ''
           : line.length === 1 && (line[0] === null || line[0] === undefined || line[0].length === 0)
  }

}


export class Parser {
  _config: ParseConfigEffective

  _input: string

  _quoteSearch: number

  _nextNewline: number

  _cursor: number

  _lastCursor: number

  _data: string[][]

  _row: string[]

  _errors: ParseError[]

  _delim: string

  _quoteChar: string

  _newlineString: string

  _inputLen: number

  _escapeChar: string

  _previewInRows: number

  //when we set this to true we got the right quote information
  //(when need to skip empty & comment rows and during this we might reset columnIsQuoted multiple times)
  _firstQuoteInformationRowFound: boolean

  _maxGuessLength: number

  _isGuessingDelimiter: boolean

  /**
   * normally when parsing quotes are discarded as they don't change the retrieved data
   * true: collect information about quotes (cells, columns)
   * false: do not collect quote information
   * see {@link _columnIsQuoted}, {@link _cellIsQuotedInfo}
   *
   * NOTE: if false -> we keep the arrays empty and in post-processing we set them to null (not here)
   *
   *
   * to determine if a column is quoted we use the first cell only (if a column has no cells then it's not quoted)
   * so if the first line has only 3 columns and all other more than 3 (e.g. 4) then all columns starting from 4 are treated as not quoted!!
   * not that there is no difference if we have column headers (first row is used)
   * comment rows are ignored for this
   */
  _retainQuoteInformation: boolean

  _columnIsQuoted: boolean[]

  //TODO what about comment, empty lines??
  /** @type {boolean[][]} for each cell the info if it was quoted originally */
  _cellIsQuotedInfo: boolean[][]
  _cellIsQuotedInfoRow: boolean[]

  //string index used to calculate the relative current field index in the current row
  _currentRowStartIndex: number

  _comments: string

  _rowInsertCommentLines_commentsString: string | null

  //note this is the 0 based string index of the fields
  //this also includes the separators
  //e.g. "1,2222,33" --> [1, 6, 8]
  //because
  // [0,1] = "1,"
  // [2,3,4,5,6] = "2222,"
  // [7,8] = "33"
  //if we us the indices we should always get the delimiter(end)
  //can be -1 if the field is empty (because we don't skip empty lines before post-processing)(e.g. when the last line is \n)
  //this is because the out csv line mapping includes entries for the text file lines
  _outColumnIndexToCsvColumnIndexMapping: number[][] | null
  //not null, we check _outColumnIndexToCsvColumnIndexMapping before
  _currSingleRowColumnIndexToCsvColumnIndexMapping: number[]

  // MEMBERS FOR TRACKING ORIGINAL FIELD POSITIONS
  _outFieldPositionMapping: Array<Array<FieldPosition>> | null
  _currentRowFieldPositions: Array<FieldPosition> = []
  _fieldStart: number = 0

  constructor(config: ParseConfigEffective, isGuessingDelimiter: boolean) {
    this._input = ''
    this._inputLen = -1
    this._config = config
    this._quoteSearch = -1
    this._nextNewline = -1
    this._cursor = 0
    this._lastCursor = -1
    this._data = []
    this._row = []
    this._errors = []
    this._delim = config.delimiter
    this._newlineString = config.newline
    this._quoteChar = config.quoteChar
    this._previewInRows = config.previewInRows
    this._firstQuoteInformationRowFound = false
    this._currentRowStartIndex = 0
    this._isGuessingDelimiter = isGuessingDelimiter
    this._retainQuoteInformation = config.retainQuoteInformation
    this._maxGuessLength = config.maxDelimiterGuessLength
    this._comments = config.comments
    this._rowInsertCommentLines_commentsString = config.rowInsertCommentLines_commentsString

    //out
    this._columnIsQuoted = []
    this._cellIsQuotedInfo = []

    this._currSingleRowColumnIndexToCsvColumnIndexMapping = []
    this._outColumnIndexToCsvColumnIndexMapping = config.calcColumnIndexToCsvColumnIndexMapping
                                                  ? []
                                                  : null

    this._outFieldPositionMapping = config.calcCsvFieldToInputPositionMapping
                                    ? []
                                    : null


    //for output
    this._cellIsQuotedInfoRow = []

    //some checks

    // we now allow empty quote char --> then quotes are ALWAYS part of the field value
    // if (!this._quoteChar) {
    //   this._quoteChar = Papa.DefaultQuoteChar
    // }

    this._escapeChar = config.escapeChar
                       ? config.escapeChar
                       : this._quoteChar

    // Delimiter must be valid
    if (Papa.BAD_DELIMITERS.indexOf(this._delim) > -1) {
      this._delim = Papa.DefaultDelimiter
    }

    // Comment character must be valid
    if (this._comments === this._delim) {
      throw new Error('Comment character same as delimiter')
    } else if (Papa.BAD_DELIMITERS.indexOf(this._comments) > -1) {
      this._comments = ''
    }

    // Newline must be valid: \r, \n, or \r\n
    if (this._newlineString !== '\n' && this._newlineString !== '\r' && this._newlineString !== '\r\n') {
      this._newlineString = '\n'
    }

  }

  parse(input: string): ParseResult {
    this._input = input
    this._inputLen = input.length
    const _config = this._config
    // We don't need to compute some of these every time parse() is called,
    // but having them in a more local scope seems to perform better
    const delimLen = _config.delimiter.length
    const newlineLen = _config.newline.length
    const commentsLen = _config.comments.length

    if (!input) {
      return this.returnable()
    }

    if (!this._quoteChar || input.indexOf(this._quoteChar) === -1) {

      const rows = input.split(this._newlineString)
      let rowString = ''

      for (let i = 0; i < rows.length; i++) {
        const rowStart = this._cursor
        rowString = rows[i]

        //we could trim left here but this would not be compatible with not fast mode...
        const isCommentRow = this._rowInsertCommentLines_commentsString && rowString.startsWith(this._rowInsertCommentLines_commentsString)
        let _row = null

        //although we know that there are no quotes (--> columnIsQuoted must be all false entries...)
        //but we want/need to set the right length for the quote array (first real row)

        this._cursor += rowString.length
        if (i !== rows.length - 1) {
          this._cursor += this._newlineString.length
        }
        if (this._comments && rowString.substr(0, commentsLen) === this._comments && !isCommentRow) {
          continue
        }

        _row = !isCommentRow
               ? rowString.split(this._delim)
               : [rowString]

        if (this._retainQuoteInformation && this._firstQuoteInformationRowFound === false) {
          //in fast mode there are no quote characters...
          this._columnIsQuoted = Array(_row.length).fill(false)
        }

        if (this._outColumnIndexToCsvColumnIndexMapping) {
          if (isCommentRow) {
            //only one string in the row
            this._currSingleRowColumnIndexToCsvColumnIndexMapping.push(rowString.length - 1) //-1 to get 0 based index
          } else {
            //we have only delimiters...
            let _cummulativeLength = 0
            // eslint-disable-next-line no-loop-func
            _row.forEach((value, index) => {
              if (index !== _row.length - 1) {
                _cummulativeLength += value.length + delimLen
              } else {
                _cummulativeLength += value.length
              }
              this._currSingleRowColumnIndexToCsvColumnIndexMapping.push(_cummulativeLength - 1) //-1 to get 0 based index
            })
          }
        }

        if (!this._isGuessingDelimiter && this._outFieldPositionMapping) {
          //set cell position info
          this._currentRowFieldPositions = []
          let currFieldStart = rowStart
          for (let j = 0; j < _row.length; j++) {
            this._currentRowFieldPositions.push({
              start: currFieldStart,
              end: currFieldStart + _row[j].length
            })
            //we can always add the delim len because after the last cell there is no next cell (start is not used again)
            currFieldStart += _row[j].length + delimLen
          }
          //push row will add field positions
        }

        this.pushRow(_row)


        if (this._previewInRows > 0 && this._previewInRows <= i) {
          this._data = this._data.slice(0, this._previewInRows)
          return this.returnable()
        }


      }

      //TODO preview in rows
      if (!this._isGuessingDelimiter && this._retainQuoteInformation) {
        //in fast mode we don't have quotes
        this._cellIsQuotedInfo = Array(this._data.length)
        for (let rowI = 0; rowI < this._data.length; rowI++) {
          const cells = this._data[rowI]
          this._cellIsQuotedInfo[rowI] = Array(cells.length).fill(false)
        }
      }

      return this.returnable()
    }

    let nextDelim = input.indexOf(this._delim, this._cursor)
    this._nextNewline = input.indexOf(this._newlineString, this._cursor)
    const quoteCharRegex = new RegExp(escapeRegExp(this._escapeChar) + escapeRegExp(this._quoteChar), 'g')
    this._quoteSearch = input.indexOf(this._quoteChar, this._cursor)
    //we don't use fast mode so we assume some field is quoted...
    this._columnIsQuoted = []
    this._cellIsQuotedInfo = []
    this._cellIsQuotedInfoRow = []

    let currentFieldEndIndex = -1

    //if the text does not contain the delimiter (not even in quoted fields) we can return early
    if (this._isGuessingDelimiter && nextDelim === -1 && this._cursor === 0) {
      return this.finish('')
    }

    // Parser loop
    for (; ;) {
      // Set the start of the current field
      this._fieldStart = this._cursor
      // Field has opening quote
      if (input[this._cursor] === this._quoteChar) {
        // Start our search for the closing quote where the cursor is
        this._quoteSearch = this._cursor

        if (this._retainQuoteInformation) {
          if (this._firstQuoteInformationRowFound === false) {
            this._columnIsQuoted.push(true)
          }
          this._cellIsQuotedInfoRow.push(true)
        }

        // Skip the opening quote
        this._cursor++

        for (; ;) {
          // Find closing quote
          this._quoteSearch = input.indexOf(this._quoteChar, this._quoteSearch + 1)

          // we exceeded the max search length for the delimiter, give up
          if (this._isGuessingDelimiter && this._maxGuessLength && this._quoteSearch > this._maxGuessLength) {
            return this.finish('')
          }

          //No other quotes are found - no other delimiters
          if (this._quoteSearch === -1) {
            // No closing quote... what a pity
            this._errors.push({
              type: 'Quotes',
              code: 'MissingQuotes',
              message: 'Quoted field unterminated',
              row: this._data.length,	// row has yet to be inserted
              index: this._cursor
            })

            const fieldEnd = this._nextNewline === -1
                             ? this._inputLen
                             : this._nextNewline + 1

            this.addFieldPosition(this._fieldStart, fieldEnd)

            if (this._nextNewline === -1) {
              this.addColumnIndexMapping(this._inputLen - 1)
            } else {
              this.addColumnIndexMapping(this._nextNewline - 1)
            }

            return this.finish()
          }

          // Closing quote at EOF
          if (this._quoteSearch === this._inputLen - 1) {
            const value = input.substring(this._cursor, this._quoteSearch).replace(quoteCharRegex, this._quoteChar)
            const fieldEnd = this._quoteSearch + 1
            this.addFieldPosition(this._fieldStart, fieldEnd)
            currentFieldEndIndex = this._quoteSearch
            this.addColumnIndexMapping(currentFieldEndIndex)
            return this.finish(value)
          }

          // If this quote is escaped, it's part of the data; skip it
          // If the quote character is the escape character, then check if the next character is the escape character
          if (this._quoteChar === this._escapeChar && input[this._quoteSearch + 1] === this._escapeChar) {
            this._quoteSearch++
            continue
          }

          // If the quote character is not the escape character, then check if the previous character was the escape character
          if (this._quoteChar !== this._escapeChar && this._quoteSearch !== 0 && input[this._quoteSearch - 1] === this._escapeChar) {
            continue
          }

          if (nextDelim !== -1 && nextDelim < (this._quoteSearch + 1)) {
            nextDelim = input.indexOf(this._delim, (this._quoteSearch + 1))
          }
          if (this._nextNewline !== -1 && this._nextNewline < (this._quoteSearch + 1)) {
            this._nextNewline = input.indexOf(this._newlineString, (this._quoteSearch + 1))
          }

          // Check up to nextDelim or nextNewline, whichever is closest
          const checkUpTo = this._nextNewline === -1
                            ? nextDelim
                            : Math.min(nextDelim, this._nextNewline)
          const spacesBetweenQuoteAndDelimiter = this.extraSpaces(checkUpTo)

          // Closing quote followed by delimiter or 'unnecessary spaces + delimiter'
          if (input.substr(this._quoteSearch + 1 + spacesBetweenQuoteAndDelimiter, delimLen) === this._delim) {
            currentFieldEndIndex = this._quoteSearch + spacesBetweenQuoteAndDelimiter + delimLen
            this.addColumnIndexMapping(currentFieldEndIndex)

            //+1 because end is exclusive but start is inclusive: "A" -> 0,3
            this.addFieldPosition(this._fieldStart, currentFieldEndIndex + 1 - delimLen)
            this._row.push(input.substring(this._cursor, this._quoteSearch).replace(quoteCharRegex, this._quoteChar))
            this._cursor = this._quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen

            // If char after following delimiter is not quoteChar, we find next quote char position
            if (input[this._quoteSearch + 1 + spacesBetweenQuoteAndDelimiter + delimLen] !== this._quoteChar) {
              this._quoteSearch = input.indexOf(this._quoteChar, this._cursor)
            }
            nextDelim = input.indexOf(this._delim, this._cursor)
            this._nextNewline = input.indexOf(this._newlineString, this._cursor)
            break
          }

          const spacesBetweenQuoteAndNewLine = this.extraSpaces(this._nextNewline)

          // Closing quote followed by newline or 'unnecessary spaces + newLine'
          if (input.substr(this._quoteSearch + 1 + spacesBetweenQuoteAndNewLine, newlineLen) === this._newlineString) {
            //special case for mapping because the new line is the row terminator
            currentFieldEndIndex = this._quoteSearch + spacesBetweenQuoteAndNewLine
            this.addColumnIndexMapping(currentFieldEndIndex)

            //+1 because end is exclusive but start is inclusive: "A" -> 0,3
            this.addFieldPosition(this._fieldStart, currentFieldEndIndex + 1)
            this._row.push(input.substring(this._cursor, this._quoteSearch).replace(quoteCharRegex, this._quoteChar))
            this.saveRow(this._quoteSearch + 1 + spacesBetweenQuoteAndNewLine + newlineLen)
            nextDelim = input.indexOf(this._delim, this._cursor)	// because we may have skipped the nextDelim in the quoted field
            this._quoteSearch = input.indexOf(this._quoteChar, this._cursor)	// we search for first quote in next line

            if (this._previewInRows > 0 && this._data.length >= this._previewInRows) {
              return this.returnable()
            }

            break
          }


          // Checks for valid closing quotes are complete (escaped quotes or quote followed by EOF/delimiter/newline) -- assume these quotes are part of an invalid text string
          this._errors.push({
            type: 'Quotes',
            code: 'InvalidQuotes',
            message: 'Trailing quote on quoted field is malformed',
            row: this._data.length,	// row has yet to be inserted
            index: this._cursor
          })

          this._quoteSearch++
          continue

        }

        continue
      }

      if (this._retainQuoteInformation) {
        this._cellIsQuotedInfoRow.push(false)
      }

      // Comment found at start of new line
      if (this._comments && !this._rowInsertCommentLines_commentsString
        && this._row.length === 0
        && input.substr(this._cursor, commentsLen) === this._comments) {

        // for comments we don't call pushRow, so we need to end the cell quote info manually
        // but for comments we don't want the quote info, so just reset it
        if (this._retainQuoteInformation) {
          this._cellIsQuotedInfoRow = []
        }

        if (this._nextNewline === -1)	// Comment ends at EOF
        {
          return this.returnable()
        }
        this._cursor = this._nextNewline + newlineLen
        this._nextNewline = input.indexOf(this._newlineString, this._cursor)
        nextDelim = input.indexOf(this._delim, this._cursor)
        continue
      }

      if (this._retainQuoteInformation) {
        if (this._firstQuoteInformationRowFound === false) {
          this._columnIsQuoted.push(false)
        }
      }

      // eslint-disable-next-line camelcase
      if (this._row.length === 0
        && this._rowInsertCommentLines_commentsString
        && input.substr(this._cursor, this._rowInsertCommentLines_commentsString.length
        ) === this._rowInsertCommentLines_commentsString) {

        if (this._nextNewline === -1) {
          //add the last comment

          // eslint-disable-next-line camelcase
          currentFieldEndIndex = input.length
          this.addColumnIndexMapping(currentFieldEndIndex)

          this.addFieldPosition(this._fieldStart, currentFieldEndIndex)
          this._row.push(input.substring(this._cursor))
          this.pushRow(this._row) // is called in finish
          return this.returnable()
        }

        currentFieldEndIndex = this._nextNewline
        this.addColumnIndexMapping(currentFieldEndIndex)

        this.addFieldPosition(this._fieldStart, currentFieldEndIndex)
        this._row.push(input.substring(this._cursor, this._nextNewline))
        this.saveRow(this._nextNewline + newlineLen)
        nextDelim = input.indexOf(this._delim, this._cursor)
        continue
      }

      // Next delimiter comes before next newline, so we've reached end of field
      if (nextDelim !== -1 && (nextDelim < this._nextNewline || this._nextNewline === -1)) {
        // we check, if we have quotes, because delimiter char may be part of field enclosed in quotes
        if (this._quoteSearch > nextDelim) { //patched
          // we have quotes, so we try to find the next delimiter not enclosed in quotes and also next starting quote char
          const nextDelimObj = this.getNextUnqotedDelimiter(nextDelim, this._quoteSearch, this._nextNewline)

          // if we have next delimiter char which is not enclosed in quotes
          if (nextDelimObj.nextDelim !== null && nextDelimObj.quoteSearch !== null) {
            nextDelim = nextDelimObj.nextDelim
            this._quoteSearch = nextDelimObj.quoteSearch

            currentFieldEndIndex = nextDelim
            this.addColumnIndexMapping(currentFieldEndIndex)
            this.addFieldPosition(this._fieldStart, currentFieldEndIndex)

            this._row.push(input.substring(this._cursor, nextDelim))
            this._cursor = nextDelim + delimLen
            // we look for next delimiter char
            nextDelim = input.indexOf(this._delim, this._cursor)
            continue
          }
        } else {

          currentFieldEndIndex = nextDelim
          this.addColumnIndexMapping(currentFieldEndIndex)
          this.addFieldPosition(this._fieldStart, currentFieldEndIndex)

          this._row.push(input.substring(this._cursor, nextDelim))
          this._cursor = nextDelim + delimLen
          nextDelim = input.indexOf(this._delim, this._cursor)
          continue
        }
      }

      // End of row
      if (this._nextNewline !== -1) {
        currentFieldEndIndex = this._nextNewline - 1
        this.addColumnIndexMapping(currentFieldEndIndex)
        //+1 because end is exclusive
        this.addFieldPosition(this._fieldStart, currentFieldEndIndex + 1)
        this._row.push(input.substring(this._cursor, this._nextNewline))
        this.saveRow(this._nextNewline + newlineLen)

        if (this._previewInRows && this._data.length >= this._previewInRows) {
          return this.returnable()
        }

        continue
      }

      break
    }

    currentFieldEndIndex = input.length - 1
    this.addColumnIndexMapping(currentFieldEndIndex)
    //+1 because end is exclusive
    this.addFieldPosition(this._fieldStart, currentFieldEndIndex + 1)

    return this.finish()
  }


  pushRow(row: string[]) {
    this._data.push(row)
    this._lastCursor = this._cursor

    if (this._outColumnIndexToCsvColumnIndexMapping) {
      this._outColumnIndexToCsvColumnIndexMapping.push(this._currSingleRowColumnIndexToCsvColumnIndexMapping)
      this._currSingleRowColumnIndexToCsvColumnIndexMapping = []
    }
    this._currentRowStartIndex = this._cursor

    if (this._retainQuoteInformation) {
      this._cellIsQuotedInfo.push(this._cellIsQuotedInfoRow)
      this._cellIsQuotedInfoRow = []
    }

    if (this._firstQuoteInformationRowFound === false) {

      if (this._row.length === 1 &&
        (this._row[0] === '' //empty row is skipped in ui --> no quote information
          || this._rowInsertCommentLines_commentsString && this._row[0].startsWith(this._rowInsertCommentLines_commentsString))) { //comment row should not give
        this._firstQuoteInformationRowFound = false
        this._columnIsQuoted = [] //reset for next row
      } else {
        this._firstQuoteInformationRowFound = true
      }
    }

    if (this._outFieldPositionMapping) {
      // Record the field positions for this row
      this._outFieldPositionMapping.push(this._currentRowFieldPositions)
      this._currentRowFieldPositions = []
    }
  }

  /**
   * adds the given index to the column mapping if we still calculate it
   * @param cumulativeColumnIndex
   */
  addColumnIndexMapping(cumulativeColumnIndex: number) {
    if (this._outColumnIndexToCsvColumnIndexMapping) {
      this._currSingleRowColumnIndexToCsvColumnIndexMapping.push(cumulativeColumnIndex - this._currentRowStartIndex)
    }
  }

  /**
   * Appends the remaining input from cursor to the end into
   * row, saves the row, calls step, and returns the results.
   */
  finish(value?: string) {
    if (typeof value === 'undefined') {
      value = this._input.substr(this._cursor)
    }
    this._row.push(value)
    //we don't need to add cell position mapping here because
    //everywhere we call this method we manually add the mapping already
    this._cursor = this._inputLen	// important in case parsing is paused
    this.pushRow(this._row)
    return this.returnable()
  }

  /**
   * Appends the current row to the results. It sets the cursor
   * to newCursor and finds the nextNewline. The caller should
   * take care to execute user's step function and check for
   * preview and end parsing if necessary.
   */
  saveRow(newCursor: number) {
    this._cursor = newCursor
    this.pushRow(this._row)
    this._row = []
    this._nextNewline = this._input.indexOf(this._newlineString, this._cursor)
  }

  /** Returns an object with the results, errors, and meta. */
  returnable(): ParseResult {

    const result: ParseResult = {
      data: this._data,
      errors: this._errors,
      meta: {
        delimiter: this._delim,
        linebreak: this._newlineString,
        cursor: this._lastCursor,
        columnIsQuoted: this._columnIsQuoted,
        cellIsQuotedInfo: this._cellIsQuotedInfo,
        outColumnIndexToCsvColumnIndexMapping: this._outColumnIndexToCsvColumnIndexMapping,
        outLineIndexToCsvLineIndexMapping: null, //is set in post-processing
        outCsvFieldToInputPositionMapping: this._outFieldPositionMapping,
      },
    }

    // use config because we use calcColumnIndexToCsvColumnIndexMapping to notify top
    if (this._outColumnIndexToCsvColumnIndexMapping) {
      result.meta.outColumnIndexToCsvColumnIndexMapping = this._outColumnIndexToCsvColumnIndexMapping
    }

    return result
  }

  /** Gets the delimiter character, which is not inside the quoted field */
  getNextUnqotedDelimiter(nextDelim: number, quoteSearch: number, nextNewline: number) {
    let result: {
      nextDelim: number | null,
      quoteSearch: number | null,
    } = {
      nextDelim: null,
      quoteSearch: null
    }
    // get the next closing quote character
    let nextQuoteSearch = this._input.indexOf(this._quoteChar, quoteSearch + 1)

    // if next delimiter is part of a field enclosed in quotes
    if (nextDelim > quoteSearch && nextDelim < nextQuoteSearch && (nextQuoteSearch < nextNewline || nextNewline === -1)) {
      // get the next delimiter character after this one
      const nextNextDelim = this._input.indexOf(this._delim, nextQuoteSearch)

      // if there is no next delimiter, return default result
      if (nextNextDelim === -1) {
        return result
      }
      // find the next opening quote char position
      if (nextNextDelim > nextQuoteSearch) {
        nextQuoteSearch = this._input.indexOf(this._quoteChar, nextQuoteSearch + 1)
      }
      // try to get the next delimiter position
      result = this.getNextUnqotedDelimiter(nextNextDelim, nextQuoteSearch, nextNewline)
    } else {
      result = {
        nextDelim: nextDelim,
        quoteSearch: quoteSearch
      }
    }

    return result
  }

  /**
   * checks if there are extra spaces after closing quote and given index without any text
   * if Yes, returns the number of spaces
   */
  extraSpaces(index: number): number {
    let spaceLength = 0
    if (index !== -1) {
      const textBetweenClosingQuoteAndIndex = this._input.substring(this._quoteSearch + 1, index)
      if (textBetweenClosingQuoteAndIndex && textBetweenClosingQuoteAndIndex.trim() === '') {
        spaceLength = textBetweenClosingQuoteAndIndex.length
      }
    }
    return spaceLength
  }

  // New helper method to record a field's original positions
  private addFieldPosition(start: number, end: number) {
    this._currentRowFieldPositions.push({
      start,
      end
    })
  }
}

class UnParser {
  _data: Array<Array<string | null | undefined>>

  _quotes: boolean | boolean[]

  _delimiter: string

  _newlineChar: string

  _quoteChar: string

  _escapedQuote: string

  _skipEmptyLines: boolean

  _isGreedySkipEmptyLines: boolean

  _quoteLeadingSpace: boolean

  _quoteTrailingSpace: boolean

  _determineFieldHasQuotesFunc: UnparseConfigAll['determineFieldHasQuotesFunc']

  /**
   * if the first cell of a row starts with this string then the row is treated as a comment row -> only the first cell is used
   */
  _rowInsertCommentLines_commentsString: string | null

  _quoteEmptyOrNullFields: boolean

  _quoteCharRegex: RegExp

  _outFieldPositionMapping: Array<Array<FieldPosition>> | null

  constructor(_config: UnparseConfigAll) {
    this._data = []
    this._quotes = _config.quotes
    this._delimiter = _config.delimiter
    this._newlineChar = _config.newline
    this._quoteChar = _config.quoteChar
    this._skipEmptyLines = _config.skipEmptyLines === 'greedy' || _config.skipEmptyLines
    this._isGreedySkipEmptyLines = _config.skipEmptyLines === 'greedy'
    this._quoteLeadingSpace = _config.quoteLeadingSpace
    this._quoteTrailingSpace = _config.quoteTrailingSpace
    this._determineFieldHasQuotesFunc = _config.determineFieldHasQuotesFunc
    this._rowInsertCommentLines_commentsString = _config.rowInsertCommentLines_commentsString
    this._quoteEmptyOrNullFields = _config.quoteEmptyOrNullFields
    this._quoteCharRegex = new RegExp(escapeRegExp(this._quoteChar), 'g')

    this._escapedQuote = _config.escapeChar
                         ? _config.escapeChar + this._quoteChar
                         : this._quoteChar + this._quoteChar

    this._outFieldPositionMapping = _config.calcCsvFieldToInputPositionMapping
                                    ? []
                                    : null
    //some checks

    //we could use the check from parse: if (Papa.BAD_DELIMITERS.indexOf(this._delimiter) > -1) {
    //but this was already here and we don't want to change the behavior that much
    //user could set: +,+ as delimiter and this would be invalid but not equal to some of the BAD_DELIMITERS (only substring)
    // if (!Papa.BAD_DELIMITERS.filter(function(value) { return _config.delimiter.indexOf(value) !== -1 }).length) {
    if (Papa.BAD_DELIMITERS.some((value) => _config.delimiter.indexOf(value) !== -1)) {
      this._delimiter = Papa.DefaultDelimiter
    }

  }

  unparse(_data: Array<Array<string | null | undefined>>): UnparseResult {
    this._data = _data

    let csv = ''

    // Then write out the data
    for (let row = 0; row < this._data.length; row++) {
      const maxCol = this._data[row].length
      let emptyLine = false
      const nullLine = this._data[row].length === 0

      const currentRowFieldPositions: FieldPosition[] = []
      let currFieldPos = 0

      if (this._skipEmptyLines) {
        emptyLine = ParserHandle._testEmptyLine(this._data[row], this._isGreedySkipEmptyLines)
      }

      if (emptyLine) {
        continue
      }

      // eslint-disable-next-line camelcase
      if (this._data[row].length > 0 && this._rowInsertCommentLines_commentsString) {
        const firstCellData = this._data[row][0]
        if (typeof firstCellData === 'string' && firstCellData.startsWith(this._rowInsertCommentLines_commentsString)) {
          currFieldPos = csv.length
          csv += firstCellData

          if (this._outFieldPositionMapping) {
            currentRowFieldPositions.push({
              start: currFieldPos,
              end: csv.length,
            })
            this._outFieldPositionMapping.push(currentRowFieldPositions)
          }

          csv += this._newlineChar
          continue
        }
      }

      for (let col = 0; col < maxCol; col++) {

        if (col > 0 && !nullLine) {
          csv += this._delimiter
        }

        currFieldPos = csv.length

        const colIdx = col
        csv += this.safe(this._data[row][colIdx], row, col)

        currentRowFieldPositions.push({
          start: currFieldPos,
          end: csv.length,
        })
      }

      if (this._outFieldPositionMapping) {
        if (this._skipEmptyLines && maxCol === 0) {
          //special case because _testEmptyLine only evaluates to true if we have at least 1 cell (original behavior)
        } else {
          this._outFieldPositionMapping.push(currentRowFieldPositions)
        }
      }

      if (row < this._data.length - 1 && (!this._skipEmptyLines || (maxCol > 0 && !nullLine))) {
        csv += this._newlineChar
      }

    }

    return {
      csv,
      meta: {
        outCsvFieldToInputPositionMapping: this._outFieldPositionMapping,
      }
    }
  }

  /** Encloses a value around quotes if needed (makes a value safe for CSV insertion) */
  safe(str: string | null | undefined, row: number, col: number) {
    if (str === '' || str === null || str === undefined) {
      if (this._quoteEmptyOrNullFields) {
        return this._quoteChar + '' + this._quoteChar
      }
      return ''
    }

    //just ensure that the value is a string... should be enforced via types but why not
    str = str.toString()
    let containsQuotes = false
    if (this._quoteChar) {
      containsQuotes = str.indexOf(this._quoteChar) > -1
      str = str.replace(this._quoteCharRegex, this._escapedQuote)
    }

    let _preTestNeedQuotes = false
    if (this._determineFieldHasQuotesFunc) {
      _preTestNeedQuotes = this._determineFieldHasQuotesFunc(str, row, col)
      if (_preTestNeedQuotes === undefined || _preTestNeedQuotes === null) {
        _preTestNeedQuotes = false
      }
    }

    const _quotes_option_is_array = Array.isArray(this._quotes)

    const needsQuotes = (!_quotes_option_is_array && this._quotes)
      || (_quotes_option_is_array && (this._quotes as boolean[])[col])
      || _preTestNeedQuotes
      || this._hasAny(str, Papa.NEED_QUOTES_CHARS) // new line, \r
      || containsQuotes
      || str.indexOf(this._delimiter) > -1 //delimiter
      || this._quoteLeadingSpace && str.charAt(0) === ' ' // starts with a space
      || this._quoteTrailingSpace && str.charAt(str.length - 1) === ' ' // ends with a space

    return needsQuotes
           ? this._quoteChar + str + this._quoteChar
           : str
  }

  _hasAny(str: string, substrings: string[]) {
    for (let i = 0; i < substrings.length; i++) {
      if (str.indexOf(substrings[i]) > -1) {
        return true
      }
    }
    return false
  }
}
