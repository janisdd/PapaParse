import {assert, describe, it} from 'vitest'
import {Papa, UnparseConfig} from '../papaparse'

const RECORD_SEP = String.fromCharCode(30)

type TestType = {
  description: string
  input: Array<Array<string | null | undefined>>
  config?: UnparseConfig
  notes?: string
  expected: string
}

// Tests for Papa.unparse() function (JSON to CSV)
const UNPARSE_TESTS: TestType[] = [
  {
    description: "A simple row",
    notes: "Comma should be default delimiter",
    input: [['A', 'b', 'c']],
    expected: 'A,b,c'
  },
  {
    description: "Two rows",
    input: [['A', 'b', 'c'], ['d', 'E', 'f']],
    expected: 'A,b,c\r\nd,E,f'
  },
  {
    description: "Data with quotes",
    input: [['a', '"b"', 'c'], ['"d"', 'e', 'f']],
    expected: 'a,"""b""",c\r\n"""d""",e,f'
  },
  {
    description: "Data with newlines",
    input: [['a', 'b\nb', 'c'], ['d', 'e', 'f\r\nf']],
    expected: 'a,"b\nb",c\r\nd,e,"f\r\nf"'
  },
  {
    description: "Specifying column names and data separately",
    input: [["Col1", "Col2", "Col3"], ["a", "b", "c"], ["d", "e", "f"]],
    expected: 'Col1,Col2,Col3\r\na,b,c\r\nd,e,f'
  },
  {
    description: "Specifying column names only (no data)",
    notes: "Papa should add a data property that is an empty array to prevent errors (no copy is made)",
    input: [["Col1", "Col2", "Col3"]],
    expected: 'Col1,Col2,Col3'
  },
  {
    description: "Specifying data only (no field names), improperly",
    notes: "A single array for a single row is wrong, but it can be compensated.<br>Papa should add empty fields property to prevent errors.",
    input: [["abc", "d", "ef"]],
    expected: 'abc,d,ef'
  },
  {
    description: "Specifying data only (no field names), properly",
    notes: "An array of arrays, even if just a single row.<br>Papa should add empty fields property to prevent errors.",
    input: [["a", "b", "c"]],
    expected: 'a,b,c'
  },
  {
    description: "Custom delimiter (semicolon)",
    input: [['A', 'b', 'c'], ['d', 'e', 'f']],
    config: { delimiter: ';' },
    expected: 'A;b;c\r\nd;e;f'
  },
  {
    description: "Custom delimiter (tab)",
    input: [['Ab', 'cd', 'ef'], ['g', 'h', 'ij']],
    config: { delimiter: '\t' },
    expected: 'Ab\tcd\tef\r\ng\th\tij'
  },
  {
    description: "Custom delimiter (ASCII 30)",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { delimiter: RECORD_SEP },
    expected: 'a' + RECORD_SEP + 'b' + RECORD_SEP + 'c\r\nd' + RECORD_SEP + 'e' + RECORD_SEP + 'f'
  },
  {
    description: "Custom delimiter (Multi-character)",
    input: [['A', 'b', 'c'], ['d', 'e', 'f']],
    config: { delimiter: ', ' },
    expected: 'A, b, c\r\nd, e, f'
  },
  {
    description: "Bad delimiter (\\n)",
    notes: "Should default to comma",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { delimiter: '\n' },
    expected: 'a,b,c\r\nd,e,f'
  },
  {
    description: "Custom line ending (\\r)",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { newlineChar: '\r' },
    expected: 'a,b,c\rd,e,f'
  },
  {
    description: "Custom line ending (\\n)",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { newlineChar: '\n' },
    expected: 'a,b,c\nd,e,f'
  },
  {
    description: "Custom, but strange, line ending ($)",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { newlineChar: '$' },
    expected: 'a,b,c$d,e,f'
  },
  {
    description: "Force quotes around all fields",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { quotes: true },
    expected: '"a","b","c"\r\n"d","e","f"'
  },
  {
    description: "Force quotes around all fields (with header row)",
    input: [["Col1", "Col2", "Col3"], ["a", "b", "c"], ["d", "e", "f"]],
    config: { quotes: true },
    expected: '"Col1","Col2","Col3"\r\n"a","b","c"\r\n"d","e","f"'
  },
  {
    description: "Force quotes around certain fields only",
    input: [['a', 'b', 'c'], ['d', 'e', 'f']],
    config: { quotes: [true, false, true] },
    expected: '"a",b,"c"\r\n"d",e,"f"'
  },
  {
    description: "Force quotes around certain fields only (with header row)",
    input: [["Col1", "Col2", "Col3"], ["a", "b", "c"], ["d", "e", "f"]],
    config: { quotes: [true, false, true] },
    expected: '"Col1",Col2,"Col3"\r\n"a",b,"c"\r\n"d",e,"f"'
  },
  {
    description: "Do not force quotes around null and undefined fields",
    input: [['a', 'b', 'c', 'd'], [null, undefined, '', 'e']],
    config: { quotes: [true, true, true, false] },
    expected: '"a","b","c",d\r\n,,,e'
  },
  {
    description: "Not force quotes around null and undefined fields results in empty value",
    input: [['a', 'b', 'c', 'd'], [null, undefined, '', 'e']],
    config: { quotes: [false, false, false, false] },
    expected: 'a,b,c,d\r\n,,,e'
  },
  {
    description: "Force quites array has not an entry for all columns (defaults to false)",
    input: [['a', 'b', 'c', 'd'], [null, undefined, '', 'e']],
    config: { quotes: [false] },
    expected: 'a,b,c,d\r\n,,,e'
  },
  {
    description: "Force quotes around null and undefined fields with option",
    input: [['a', 'b', 'c', 'd'], [null, undefined, '', 'e']],
    config: { quotes: [true, true, true, false], quoteEmptyOrNullFields: true }, //also empty = empty string or undefined
    expected: '"a","b","c",d\r\n"","","",e'
  },
  {
    description: "Force quotes around null, undefined and empty values with default for quotes and quoteEmptyOrNullFields=true",
    input: [['a', 'b', 'c', 'd'], [null, undefined, '', 'e']],
    config: { quoteEmptyOrNullFields: true }, //also empty = empty string or undefined
    expected: 'a,b,c,d\r\n"","","",e'
  },
  {
    description: "Dot not force quotes for null, undefined and empty lines with default options",
    input: [['a', 'b', 'c', 'd'], [null, undefined, '', 'e']],
    expected: 'a,b,c,d\r\n,,,e'
  },
  {
    description: "Empty input",
    input: [],
    expected: ''
  },
  {
    description: "Mismatched field counts in rows",
    input: [['a', 'b', 'c'], ['d', 'e'], ['f']],
    expected: 'a,b,c\r\nd,e\r\nf'
  },
  {
    description: "Custom quote character (single quote)",
    input: [['a,d','b','c']],
    config: { quoteChar: "'"},
    expected: "'a,d',b,c"
  },
  {
    description: "Custom quote character (not a quote)",
    input: [['a,d','b','c']],
    config: { quoteChar: "@"},
    expected: "@a,d@,b,c"
  },
  {
    description: "Other quote char but without setting escape char (should be 2x the quote char)",
    input: [['a', 'x+y']],
    config: { quoteChar: "+"},
    expected: 'a,+x++y+'
  },
  {
    description: "Other quote char but setting escape char (should be 2x the quote char)",
    input: [['a', 'x+y']],
    config: { quoteChar: "+", escapeChar: '"'},
    expected: 'a,+x"+y+'
  },
  {
    //see https://github.com/janisdd/vscode-edit-csv/issues/167
    //and https://github.com/mholt/PapaParse/issues/1035
    description: "Ignore normal quotes if we have a custom quote character",
    notes: "here the field contains the escape char but not the quote char. because it does not contain the quote char, it should not be changed",
    input: [['a', 'x"y']],
    config: { escapeChar: '"', quoteChar: "@"},
    expected: 'a,x"y'
  },
  {
    description: "Custom escape character and custom quotes, contains quotes char",
    notes: "the escape char is prepended to the quotes. it contains the quote char and thus, must be quoted and the quotes inside must be escaped",
    input: [['a', 'b@c']],
    config: { escapeChar: '+', quoteChar: "@"},
    expected: 'a,@b+@c@'
  },
  {
    description: "Custom escape character and custom quotes, contains quotes char 2x",
    notes: "the escape char is prepended to the quotes. it contains the quote char and thus, must be quoted and the quotes inside must be escaped",
    input: [['a', 'b@c@d@e']],
    config: { escapeChar: '+', quoteChar: "@"},
    expected: 'a,@b+@c+@d+@e@'
  },
  {
    description: "Returns empty rows when empty rows are passed and skipEmptyLines is false",
    input: [[null, ' '], [], ['1', '2']],
    config: {skipEmptyLines: false},
    expected: '," "\r\n\r\n1,2'
  },
  {
    description: "Returns without empty rows when skipEmptyLines is true",
    input: [[null, ' '], [], ['1', '2']],
    config: {skipEmptyLines: true},
    expected: '," "\r\n1,2'
  },
  {
    description: "Returns without rows with no content when skipEmptyLines is 'greedy'",
    input: [[null, ' '], [], ['1', '2']],
    config: {skipEmptyLines: 'greedy'},
    expected: '1,2'
  },
  {
    description: "Returns without rows with no content when skipEmptyLines is 'greedy'",
    input: [[null, ' '], [], ['1', '2']].concat(new Array(500000).fill(['', ''])).concat([['3', '4']]),
    config: {skipEmptyLines: 'greedy'},
    expected: '1,2\r\n3,4'
  },
  {
    description: "Returns empty rows when empty rows are passed and skipEmptyLines is false with headers",
    // input: [{a: null, b: ' '}, {}, {a: '1', b: '2'}],
    input: [['a', 'b'],[null, ' '], [], ['1', '2']],
    config: {skipEmptyLines: false},
    expected: 'a,b\r\n," "\r\n\r\n1,2'
  },
  {
    description: "Returns without empty rows when skipEmptyLines is true with headers",
    input: [['a', 'b'],[null, ' '], [], ['1', '2']],
    config: {skipEmptyLines: true},
    expected: 'a,b\r\n," "\r\n1,2'
  },
  {
    description: "Returns without rows with no content when skipEmptyLines is 'greedy' with headers",
    input: [['a', 'b'], [null, ' '], [], ['1', '2']],
    config: {skipEmptyLines: 'greedy'},
    expected: 'a,b\r\n1,2'
  },
  {
    description: "Test option quoteLeadingSpace: true is the default",
    input: [['a', ' a', '  a']],
    expected: 'a," a","  a"'
  },
  {
    description: "Test option quoteLeadingSpace: true",
    input: [['a', ' a', '  a']],
    config: {quoteLeadingSpace: true},
    expected: 'a," a","  a"'
  },
  {
    description: "Test option quoteLeadingSpace: true",
    notes: 'This should work without quotes because they are optional if there is no reason to quote the field (e.g. no delimiter or other quotes, new line, ...)',
    input: [['a', ' a', '  a']],
    config: {quoteLeadingSpace: false},
    expected: 'a, a,  a'
  },

  {
    description: "Test option quoteTrailingSpace: true is the default",
    input: [['a', 'a ', 'a  ']],
    expected: 'a,"a ","a  "'
  },
  {
    description: "Test option quoteTrailingSpace: true",
    input: [['a', 'a ', 'a  ']],
    config: {quoteTrailingSpace: true},
    expected: 'a,"a ","a  "'
  },
  {
    description: "Test option quoteTrailingSpace: false",
    input: [['a', 'a ', 'a  ']],
    config: {quoteTrailingSpace: false},
    expected: 'a,a ,a  '
  },
  {
    description: "Test option quoteLeadingSpace: true, quoteTrailingSpace: true",
    input: [['a', 'a ', 'a  ', ' a', '  a', ' a ', '  a  ']],
    config: {quoteLeadingSpace: true, quoteTrailingSpace: true},
    expected: 'a,"a ","a  "," a","  a"," a ","  a  "'
  },
  {
    description: "Test option quoteLeadingSpace: false, quoteTrailingSpace: false",
    input: [['a', 'a ', 'a  ', ' a', '  a', ' a ', '  a  ']],
    config: {quoteLeadingSpace: false, quoteTrailingSpace: false},
    expected: 'a,a ,a  , a,  a, a ,  a  '
  },

  {
    description: "Test option determineFieldHasQuotes, not quote leading & trailing spaces",
    input: [['a', 'a ', 'a  '], ['a', 'a ', 'a  ']],
    config: {quoteLeadingSpace: false, quoteTrailingSpace: false, determineFieldHasQuotesFunc: (content, row, col) => {
      const array = [[true, false, true], [false, true, false]]
      const cells = array[row]
      return (cells ? cells : [])[col]
    }},
    expected: '"a",a ,"a  "\r\na,"a ",a  '
  },
  {
    description: "Test option determineFieldHasQuotes, defaults to false, not quote leading & trailing spaces",
    input: [['a', 'a ', 'a  '], ['a', 'a ', 'a  ', ' a ']],
    config: {quoteLeadingSpace: false, quoteTrailingSpace: false, determineFieldHasQuotesFunc: (content, row, col) => {
      const array = [[true, false, true]]
      const cells = array[row]
      return (cells ? cells : [])[col]
    }},
    expected: '"a",a ,"a  "\r\na,a ,a  , a '
  },
]

describe('Unparse Tests', function() {
  function generateTest(test: TestType) {
    it(test.description, function() {
      let actual

      try {
        actual = Papa.unparse(test.input, test.config)
      } catch (e) {
        if (e instanceof Error) {
          throw e
        }
        actual = e
      }

      assert.strictEqual(actual, test.expected)
    })
  }

  for (let i = 0; i < UNPARSE_TESTS.length; i++) {
    generateTest(UNPARSE_TESTS[i])
  }
})
