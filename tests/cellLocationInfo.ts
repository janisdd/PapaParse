import {assert, describe, it} from 'vitest'
import {Papa, ParseConfig, ParseParseResult} from '../papaparse'


type CsvFieldPosition = {
  start: number
  end: number
}

type CellQuotesTestType = {
  description: string
  input: string
  config?: ParseConfig
  notes?: string
  expectedCellPositionMapping: CsvFieldPosition[][] | null
}

/*
comments
multi line
multi line multiple cells

TODO preview mode
TODO different new line chars?

TODO include quotes? yes
include before & after whitespace? yes?

TODO add tests with errors but: Find closing quote failed
 */

const CELL_SOURCE_LOCATION_INFO_TESTS: CellQuotesTestType[] = [
  //TODO multi char delimiter...
  {
    description: "should not calculate mapping if config not set  (fast mode)",
    input: 'A,b,c\nd,E\nf\n\ng\n 1 ,',
    config: {
      calcCsvFieldToInputPositionMapping: false,
    },
    expectedCellPositionMapping: null,
  },
  {
    description: "simple combined test (fast mode)",
    input: `A,b,c\nd,E\nf\n\ng\n 1 ,\n,,,`,
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1
        },
        {
          start: 2,
          end: 3
        },
        {
          start: 4,
          end: 5
        },
      ],
      [
        {
          start: 6,
          end: 7
        },
        {
          start: 8,
          end: 9
        },
      ],
      [
        {
          start: 10,
          end: 11
        },
      ],
      [
        {
          start: 12,
          end: 12
        },
      ],
      [
        {
          start: 13,
          end: 14
        },
      ],
      [
        {
          start: 15,
          end: 18
        },
        {
          start: 19,
          end: 19
        },
      ],
      [
        {
          start: 20,
          end: 20
        },
        {
          start: 21,
          end: 21
        },
        {
          start: 22,
          end: 22
        },
        {
          start: 23,
          end: 23
        },
      ]
    ]
  },
  {
    description: "comment lines are ignored in mapping (fast mode)",
    input: `#start\na,b\n#test,test\n#comment2\ncde,fff   ffff\n#end`,
    config: {comments: `#`},
    expectedCellPositionMapping: [
      [
        {
          start: 7,
          end: 8
        },
        {
          start: 9,
          end: 10
        },
      ],
      [
        {
          start: 32,
          end: 35
        },
        {
          start: 36,
          end: 46
        },
      ],
    ]
  },
  {
    description: "comment lines tracked in mapping (fast mode)",
    input: `#start\na,b\n#test,test\n#comment2\ncde,fff   ffff\n#end`,
    config: {
      comments: `#`,
      rowInsertCommentLines_commentsString: `#`
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 6
        },
      ],
      [
        {
          start: 7,
          end: 8
        },
        {
          start: 9,
          end: 10
        },
      ],
      [
        {
          start: 11,
          end: 21
        },
      ],
      [
        {
          start: 22,
          end: 31
        },
      ],
      [
        {
          start: 32,
          end: 35
        },
        {
          start: 36,
          end: 46
        },
      ],
      [
        {
          start: 47,
          end: 51
        },
      ],
    ]
  },
  {
    description: "two char delimiter (fast mode)",
    input: `a++b\n++c\n++++`,
    config: {delimiter: `++`},
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1
        },
        {
          start: 3,
          end: 4
        },
      ],
      [
        {
          start: 5,
          end: 5
        },
        {
          start: 7,
          end: 8
        },
      ],
      [
        {
          start: 9,
          end: 9
        },
        {
          start: 11,
          end: 11
        },
        {
          start: 13,
          end: 13
        },
      ],
    ]
  },
  {
    description: "three char delimiter (fast mode)",
    input: `a+++b\n+++c\n\n++++++`,
    config: {delimiter: `+++`},
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1
        },
        {
          start: 4,
          end: 5
        },
      ],
      [
        {
          start: 6,
          end: 6
        },
        {
          start: 9,
          end: 10
        },
      ],
      [
        {
          start: 11,
          end: 11
        },
      ],
      [
        {
          start: 12,
          end: 12
        },
        {
          start: 15,
          end: 15
        },
        {
          start: 18,
          end: 18
        },
      ],
    ]
  },

  // not fast mode / normal mode

  {
    description: "should not calculate mapping if config not set",
    input: `"A",b,c\nd,E\nf\n\ng\n 1 ,`,
    config: {
      calcCsvFieldToInputPositionMapping: false,
    },
    expectedCellPositionMapping: null,
  },
  {
    description: "simple combined test with quotes",
    input: `"A","b","c"\n"d","E"\n"f1"\n\n"g"\n 1 ,`,
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 3
        },
        {
          start: 4,
          end: 7
        },
        {
          start: 8,
          end: 11
        },
      ],
      [
        {
          start: 12,
          end: 15
        },
        {
          start: 16,
          end: 19
        },
      ],
      [
        {
          start: 20,
          end: 24
        },
      ],
      [
        {
          start: 25,
          end: 25
        },
      ],
      [
        {
          start: 26,
          end: 29
        },
      ],
      [
        {
          start: 30,
          end: 33
        },
        {
          start: 34,
          end: 34
        },
      ],
    ]
  },
  {
    description: "comment lines are ignored in mapping",
    input: `#start\na,b\n#test,test\n#comment2\ncde,fff   ffff\n#end"`,
    config: {comments: `#`},
    expectedCellPositionMapping: [
      [
        {
          start: 7,
          end: 8
        },
        {
          start: 9,
          end: 10
        },
      ],
      [
        {
          start: 32,
          end: 35
        },
        {
          start: 36,
          end: 46
        },
      ],
    ]
  },
  {
    description: "comment lines tracked in mapping",
    input: `#start\na,b\n#test,test\n#comment2\ncde,fff   ffff\n#end"`,
    config: {
      comments: `#`,
      rowInsertCommentLines_commentsString: `#`
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 6
        },
      ],
      [
        {
          start: 7,
          end: 8
        },
        {
          start: 9,
          end: 10
        },
      ],
      [
        {
          start: 11,
          end: 21
        },
      ],
      [
        {
          start: 22,
          end: 31
        },
      ],
      [
        {
          start: 32,
          end: 35
        },
        {
          start: 36,
          end: 46
        },
      ],
      [
        {
          start: 47,
          end: 52
        },
      ],
    ]
  },
  {
    description: "two char delimiter",
    input: `" a "++"b"\n++c\n++++`,
    config: {delimiter: `++`},
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 5
        },
        {
          start: 7,
          end: 10
        },
      ],
      [
        {
          start: 11,
          end: 11
        },
        {
          start: 13,
          end: 14
        },
      ],
      [
        {
          start: 15,
          end: 15
        },
        {
          start: 17,
          end: 17
        },
        {
          start: 19,
          end: 19
        },
      ],
    ]
  },
  {
    description: "three char delimiter",
    input: `"a"+++" b"\n+++"c "\n\n++++++`,
    config: {delimiter: `+++`},
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 3
        },
        {
          start: 6,
          end: 10
        },
      ],
      [
        {
          start: 11,
          end: 11
        },
        {
          start: 14,
          end: 18
        },
      ],
      [
        {
          start: 19,
          end: 19
        },
      ],
      [
        {
          start: 20,
          end: 20
        },
        {
          start: 23,
          end: 23
        },
        {
          start: 26,
          end: 26
        },
      ],
    ]
  },

  {
    description: "multi line fields",
    input: `" a ","b\nc","e\n\nf"\n"a\nb\n\nc","\na","b",c,"\n","\n\n","\n\n\n"\n" \n ","\na\n"`,
    config: {delimiter: `,`},
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 5
        },
        {
          start: 6,
          end: 11
        },
        {
          start: 12,
          end: 18
        },

      ],
      [
        {
          start: 19,
          end: 27
        },
        {
          start: 28,
          end: 32
        },
        {
          start: 33,
          end: 36
        },
        {
          start: 37,
          end: 38
        },
        {
          start: 39,
          end: 42
        },
        {
          start: 43,
          end: 47
        },
        {
          start: 48,
          end: 53
        },
      ],
      [
        {
          start: 54,
          end: 59
        },
        {
          start: 60,
          end: 65
        },
      ],
    ]
  },
  {
    description: "multi line fields with multi char delimiter",
    input: `" a ",,"b\nc",,"e\n\nf"\n"a\nb\n\nc",,"\na",,"b",,c,,"\n",,"\n\n",,"\n\n\n"\n" \n ",,"\na\n"`,
    config: {delimiter: `,,`},
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 5
        },
        {
          start: 7,
          end: 12
        },
        {
          start: 14,
          end: 20
        },

      ],
      [
        {
          start: 21,
          end: 29
        },
        {
          start: 31,
          end: 35
        },
        {
          start: 37,
          end: 40
        },
        {
          start: 42,
          end: 43
        },
        {
          start: 45,
          end: 48
        },
        {
          start: 50,
          end: 54
        },
        {
          start: 56,
          end: 61
        },
      ],
      [
        {
          start: 62,
          end: 67
        },
        {
          start: 69,
          end: 74
        },
      ],
    ]
  },

]

