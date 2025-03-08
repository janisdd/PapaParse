import {assert, describe, it} from 'vitest'
import {Papa, ParseConfig, ParseResultMeta} from '../papaparse'

type TestType = {
  description: string
  input: string
  config?: ParseConfig
  notes?: string
  expected: {
    data: string[][]
    errors: unknown[]
    meta?: Partial<ParseResultMeta>
  }
}

const RECORD_SEP = String.fromCharCode(30)
const UNIT_SEP = String.fromCharCode(31)

// Tests for Papa.parse() function -- high-level wrapped parser (CSV to JSON)
const PARSE_TESTS: TestType[] = [
  {
    description: "Two rows, just \\r",
    input: 'A,b,c\rd,E,f',
    expected: {
      data: [['A', 'b', 'c'], ['d', 'E', 'f']],
      errors: []
    }
  },
  {
    description: "Two rows, \\r\\n",
    input: 'A,b,c\r\nd,E,f',
    expected: {
      data: [['A', 'b', 'c'], ['d', 'E', 'f']],
      errors: []
    }
  },
  {
    description: "Quoted field with \\r\\n",
    input: 'A,"B\r\nB",C',
    expected: {
      data: [['A', 'B\r\nB', 'C']],
      errors: []
    }
  },
  {
    description: "Quoted field with \\r",
    input: 'A,"B\rB",C',
    expected: {
      data: [['A', 'B\rB', 'C']],
      errors: []
    }
  },
  {
    description: "Quoted field with \\n",
    input: 'A,"B\nB",C',
    expected: {
      data: [['A', 'B\nB', 'C']],
      errors: []
    }
  },
  {
    description: "Quoted fields with spaces between closing quote and next delimiter",
    input: 'A,"B" ,C,D\r\nE,F,"G"  ,H',
    expected: {
      data: [['A', 'B', 'C','D'],['E', 'F', 'G','H']],
      errors: []
    }
  },
  {
    description: "Quoted fields with spaces between closing quote and next new line",
    input: 'A,B,C,"D" \r\nE,F,G,"H"  \r\nQ,W,E,R',
    expected: {
      data: [['A', 'B', 'C','D'],['E', 'F', 'G','H'],['Q', 'W', 'E','R']],
      errors: []
    }
  },
  {
    description: "Quoted fields with spaces after closing quote",
    input: 'A,"B" ,C,"D" \r\nE,F,"G"  ,"H"  \r\nQ,W,"E" ,R',
    expected: {
      data: [['A', 'B', 'C','D'],['E', 'F', 'G','H'],['Q', 'W', 'E','R']],
      errors: []
    }
  },
  {
    description: "Mixed slash n and slash r should choose first as precident",
    input: 'a,b,c\nd,e,f\rg,h,i\n',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f\rg', 'h', 'i'], ['']],
      errors: []
    }
  },
  {
    description: "Row with enough fields but blank field at end",
    input: 'A,B,C\r\na,b,',
    config: { },
    expected: {
      data: [['A', 'B', 'C'], ['a', 'b', '']],
      errors: []
    }
  },
  {
    description: "Tab delimiter",
    input: 'a\tb\tc\r\nd\te\tf',
    config: { delimiter: "\t" },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Pipe delimiter",
    input: 'a|b|c\r\nd|e|f',
    config: { delimiter: "|" },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "ASCII 30 delimiter",
    input: 'a' + RECORD_SEP + 'b' + RECORD_SEP + 'c\r\nd' + RECORD_SEP + 'e' + RECORD_SEP + 'f',
    config: { delimiter: RECORD_SEP },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "ASCII 31 delimiter",
    input: 'a' + UNIT_SEP + 'b' + UNIT_SEP + 'c\r\nd' + UNIT_SEP + 'e' + UNIT_SEP + 'f',
    config: { delimiter: UNIT_SEP },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Bad delimiter (\\n)",
    input: 'a,b,c',
    config: { delimiter: "\n" },
    notes: "Should silently default to comma",
    expected: {
      data: [['a', 'b', 'c']],
      errors: []
    }
  },
  {
    description: "Multi-character delimiter",
    input: 'a, b, c',
    config: { delimiter: ", " },
    expected: {
      data: [['a', 'b', 'c']],
      errors: []
    }
  },
  {
    description: "Multi-character delimiter (length 2) with quoted field",
    input: 'a, b, "c, e", d',
    config: { delimiter: ", " },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field",
    expected: {
      data: [['a', 'b', 'c, e', 'd']],
      errors: []
    }
  },
  {
    description: "Multi-character delimiter (length 3) with quoted field",
    input: 'a,..b,.."c,..e",..d',
    config: { delimiter: ",.." },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field",
    expected: {
      data: [['a', 'b', 'c,..e', 'd']],
      errors: []
    }
  },
  {
    description: "Whitespace at edges of unquoted field with multi character-delimiter",
    input: 'a,.	b ,.c',
    notes: "Extra whitespace should graciously be preserved",
    config: { delimiter: ",." },
    expected: {
      data: [['a', '	b ', 'c']],
      errors: []
    }
  },
  {
    description: "Multi-character delimiter with quoted field and unnecessary spaces after quote end (field quoted collapse spaces outside of quotes)",
    input: 'a,.b,."c,.e"  ,.d',
    config: { delimiter: ",." },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field (this is a quoted field)",
    expected: {
      data: [['a', 'b', 'c,.e', 'd']],
      errors: []
    }
  },
  {
    description: "Multi-character delimiter with quoted field and unnecessary spaces before field (field quoted collapse spaces outside of quotes)",
    input: 'a,.b,.  "c,.e",.d',
    config: { delimiter: ",." },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field (this is NOT a quoted field) | we want to preserve spaces then",
    expected: {
      data: [['a', 'b', '  "c', 'e"', 'd']],
      errors: []
    }
  },
  {
    description: "Multi-character delimiter with quoted field and unnecessary spaces before and after field  (field quoted collapse spaces outside of quotes)",
    input: 'a,.b,.   "c,.e"   ,.d',
    config: { delimiter: ",." },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field (this is NOT a quoted field) | we want to preserve spaces then",
    expected: {
      data: [['a', 'b', '   "c', 'e"   ', 'd']],
      errors: []
    }
  },
  {
    description: "single delimiter with quoted field and unnecessary spaces after quote end (field quoted collapse spaces outside of quotes)",
    input: 'a,b,"ce"  ,d',
    config: { delimiter: "," },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field (this is a quoted field)",
    expected: {
      data: [['a', 'b', 'ce', 'd']],
      errors: []
    }
  },
  {
    description: "single delimiter with quoted field and unnecessary spaces before quote end (field quoted collapse spaces outside of quotes)",
    input: 'a,b,  "ce",d',
    config: { delimiter: "," },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field (this is a NOT quoted field) | we want to preserve spaces then",
    expected: {
      data: [['a', 'b', '  "ce"', 'd']],
      errors: []
    }
  },
  {
    description: "single delimiter with quoted field and unnecessary spaces befor and after quote end (field quoted collapse spaces outside of quotes)",
    input: 'a,b,  "ce"  ,d',
    config: { delimiter: "," },
    notes: "The quotes must be immediately adjacent to the delimiter to indicate a quoted field (this is a NOT quoted field) | we want to preserve spaces then",
    expected: {
      data: [['a', 'b', '  "ce"  ', 'd']],
      errors: []
    }
  },
  {
    description: "Callback delimiter",
    input: 'a$ b$ c',
    config: { delimiter: '$ ' },
    expected: {
      data: [['a', 'b', 'c']],
      errors: []
    }
  },
  {
    description: "Dynamic typing converts numeric literals",
    input: '1,2.2,1e3\r\n-4,-4.5,-4e-5\r\n-,5a,5-2',
    config: {  },
    expected: {
      data: [['1', '2.2', '1e3'], ['-4', '-4.5', '-4e-5'], ["-", "5a", "5-2"]],
      errors: []
    }
  },
  {
    description: "Dynamic typing converts boolean literals",
    input: 'true,false,T,F,TRUE,FALSE,True,False',
    config: { },
    expected: {
      data: [['true', 'false', "T", "F", 'TRUE', 'FALSE', "True", "False"]],
      errors: []
    }
  },
  {
    description: "Dynamic typing doesn't convert other types",
    input: 'A,B,C\r\nundefined,null,[\r\nvar,float,if',
    config: {  },
    expected: {
      data: [["A", "B", "C"], ["undefined", "null", "["], ["var", "float", "if"]],
      errors: []
    }
  },
  {
    description: "Dynamic typing applies to specific columns by index",
    input: '1,2.2,1e3\r\n-4,-4.5,-4e-5\r\n-,5a,5-2',
    config: { },
    expected: {
      data: [["1", '2.2', "1e3"], ["-4", '-4.5', "-4e-5"], ["-", "5a", "5-2"]],
      errors: []
    }
  },
  {
    description: "Dynamic typing converts empty values into NULL",
    input: '1,2.2,1e3\r\n,NULL,\r\n-,5a,null',
    config: {  },
    expected: {
      data: [['1', '2.2', '1e3'], ['', "NULL", ''], ["-", "5a", "null"]],
      errors: []
    }
  },
  {
    description: "Dynamic typing converts ISO date strings to Dates",
    input: 'ISO date,long date\r\n2018-05-04T21:08:03.269Z,Fri May 04 2018 14:08:03 GMT-0700 (PDT)\r\n2018-05-08T15:20:22.642Z,Tue May 08 2018 08:20:22 GMT-0700 (PDT)',
    config: {  },
    expected: {
      data: [["ISO date", "long date"], ["2018-05-04T21:08:03.269Z", "Fri May 04 2018 14:08:03 GMT-0700 (PDT)"], ["2018-05-08T15:20:22.642Z", "Tue May 08 2018 08:20:22 GMT-0700 (PDT)"]],
      errors: []
    }
  },
  {
    description: "Blank line at beginning",
    input: '\r\na,b,c\r\nd,e,f',
    config: { newline: '\r\n' },
    expected: {
      data: [[''], ['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Blank line in middle",
    input: 'a,b,c\r\n\r\nd,e,f',
    config: { newline: '\r\n' },
    expected: {
      data: [['a', 'b', 'c'], [''], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Blank lines at end",
    input: 'a,b,c\nd,e,f\n\n',
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], [''], ['']],
      errors: []
    }
  },
  {
    description: "Blank line in middle with whitespace",
    input: 'a,b,c\r\n \r\nd,e,f',
    expected: {
      data: [['a', 'b', 'c'], [" "], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "First field of a line is empty",
    input: 'a,b,c\r\n,e,f',
    expected: {
      data: [['a', 'b', 'c'], ['', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Last field of a line is empty",
    input: 'a,b,\r\nd,e,f',
    expected: {
      data: [['a', 'b', ''], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Other fields are empty",
    input: 'a,,c\r\n,,',
    expected: {
      data: [['a', '', 'c'], ['', '', '']],
      errors: []
    }
  },
  {
    description: "Empty input string",
    input: '',
    expected: {
      data: [],
      errors: [{
        "type": "Delimiter",
        "code": "UndetectableDelimiter",
        "message": "Unable to auto-detect delimiting character; defaulted to ','"
      }]
    }
  },
  {
    description: "Input is just the delimiter (2 empty fields)",
    input: ',',
    expected: {
      data: [['', '']],
      errors: []
    }
  },
  {
    description: "Input is just a string (a single field)",
    input: 'Abc def',
    expected: {
      data: [['Abc def']],
      errors: [
        {
          "type": "Delimiter",
          "code": "UndetectableDelimiter",
          "message": "Unable to auto-detect delimiting character; defaulted to ','"
        }
      ]
    }
  },
  {
    description: "Preview -1 rows should default to parsing all",
    input: 'a,b,c\r\nd,e,f\r\ng,h,i',
    config: { previewInRows: -1 },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
      errors: []
    }
  },
  {
    description: "Preview 0 rows should default to parsing all",
    input: 'a,b,c\r\nd,e,f\r\ng,h,i',
    config: { previewInRows: 0 },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
      errors: []
    }
  },
  {
    description: "Preview 1 row",
    input: 'a,b,c\r\nd,e,f\r\ng,h,i',
    config: { previewInRows: 1 },
    expected: {
      data: [['a', 'b', 'c']],
      errors: []
    }
  },
  {
    description: "Preview 2 rows",
    input: 'a,b,c\r\nd,e,f\r\ng,h,i',
    config: { previewInRows: 2 },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Preview all (3) rows",
    input: 'a,b,c\r\nd,e,f\r\ng,h,i',
    config: { previewInRows: 3 },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
      errors: []
    }
  },
  {
    description: "Preview more rows than input has",
    input: 'a,b,c\r\nd,e,f\r\ng,h,i',
    config: { previewInRows: 4 },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']],
      errors: []
    }
  },
  {
    description: "Preview should count rows, not lines",
    input: 'a,b,c\r\nd,e,"f\r\nf",g,h,i',
    config: { previewInRows: 2 },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f\r\nf', 'g', 'h', 'i']],
      errors: []
    }
  },
  {
    description: "Empty lines",
    input: '\na,b,c\n\nd,e,f\n\n',
    config: { delimiter: ',' },
    expected: {
      data: [[''], ['a', 'b', 'c'], [''], ['d', 'e', 'f'], [''], ['']],
      errors: []
    }
  },
  {
    description: "Skip empty lines",
    input: 'a,b,c\n\nd,e,f',
    config: { skipEmptyLines: true },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Skip empty lines, with newline at end of input",
    input: 'a,b,c\r\n\r\nd,e,f\r\n',
    config: { skipEmptyLines: true },
    expected: {
      data: [['a', 'b', 'c'], ['d', 'e', 'f']],
      errors: []
    }
  },
  {
    description: "Skip empty lines, with empty input",
    input: '',
    config: { skipEmptyLines: true },
    expected: {
      data: [],
      errors: [
        {
          "type": "Delimiter",
          "code": "UndetectableDelimiter",
          "message": "Unable to auto-detect delimiting character; defaulted to ','"
        }
      ]
    }
  },
  {
    description: "only empty lines",
    input: '\n\n\n',
    config: { skipEmptyLines: true, delimiter: ',' },
    expected: {
      data: [],
      errors: []
    }
  },
  {
    description: "Skip empty lines, with first line only whitespace",
    notes: "A line must be absolutely empty to be considered empty",
    input: ' \na,b,c',
    config: { skipEmptyLines: true, delimiter: ',' },
    expected: {
      data: [[" "], ['a', 'b', 'c']],
      errors: []
    }
  },
  {
    description: "Lines with comments are not used when guessing the delimiter in an escaped file",
    notes: "Guessing the delimiter should work even if there are many lines of comments at the start of the file",
    input: '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\none,"t,w,o",three\nfour,five,six',
    config: { comments: '#' },
    expected: {
      data: [['one','t,w,o','three'],['four','five','six']],
      errors: []
    }
  },
  {
    description: "Lines with comments are not used when guessing the delimiter in a non-escaped file",
    notes: "Guessing the delimiter should work even if there are many lines of comments at the start of the file",
    input: '#1\n#2\n#3\n#4\n#5\n#6\n#7\n#8\n#9\n#10\n#11\none,two,three\nfour,five,six',
    config: { comments: '#' },
    expected: {
      data: [['one','two','three'],['four','five','six']],
      errors: []
    }
  },
  {
    description: "Pipe delimiter is guessed correctly when mixed with comas",
    notes: "Guessing the delimiter should work even if there are many lines of comments at the start of the file",
    input: 'one|two,two|three\nfour|five,five|six',
    config: {},
    expected: {
      data: [['one','two,two','three'],['four','five,five','six']],
      errors: []
    }
  },
  {
    description: "Single quote as quote character",
    notes: "Must parse correctly when single quote is specified as a quote character",
    input: "a,b,'c,d'",
    config: { quoteChar: "'" },
    expected: {
      data: [['a', 'b', 'c,d']],
      errors: []
    }
  },
  {
    description: "Plus as quote char",
    input: "a,+b+",
    config: { quoteChar: "+" },
    expected: {
      data: [['a', 'b']],
      errors: []
    }
  },
  {
    description: 'Plus as quote char, should also change the escape quotes sequence to +" ',
    input: 'a,+b++c+',
    config: { quoteChar: "+" },
    expected: {
      data: [['a', 'b+c']],
      errors: []
    }
  },
  {
    description: "Custom escape character",
    notes: "the escape char is prepended to the quotes",
    input: 'a,"b+"c"',
    config: { escapeChar: '+' },
    expected: {
      data: [['a', 'b"c']],
      errors: []
    }
  },
  {
    //see https://github.com/janisdd/vscode-edit-csv/issues/167
    //and https://github.com/mholt/PapaParse/issues/1035
    description: "Ignore normal quotes if we have a custom quote character",
    notes: "here the field contains the escape char but not the quote char. because it does not contain the quote char, it should not be changed",
    input: 'a,x"y',
    config: { escapeChar: '"', quoteChar: "@"},
    expected: {
      data: [['a', 'x"y']],
      errors: []
    }
  },
  {
    description: "Custom escape character and custom quotes",
    notes: "the escape char is prepended to the quotes",
    input: 'a,@b+@c@',
    config: { escapeChar: '+', quoteChar: '@' },
    expected: {
      data: [['a', 'b@c']],
      errors: []
    }
  },
  {
    description: "Custom escape character in the middle",
    notes: "Must parse correctly if the backslash sign (\\) is configured as a custom escape character",
    input: 'a,b,"c\\"d\\"f"',
    config: { escapeChar: '\\' },
    expected: {
      data: [['a', 'b', 'c"d"f']],
      errors: []
    }
  },
  {
    description: "Custom escape character at the end",
    notes: "Must parse correctly if the backslash sign (\\) is configured as a custom escape character and the escaped quote character appears at the end of the column",
    input: 'a,b,"c\\"d\\""',
    config: { escapeChar: '\\' },
    expected: {
      data: [['a', 'b', 'c"d"']],
      errors: []
    }
  },
  {
    description: "Custom escape character not used for escaping",
    notes: "Must parse correctly if the backslash sign (\\) is configured as a custom escape character and appears as regular character in the text",
    input: 'a,b,"c\\d"',
    config: { escapeChar: '\\' },
    expected: {
      data: [['a', 'b', 'c\\d']],
      errors: []
    }
  },
  {
    description: "Header row with preceding comment",
    notes: "Must parse correctly headers if they are preceded by comments",
    input: '#Comment\na,b\nc,d\n',
    config: { comments: '#', skipEmptyLines: true, delimiter: ',' },
    expected: {
      data: [['a', 'b'], ['c', 'd']],
      errors: []
    }
  },
  {
    description: "Carriage return in header inside quotes, with line feed endings",
    input: '"a\r\na","b"\n"c","d"\n"e","f"\n"g","h"\n"i","j"',
    config: {},
    expected: {
      data: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: []
    }
  },
  {
    description: "Line feed in header inside quotes, with carriage return + line feed endings",
    input: '"a\na","b"\r\n"c","d"\r\n"e","f"\r\n"g","h"\r\n"i","j"',
    config: {},
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: []
    }
  },
  {
    description: "Using \\r\\n endings uses \\r\\n linebreak",
    input: 'a,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: {},
    expected: {
      data: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 23,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using \\n endings uses \\n linebreak",
    input: 'a,b\nc,d\ne,f\ng,h\ni,j',
    config: {},
    expected: {
      data: [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\n',
        delimiter: ',',
        cursor: 19,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using \\r\\n endings with \\r\\n in header field uses \\r\\n linebreak",
    input: '"a\r\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: {},
    expected: {
      data: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 28,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using \\r\\n endings with \\n in header field uses \\r\\n linebreak",
    input: '"a\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: {},
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 27,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using \\r\\n endings with \\n in header field with skip empty lines uses \\r\\n linebreak",
    input: '"a\na",b\r\nc,d\r\ne,f\r\ng,h\r\ni,j\r\n',
    config: {skipEmptyLines: true},
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 29,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using \\n endings with \\r\\n in header field uses \\n linebreak",
    input: '"a\r\na",b\nc,d\ne,f\ng,h\ni,j',
    config: {},
    expected: {
      data: [['a\r\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\n',
        delimiter: ',',
        cursor: 24,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using reserved regex character . as quote character",
    input: '.a\na.,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: { quoteChar: '.' },
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 27,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Using reserved regex character | as quote character",
    input: '|a\na|,b\r\nc,d\r\ne,f\r\ng,h\r\ni,j',
    config: { quoteChar: '|' },
    expected: {
      data: [['a\na', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h'], ['i', 'j']],
      errors: [],
      meta: {
        linebreak: '\r\n',
        delimiter: ',',
        cursor: 27,
        columnIsQuoted: null,
        cellIsQuotedInfo: null,
        outLineIndexToCsvLineIndexMapping: null,
        outColumnIndexToCsvColumnIndexMapping: null,
        outCsvFieldToInputPositionMapping: null,
      }
    }
  },
  {
    description: "Parsing with skipEmptyLines set to 'greedy'",
    notes: "Must parse correctly without lines with no content",
    input: 'a,b\n\n,\nc,d\n , \n""," "\n	,	\n,,,,\n',
    config: { skipEmptyLines: 'greedy' },
    expected: {
      data: [['a', 'b'], ['c', 'd']],
      errors: []
    }
  },
  {
    description: "Parsing with skipEmptyLines set to 'greedy' with quotes and delimiters as content",
    notes: "Must include lines with escaped delimiters and quotes",
    input: 'a,b\n\n,\nc,d\n" , ",","\n""" """,""""""\n\n\n',
    config: { skipEmptyLines: 'greedy' },
    expected: {
      data: [['a', 'b'], ['c', 'd'], [' , ', ','], ['" "', '""']],
      errors: []
    }
  }
]

describe('Parse Tests', function() {
  function generateTest(test: TestType) {
    it(test.description, function() {
      const actual = Papa.parse(test.input, test.config)
      // allows for testing the meta object if present in the test
      if (test.expected.meta) {
        assert.deepEqual(actual.meta, test.expected.meta)
      }
      assert.deepEqual(JSON.stringify(actual.errors), JSON.stringify(test.expected.errors))
      assert.deepEqual(actual.data, test.expected.data)
    })
  }

  for (let i = 0; i < PARSE_TESTS.length; i++) {
    generateTest(PARSE_TESTS[i])
  }
})

