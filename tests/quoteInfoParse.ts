import {assert, describe, it} from 'vitest'
import {Papa, ParseConfig, ParseResult} from '../papaparse'


type CellQuotesTestType = {
  description: string
  input: string
  config?: ParseConfig
  notes?: string
  expectedCellQuotes: boolean[][]
}

type ColumnQuotesTestType = {
  description: string
  input: string
  config?: ParseConfig
  notes?: string
  expectedColumnQuotes: boolean[]
}


const PRESERVE_QUOTE_INFORMATION_CELLS_TESTS: CellQuotesTestType[] = [
  {
    description: "fast mode, no quotes, 1 row",
    input: 'a,b, c',
    expectedCellQuotes: [[false, false, false]]
  },
  {
    description: "fast mode, no quotes, same length, 2 rows",
    input: 'a, b, c\na,b, c',
    expectedCellQuotes: [[false, false, false], [false, false, false]]
  },
  {
    description: "fast mode, no quotes, different lengths",
    input: ' a,b, c\na,b\nc',
    expectedCellQuotes: [[false, false, false], [false, false], [false]]
  },
  {
    description: "fast mode, with comment 1",
    input: 'a,b, c\n#test\na,b',
    expectedCellQuotes: [[false, false, false], [false], [false, false]]
  },
  {
    description: "fast mode, with comment 1 at start",
    input: '#test\na,b, c\na,b',
    expectedCellQuotes: [[false], [false, false, false], [false, false]]
  },
  {
    description: "fast mode, with comment 1 at start (with comment char)",
    input: '#test\na,b, c\na,b',
    config: {comments: '#'},
    expectedCellQuotes: [[false, false, false], [false, false]]
  },

  {
    description: "normal mode, 1 row",
    input: 'a,"b",c,"d"',
    expectedCellQuotes: [[false, true, false, true]]
  },
  {
    description: "normal mode, special case with space",
    input: 'a,"b", c, "d"',
    expectedCellQuotes: [[false, true, false, false]]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,b,c',
    expectedCellQuotes: [[false, true, false, true], [false, false, false]]
  },
  {
    description: "normal mode, 2 row with quotes",
    input: 'a,"b",c,"d"\na,"b",c',
    expectedCellQuotes: [[false, true, false, true], [false, true, false]]
  },
  {
    description: "normal mode, 3 row",
    input: 'a,"b",c,"d"\na,"b",c\na',
    expectedCellQuotes: [[false, true, false, true], [false, true, false], [false]]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,"b",c\na,"b"',
    expectedCellQuotes: [[false, true, false, true], [false, true, false], [false, true]]
  },

  {
    description: "normal mode, with comment 1 (no comment char)",
    input: 'a,b, c\n#test\na,"b"',
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1 (quotes array should have the same dimensions as data)",
    input: 'a,b, c\n#test\na,"b"',
    config: {comments: '#'},
    expectedCellQuotes: [[false, false, false], [false, true]]
  },
  {
    description: "normal mode, starts with 1 comment (no comment char)",
    input: '#comment\na,b, c\n#test\na,"b"',
    expectedCellQuotes: [[false], [false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, starts with 1 comment",
    input: '#comment\na,b, c\n#test\na,"b"',
    config: {comments: '#'},
    expectedCellQuotes: [[false, false, false], [false, true]]
  },
  {
    description: "normal mode, starts with 2 comments (no comments)",
    input: '#comment\n#comment 2\na,b, c\n#test\na,"b"',
    expectedCellQuotes: [[false], [false], [false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, starts with 2 comments",
    input: '#comment\n#comment 2\na,b, c\n#test\na,"b"',
    config: {comments: '#'},
    expectedCellQuotes: [[false, false, false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char (no comment char)",
    input: 'a,b, c\n#test\na,+b+',
    config: {quoteChar: '+'},
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char, ignore comments",
    input: 'a,b, c\n#test\na,+b+',
    config: {
      quoteChar: '+',
      comments: '#'
    },
    expectedCellQuotes: [[false, false, false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char 2 (no comment char)",
    input: 'a,b, c\n#test\na,+b+\n#+ab+c\n"a",+b+,c',
    config: {quoteChar: '+'},
    expectedCellQuotes: [[false, false, false], [false], [false, true], [false], [false, true, false]]
  },
  {
    description: "normal mode, with comment 1, different quote char 2",
    input: 'a,b, c\n#test\na,+b+\n#+ab+c\n"a",+b+,c',
    config: {
      quoteChar: '+',
      comments: '#'
    },
    expectedCellQuotes: [[false, false, false], [false, true], [false, true, false]]
  },
  {
    description: "normal mode, escaped quotes",
    input: 'a,b,"c""d"',
    expectedCellQuotes: [[false, false, true]]
  },
  {
    description: "normal mode, different quote char, escaped quotes",
    input: 'a,b,+c"+d+,"e"',
    config: {
      quoteChar: '+',
      escapeChar: '"'
    },
    expectedCellQuotes: [[false, false, true, false]]
  },
  {
    description: "normal mode, with comment 1, escaped quotes (no comment char)",
    input: 'a,b,"c""d"\n#test\na,"b"\n"c""d"',
    expectedCellQuotes: [[false, false, true], [false], [false, true], [true]]
  },
  {
    description: "normal mode, with comment 1, escaped quotes",
    input: 'a,b,"c""d"\n#test\na,"b"\n"c""d"',
    config: {comments: '#'},
    expectedCellQuotes: [[false, false, true], [false, true], [true]]
  },
  {
    description: "normal mode, empty row is like an empty field with defaults",
    input: 'a,b,"c""d"\n\na',
    expectedCellQuotes: [[false, false, true], [false], [false]]
  },
  {
    description: "normal mode, empty row is has no quote info if skipped",
    input: 'a,b,"c""d"\n\na',
    config: {skipEmptyLines: true},
    expectedCellQuotes: [[false, false, true], [false]]
  },
]

const PRESERVE_QUOTE_INFORMATION_CELLS_KEEP_COMMENT_INFOS_TESTS: CellQuotesTestType[] = [
  {
    description: "fast mode, no quotes, 1 row",
    input: 'a,b, c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, false]]
  },
  {
    description: "fast mode, no quotes, same length, 2 rows",
    input: 'a, b, c\na,b, c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, false], [false, false, false]]
  },
  {
    description: "fast mode, no quotes, different lengths",
    input: ' a,b, c\na,b\nc',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, false], [false, false], [false]]
  },
  {
    description: "fast mode, with comment 1",
    input: 'a,b, c\n#test\na,b',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, false], [false], [false, false]]
  },
  {
    description: "fast mode, with comment 1 at start",
    input: '#test\na,b, c\na,b',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false], [false, false, false], [false, false]]
  },

  {
    description: "normal mode, 1 row",
    input: 'a,"b",c,"d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, true, false, true]]
  },
  {
    description: "normal mode, special case with space",
    input: 'a,"b", c, "d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, true, false, false]]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,b,c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, true, false, true], [false, false, false]]
  },
  {
    description: "normal mode, 2 row with quotes",
    input: 'a,"b",c,"d"\na,"b",c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, true, false, true], [false, true, false]]
  },
  {
    description: "normal mode, 3 row",
    input: 'a,"b",c,"d"\na,"b",c\na',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, true, false, true], [false, true, false], [false]]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,"b",c\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, true, false, true], [false, true, false], [false, true]]
  },

  {
    description: "normal mode, with comment 1 (no comment char)",
    input: 'a,b, c\n#test\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, starts with 1 comment (no comment char)",
    input: '#comment\na,b, c\n#test\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false], [false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, starts with 2 comments (no comments)",
    input: '#comment\n#comment 2\na,b, c\n#test\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false], [false], [false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char (no comment char)",
    input: 'a,b, c\n#test\na,+b+',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char",
    input: 'a,b, c\n#test\na,+b+',
    config: {
      quoteChar: '+',
      comments: '#',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char 2 (no comment char)",
    input: 'a,b, c\n#test\na,+b+\n#+ab+c\n"a",+b+,c',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedCellQuotes: [[false, false, false], [false], [false, true], [false], [false, true, false]]
  },
  {
    description: "normal mode, escaped quotes",
    input: 'a,b,"c""d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, true]]
  },
  {
    description: "normal mode, different quote char, escaped quotes",
    input: 'a,b,+c"+d+,"e"',
    config: {
      quoteChar: '+',
      escapeChar: '"',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedCellQuotes: [[false, false, true, false]]
  },
  {
    description: "normal mode, with comment 1, escaped quotes (no comment char)",
    input: 'a,b,"c""d"\n#test\na,"b"\n"c""d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, true], [false], [false, true], [true]]
  },
  {
    description: "normal mode, empty row is like an empty field with defaults",
    input: 'a,b,"c""d"\n\na',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedCellQuotes: [[false, false, true], [false], [false]]
  },
  {
    description: "normal mode, empty row is has no quote info if skipped",
    input: 'a,b,"c""d"\n\na',
    config: {
      skipEmptyLines: true,
      rowInsertCommentLines_commentsString: '#'
    },
    expectedCellQuotes: [[false, false, true], [false]]
  },
]

// column quotes info  (columnIsQuoted, even though deprecated)
// same tests but with column info (first cell decides if column is quoted or not

const PRESERVE_QUOTE_INFORMATION_COLUMNS_TESTS: ColumnQuotesTestType[] = [
  {
    description: "fast mode, no quotes, 1 row",
    input: 'a,b, c',
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, no quotes, same length, 2 rows",
    input: 'a, b, c\na,b, c',
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, no quotes, different lengths",
    input: ' a,b, c\na,b\nc',
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, with comment 1",
    input: 'a,b, c\n#test\na,b',
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, with comment 1 at start",
    input: '#test\na,b, c\na,b',
    expectedColumnQuotes: [false]
  },
  {
    description: "fast mode, with comment 1 at start ignored",
    input: '#test\na,b," c "\na,b',
    config: {comments: '#'},
    expectedColumnQuotes: [false, false, true]
  },

  {
    description: "normal mode, 1 row",
    input: 'a,"b",c,"d"',
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, special case with space",
    input: 'a,"b", c, "d"',
    expectedColumnQuotes: [false, true, false, false]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,b,c',
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, 2 row with quotes",
    input: 'a,"b",c,"d"\na,"b",c',
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, 3 row",
    input: 'a,"b",c,"d"\na,"b",c\na',
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,"b",c\na,"b"',
    expectedColumnQuotes: [false, true, false, true]
  },

  {
    description: "normal mode, with comment 1 (no comment char)",
    input: 'a,b, c\n#test\na,"b"',
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, with comment 1 (quotes array should have the same dimensions as data)",
    input: 'a,b, c\n#test\na,"b"',
    config: {comments: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, starts with 1 comment (no comment char)",
    input: '#comment\na,b, c\n#test\na,"b"',
    expectedColumnQuotes: [false]
  },
  {
    description: "normal mode, starts with 1 comment",
    input: '#comment\na,b, c\n#test\na,"b"',
    config: {comments: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, starts with 2 comments (no comments)",
    input: '#comment\n#comment 2\na,b, c\n#test\na,"b"',
    expectedColumnQuotes: [false]
  },
  {
    description: "normal mode, starts with 2 comments",
    input: '#comment\n#comment 2\na,b, c\n#test\na,"b"',
    config: {comments: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, with comment 1, different quote char (no comment char)",
    input: 'a,b, c\n#test\na,+b+',
    config: {quoteChar: '+'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, with comment 1, different quote char, ignore comments",
    input: 'a,+b+,+1 2, 3 +',
    config: {
      quoteChar: '+',
      comments: '#'
    },
    expectedColumnQuotes: [false, true, true]
  },
  {
    description: "normal mode, with comment 1, different quote char 2 (no comment char)",
    input: '"a",+b+,c',
    config: {quoteChar: '+'},
    expectedColumnQuotes: [false, true, false]
  },
  {
    description: "normal mode, with comment 1, different quote char 2",
    input: '"a",+b+,c\n#test',
    config: {
      quoteChar: '+',
      comments: '#'
    },
    expectedColumnQuotes: [false, true, false]
  },
  {
    description: "normal mode, with comment 1 different quote char 2, 1 (no comments char)",
    input: '#test\na,+b+\n#+ab+c\n"a",+b+,c',
    config: {quoteChar: '+'},
    expectedColumnQuotes: [false]
  },
  {
    description: "normal mode, with comment 1, different quote char 2, 1 ",
    input: '#test\na,+b+\n#+ab+c\n"a",+b+,c',
    config: {
      quoteChar: '+',
      comments: '#'
    },
    expectedColumnQuotes: [false, true]
  },
  {
    description: "normal mode, with comment 1, different quote char 2, 2  (no comments char)",
    input: '#+ab+c\n"a",+b+,c',
    config: {quoteChar: '+'},
    expectedColumnQuotes: [false]
  },

  {
    description: "normal mode, escaped quotes",
    input: 'a,b,"c""d"',
    expectedColumnQuotes: [false, false, true]
  },
  {
    description: "normal mode, different quote char, escaped quotes",
    input: 'a,b,+c"+d+,"e"',
    config: {
      quoteChar: '+',
      escapeChar: '"'
    },
    expectedColumnQuotes: [false, false, true, false]
  },
  {
    description: "normal mode, with comment 1, escaped quotes (no comment char)",
    input: 'a,b,"c""d"\n#test\na,"b"\n"c""d"',
    expectedColumnQuotes: [false, false, true]
  },
  {
    description: "normal mode, with comment 1, escaped quotes",
    input: '#comment\na,"b"',
    config: {comments: '#'},
    expectedColumnQuotes: [false, true]
  },
  {
    description: "normal mode, empty row is like an empty field with defaults",
    input: 'a,b,"c""d"\n\na',
    expectedColumnQuotes: [false, false, true]
  },
  {
    description: "normal mode, empty row is has no quote info if skipped",
    input: 'a,b,"c""d"\n\na',
    config: {skipEmptyLines: true},
    expectedColumnQuotes: [false, false, true]
  },
]

const PRESERVE_QUOTE_INFORMATION_COLUMNS_KEEP_COMMENT_INFOS_TESTS: ColumnQuotesTestType[] = [
  {
    description: "fast mode, no quotes, 1 row",
    input: 'a,b, c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, no quotes, same length, 2 rows",
    input: 'a, b, c\na,b, c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, no quotes, different lengths",
    input: ' a,b, c\na,b\nc',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, with comment 1",
    input: 'a,b, c\n#test\na,b',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "fast mode, with comment 1 at start ignored",
    input: '#test\na,b," c "\na,b',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, true]
  },

  {
    description: "normal mode, 1 row",
    input: 'a,"b",c,"d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, special case with space",
    input: 'a,"b", c, "d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false, false]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,b,c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, 2 row with quotes",
    input: 'a,"b",c,"d"\na,"b",c',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, 3 row",
    input: 'a,"b",c,"d"\na,"b",c\na',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false, true]
  },
  {
    description: "normal mode, 2 row",
    input: 'a,"b",c,"d"\na,"b",c\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false, true]
  },

  {
    description: "normal mode, with comment 1 (no comment char)",
    input: 'a,b, c\n#test\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, starts with 1 comment",
    input: '#comment\na,b, c\n#test\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, starts with 2 comments",
    input: '#comment\n#comment 2\na,b, c\n#test\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, with comment 1, different quote char (no comment char)",
    input: 'a,b, c\n#test\na,+b+',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedColumnQuotes: [false, false, false]
  },
  {
    description: "normal mode, with comment 1, different quote char, keep comments",
    input: 'a,+b+,+1 2, 3 +',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedColumnQuotes: [false, true, true]
  },
  {
    description: "normal mode, with comment 1, different quote char 2 (no comment char)",
    input: '"a",+b+,c',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedColumnQuotes: [false, true, false]
  },
  {
    description: "normal mode, with comment 1, different quote char 2",
    input: '"a",+b+,c\n#test',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedColumnQuotes: [false, true, false]
  },
  {
    description: "normal mode, with comment 1, different quote char 2, 1 ",
    input: '#test\na,+b+\n#+ab+c\n"a",+b+,c',
    config: {
      quoteChar: '+',
      rowInsertCommentLines_commentsString: '#'
    },
    expectedColumnQuotes: [false, true]
  },
  {
    description: "normal mode, with comment 1, different quote char 2, 2  (no comments char)",
    input: '#+ab+c\n"a",+b+,c',
    config: {quoteChar: '+', rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true, false]
  },

  {
    description: "normal mode, escaped quotes",
    input: 'a,b,"c""d"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, true]
  },
  {
    description: "normal mode, different quote char, escaped quotes",
    input: 'a,b,+c"+d+,"e"',
    config: {
      quoteChar: '+',
      escapeChar: '"',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedColumnQuotes: [false, false, true, false]
  },
  {
    description: "normal mode, with comment 1, escaped quotes (no comment char)",
    input: 'a,b,"c""d"\n#test\na,"b"\n"c""d"',
    config: { rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, true]
  },
  {
    description: "normal mode, with comment 1, escaped quotes",
    input: '#comment\na,"b"',
    config: {rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, true]
  },
  {
    description: "normal mode, empty row is like an empty field with defaults",
    input: 'a,b,"c""d"\n\na',
    config: { rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, true]
  },
  {
    description: "normal mode, empty row is has no quote info if skipped",
    input: 'a,b,"c""d"\n\na',
    config: {skipEmptyLines: true, rowInsertCommentLines_commentsString: '#'},
    expectedColumnQuotes: [false, false, true]
  },
]

describe('Parse PRESERVE CELL QUOTES INFORMATION Tests', function() {
  function generateTest(test: CellQuotesTestType) {
    it(test.description, function() {
      let actual: ParseResult | Error

      try {
        actual = Papa.parse(test.input, {
          ...test.config,
          retainQuoteInformation: true
        })
      } catch (e) {
        if (e instanceof Error) {
          throw e
        }
        actual = e as Error
        //@ts-ignore
        assert.deepEqual(actual, test.expectedCellQuotes)
        return
      }

      assert.deepEqual(actual.meta.cellIsQuotedInfo, test.expectedCellQuotes)
    })
  }

  const ALL_TESTS = PRESERVE_QUOTE_INFORMATION_CELLS_TESTS.concat(PRESERVE_QUOTE_INFORMATION_CELLS_KEEP_COMMENT_INFOS_TESTS)

  for (let i = 0; i < ALL_TESTS.length; i++) {
    generateTest(ALL_TESTS[i])
  }
})

describe('Parse PRESERVE COLUMN QUOTES INFORMATION Tests', function() {
  function generateTest(test: ColumnQuotesTestType) {
    it(test.description, function() {
      let actual: ParseResult | Error

      try {
        actual = Papa.parse(test.input, {
          ...test.config,
          retainQuoteInformation: true
        })
      } catch (e) {
        if (e instanceof Error) {
          throw e
        }
        actual = e as Error
        //@ts-ignore
        assert.deepEqual(actual, test.expectedColumnQuotes)
        return
      }

      assert.deepEqual(actual.meta.columnIsQuoted, test.expectedColumnQuotes)
    })
  }
  const ALL_TESTS = PRESERVE_QUOTE_INFORMATION_COLUMNS_TESTS.concat(PRESERVE_QUOTE_INFORMATION_COLUMNS_KEEP_COMMENT_INFOS_TESTS)

  for (let i = 0; i < ALL_TESTS.length; i++) {
    generateTest(ALL_TESTS[i])
  }
})
