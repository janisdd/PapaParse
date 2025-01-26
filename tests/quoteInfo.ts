import {assert, describe, it} from 'vitest'
import {Papa, ParseConfig, ParseParseResult} from '../papaparse'


type TestType = {
  description: string
  input: string
  config?: ParseConfig
  notes?: string
  expectedCellQuotes: boolean[][]
}

//TODO add tests for columnIsQuoted (even though deprecated)

const PRESERVE_QUOTE_INFORMATION_PARSE_TESTS: TestType[] = [
  {
    description: "fast mode, no quites, 1 row",
    input: 'a,b, c',
    expectedCellQuotes: [[false, false, false]]
  },
  {
    description: "fast mode, no quites, same length, 2 rows",
    input: 'a,b, c\na,b, c',
    expectedCellQuotes: [[false, false, false], [false, false, false]]
  },
  {
    description: "fast mode, no quites, different lengths",
    input: 'a,b, c\na,b\nc',
    expectedCellQuotes: [[false, false, false], [false, false], [false]]
  },
  {
    description: "fast mode, with comment 1",
    input: 'a,b, c\n#test\na,b',
    expectedCellQuotes: [[false, false, false], [false], [false, false]]
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
    description: "normal mode, with comment 1",
    input: 'a,b, c\n#test\na,"b"',
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char",
    input: 'a,b, c\n#test\na,+b+',
    config: {quoteChar: '+'},
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, with comment 1, different quote char",
    input: 'a,b, c\n#test\na,+b+',
    config: {quoteChar: '+'},
    expectedCellQuotes: [[false, false, false], [false], [false, true]]
  },
  {
    description: "normal mode, escaped quotes",
    input: 'a,b,"c""d"',
    expectedCellQuotes: [[false, false, true]]
  },
  {
    description: "normal mode, with comment 1, escaped quotes",
    input: 'a,b,"c""d"\n#test\na,"b"\n"c""d"',
    expectedCellQuotes: [[false, false, true], [false], [false, true], [true]]
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

describe('Parse PRESERVE QUOTES INFORMATIONTests', function() {
  function generateTest(test: TestType) {
    it(test.description, function() {
      let actual: ParseParseResult | Error

      try {
        actual = Papa.parse(test.input, {...test.config, retainQuoteInformation: true})
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

  for (let i = 0; i < PRESERVE_QUOTE_INFORMATION_PARSE_TESTS.length; i++) {
    generateTest(PRESERVE_QUOTE_INFORMATION_PARSE_TESTS[i])
  }
})
