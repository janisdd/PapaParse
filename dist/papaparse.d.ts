export type ParseConfig = {
    /**
     * empty for auto-detect
     */
    delimiter: '' | string;
    /**
     * empty for auto-detect
     */
    newline: '' | '\r' | '\n' | '\r\n';
    /**
     * when a cell starts with this string, it is treated as a comment and the row is ignored
     *
     * if you want to include comment rows in the parse result, use {@link rowInsertCommentLines_commentsString}
     */
    comments: string | null;
    /**
     * used to treat comments as normal 1 cell rows
     * - parse: rowInsertCommentLines_commentsString !== null, left trimmed strings starting with it are treated as comments and are parsed into a row with 1 cell
     * - unparse: rowInsertCommentLines_commentsString !== null, left trimmed strings first cells will be trimmed left and only the first cell will be exported
     */
    rowInsertCommentLines_commentsString: string | null;
    /**
     * if a field should contain the delimiter but as data and not as delimiter, it must be quoted
     */
    quoteChar: string;
    /**
     * quotes are normally ignored as they don't change the resulting data
     * but for some applications we need to know if a cell was quoted
     * true: the result will contain the information if a cell was quoted or not
     * see {@link ParseParseResult.columnIsQuoted} and {@link ParseParseResult.cellIsQuotedInfo}
     */
    retainQuoteInformation: boolean;
    /**
     * if a field should contain the quoteChar but as data and not as quoteChar, it must be escaped
     */
    escapeChar: string;
    /**
     * f true, lines that are completely empty (those which evaluate to an empty string) will be skipped. If set to 'greedy',
     * lines that evaluate to empty strings after processing will also be skipped.
     */
    skipEmptyLines: boolean | 'greedy';
    delimitersToGuess: string[];
    /**
     * the max number of characters of the input to guess the delimiter
     */
    maxDelimiterGuessLength: number;
    /**
     * If > 0, only that many rows will be parsed.
     * TODO rename
     */
    previewInRows: number | null;
    calcLineIndexToCsvLineIndexMapping: boolean;
    calcColumnIndexToCsvColumnIndexMapping: boolean;
};
export type ParseParseResult = {
    data: string[][];
    errors: ParseError[];
    /**
     * meta information about the parsing
     */
    meta: ParseResultMeta;
};
export interface ParseResultMeta {
    /**
     * Delimiter used
     */
    delimiter: string;
    /**
     * Line break sequence used
     */
    linebreak: string;
    cursor: number;
    /**
     * when {@link ParseConfig.retainQuoteInformation} is set to true, this array contains the information if a column was quoted or not
     * a column is quoted if the first cell of the column was quoted
     *
     * @deprecated
     * this is more a legacy feature, use {@link cellIsQuotedInfo} instead
     */
    columnIsQuoted: boolean[] | null;
    /**
     * when {@link ParseConfig.retainQuoteInformation} is set to true, this array contains the information if a cell was quoted or not
     */
    cellIsQuotedInfo: boolean[][] | null;
    /**
     * for each line index in the input text the csv line index it refers to
     */
    outLineIndexToCsvLineIndexMapping: number[] | null;
    outColumnIndexToCsvColumnIndexMapping: number[][] | null;
}
export interface ParseError {
    /**
     * A generalization of the error
     */
    type: string;
    /**
     * Standardized error code
     */
    code: string;
    /**
     * Human-readable details
     */
    message: string;
    /**
     * Row index of parsed data where error is
     */
    row?: number;
    /**
     * column index (cursor position) of the error
     */
    index?: number;
}
export type ParseUnparseConfig = {
    delimiter: string;
    newlineChar: string;
    quoteChar: string;
    escapeChar: string;
    skipEmptyLines: boolean | 'greedy';
    /**
     * If true, forces all fields to be enclosed in quotes.
     * If an array of true/false values, specifies which fields should be force-quoted (first boolean is for the first column, second boolean for the second column, ...)
     *
     * @note
     * old version used option columnIsQuoted for the array but we changed it back to one option
     */
    quotes: boolean | boolean[];
    /**
     * true: quote empty/null/undefined fields
     */
    quoteEmptyOrNullFields: boolean;
    quoteLeadingSpace: boolean;
    quoteTrailingSpace: boolean;
    determineFieldHasQuotesFunc?: ((field: string, row: number, col: number) => boolean);
    /**
     * see {@link ParseConfig.rowInsertCommentLines_commentsString}
     */
    rowInsertCommentLines_commentsString: string | null;
};
export declare class Papa {
    static RECORD_SEP: string;
    static UNIT_SEP: string;
    static BYTE_ORDER_MARK: string;
    static BAD_DELIMITERS: string[];
    static NEED_QUOTES_CHARS: string[];
    static DefaultDelimiter: string;
    static DefaultQuoteChar: string;
    static DefaultEscapeChar: string;
    static parse(input: string, _config: Partial<ParseConfig>): ParseParseResult;
    static unparse(data: string[][], _config: ParseUnparseConfig): string;
}