//make sure the indices in the tests are correct (when we use substring we should get the cell string values back)
//does not work for quoted fields (we could use the quote info but extra space before/after quote)
// describe('TEST CONSISTENCY', function() {
//   function generateTest(test: CellQuotesTestType) {
//     it(test.description, function() {
//       let actual: ParseParseResult | Error
//
//       try {
//         actual = Papa.parse(test.input, {
//           calcCsvFieldToInputPositionMapping: true,
//           ...test.config,
//         })
//       } catch (e) {
//         if (e instanceof Error) {
//           throw e
//         }
//         actual = e as Error
//         //@ts-ignore
//         assert.deepEqual(actual, test.expectedCellQuotes)
//         return
//       }
//
//       if (!actual.meta.outCsvFieldToInputPositionMapping) return
//
//       const _data = actual.data
//
//       for (let i = 0; i < actual.meta.outCsvFieldToInputPositionMapping!.length; i++) {
//         const row = actual.meta.outCsvFieldToInputPositionMapping![i]
//
//         for (let j = 0; j < row.length; j++) {
//           const cellInfo = row[j]
//           const sourceValueString = test.input.substring(cellInfo.start, cellInfo.end)
//           const realData = _data[i][j]
//           assert.deepEqual(sourceValueString, realData)
//         }
//
//       }
//
//     })
//   }
//
//   const ALL_TESTS = CELL_SOURCE_LOCATION_INFO_TESTS
//
//   for (let i = 0; i < ALL_TESTS.length; i++) {
//     generateTest(ALL_TESTS[i])
//   }
// })

describe('Parse PRESERVE CELL POSITION INFORMATION', function() {
  function generateTest(test: CellQuotesTestType) {
    it(test.description, function() {
      let actual: ParseParseResult | Error

      try {
        actual = Papa.parse(test.input, {
          calcCsvFieldToInputPositionMapping: true,
          ...test.config,
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

      assert.deepEqual(actual.meta.outCsvFieldToInputPositionMapping, test.expectedCellPositionMapping)
    })
  }

  const ALL_TESTS = CELL_SOURCE_LOCATION_INFO_TESTS

  for (let i = 0; i < ALL_TESTS.length; i++) {
    generateTest(ALL_TESTS[i])
  }
})
