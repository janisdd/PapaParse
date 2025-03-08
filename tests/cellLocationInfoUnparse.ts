import {assert, describe, it} from 'vitest'
import {Papa, ParseResult, UnparseConfig, UnparseResult} from '../papaparse'

type CsvFieldPosition = {
  start: number
  end: number
}

type CellQuotesTestType = {
  description: string
  data: Array<Array<string | null | undefined>>
  config?: UnparseConfig
  notes?: string
  expectedCellPositionMapping: CsvFieldPosition[][] | null
}

const DISABLE_CALC_CELL_LOCATION: CellQuotesTestType[] = [
  {
    description: "disable calc cell locations, 1 row",
    data: [['a', 'b', 'c']],
    config: {
      calcCsvFieldToInputPositionMapping: false,
    },
    expectedCellPositionMapping: null,
  },
  {
    description: "disable calc cell locations, 2 row",
    data: [['a', 'b', 'c'], ['a2', 'b2', 'c2']],
    config: {
      calcCsvFieldToInputPositionMapping: false,
    },
    expectedCellPositionMapping: null,
  },
  {
    description: "disable calc cell locations, null/undefined cells",
    data: [[null], ['a2', null, 'c2', undefined]],
    config: {
      calcCsvFieldToInputPositionMapping: false,
    },
    expectedCellPositionMapping: null,
  },
  {
    description: "disable calc cell locations, comments",
    data: [['#comment', '2'], ['a2', null, 'c2', undefined], ['#comment2', '2']],
    config: {
      calcCsvFieldToInputPositionMapping: false,
    },
    expectedCellPositionMapping: null,
  },
]

const PRESERVE_QUOTE_INFORMATION_CELLS_TESTS: CellQuotesTestType[] = [
  {
    description: "simple test, 1 row",
    data: [['a', 'b', 'c']],
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        },
        {
          start: 2,
          end: 3,
        },
        {
          start: 4,
          end: 5,
        },
      ]
    ]
  },
  {
    description: "simple test, 2 rows",
    data: [['a', 'b', 'c'], ['a', 'b', 'c']],
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        },
        {
          start: 2,
          end: 3,
        },
        {
          start: 4,
          end: 5,
        },
      ],
      [
        {
          start: 6,
          end: 7,
        },
        {
          start: 8,
          end: 9,
        },
        {
          start: 10,
          end: 11,
        },
      ]
    ]
  },
  {
    description: "simple test, 3 rows, different cell lengths",
    data: [['123', '1', '12345'], ['1', '2', '12'], ['', '12', '']],
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 3,
        },
        {
          start: 4,
          end: 5,
        },
        {
          start: 6,
          end: 11,
        },
      ],
      [
        {
          start: 12,
          end: 13,
        },
        {
          start: 14,
          end: 15,
        },
        {
          start: 16,
          end: 18,
        },
      ],
      [
        {
          start: 19,
          end: 19,
        },
        {
          start: 20,
          end: 22,
        },
        {
          start: 23,
          end: 23,
        },
      ],
    ]
  },
  //empty lines
  {
    description: "1 empty line",
    data: [[]],
    expectedCellPositionMapping: [
      []
    ]
  },
  {
    description: "2 empty lines",
    data: [[], []],
    expectedCellPositionMapping: [
      [],
      []
    ]
  },
  {
    description: "empty, line, empty",
    data: [[], ['1', '12'], []],
    expectedCellPositionMapping: [
      [],
      [
        {
          start: 1,
          end: 2,
        },
        {
          start: 3,
          end: 5,
        },
      ],
      [],
    ]
  },
  {
    description: "line, empty, line, empty, line",
    data: [['1'], [], ['1', '12'], [], ['1']],
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        }
      ],
      [],
      [
        {
          start: 3,
          end: 4,
        },
        {
          start: 5,
          end: 7,
        }
      ],
      [],
      [
        {
          start: 9,
          end: 10,
        }
      ],
    ]
  },
  //empty lines with skip empty
  {
    description: "1 empty line, skip empty",
    data: [[]],
    config: {
      skipEmptyLines: true,
    },
    expectedCellPositionMapping: []
  },
  {
    description: "2 empty lines, skip empty",
    data: [[], []],
    config: {
      skipEmptyLines: true,
    },
    expectedCellPositionMapping: []
  },
  {
    description: "empty, line, empty, skip empty",
    data: [[], ['1', '12'], []],
    config: {
      skipEmptyLines: true,
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        },
        {
          start: 2,
          end: 4,
        },
      ],
    ]
  },
  {
    description: "line, empty, line, empty, line, skip empty",
    data: [['1'], [], ['1', '12'], [], ['1']],
    config: {
      skipEmptyLines: true,
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        }
      ],
      [
        {
          start: 2,
          end: 3,
        },
        {
          start: 4,
          end: 6,
        }
      ],
      [
        {
          start: 7,
          end: 8,
        }
      ],
    ]
  },
  //multi char delim
  {
    description: "simple test, 1 row, len(delim)=3",
    data: [['a', 'b', 'c']],
    config: {
      delimiter: ',,,'
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        },
        {
          start: 4,
          end: 5,
        },
        {
          start: 8,
          end: 9,
        },
      ]
    ]
  },
  {
    description: "simple test, 1 row, with empty values, len(delim)=3",
    data: [['a', '', '', 'c'], ['', undefined, null, '1'], []],
    config: {
      delimiter: ',,,'
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 1,
        },
        {
          start: 4,
          end: 4,
        },
        {
          start: 7,
          end: 7,
        },
        {
          start: 10,
          end: 11,
        },
      ],
      [
        {
          start: 12,
          end: 12,
        },
        {
          start: 15,
          end: 15,
        },
        {
          start: 18,
          end: 18,
        },
        {
          start: 21,
          end: 22,
        },
      ],
      [],
    ]
  },
  //comments
  {
    description: "no real comment 1",
    data: [['12', '#12', 'c', '']],
    config: {
      delimiter: ',',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 2,
        },
        {
          start: 3,
          end: 6,
        },
        {
          start: 7,
          end: 8,
        },
        {
          start: 9,
          end: 9,
        },
      ]
    ]
  },
  {
    description: "no real comment 2",
    data: [['12', '##comment', '#no', 'c']],
    config: {
      delimiter: ',',
      rowInsertCommentLines_commentsString: '##',
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 2,
        },
        {
          start: 3,
          end: 12,
        },
        {
          start: 13,
          end: 16,
        },
        {
          start: 17,
          end: 18,
        },
      ]
    ]
  },
  {
    description: "comment line, comment line",
    data: [['#comment', '#comment', 'c'], ['#1', '1', null, '1']],
    config: {
      delimiter: ',',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 8,
        },
      ],
      [
        {
          start: 9,
          end: 11,
        },
      ]
    ]
  },
  {
    description: "no real comment 1",
    data: [['#12', '1'], ['1', '23'], ['#comm'], []],
    config: {
      delimiter: ',',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 3,
        },
      ],
      [
        {
          start: 4,
          end: 5,
        },
        {
          start: 6,
          end: 8,
        },
      ],
      [
        {
          start: 9,
          end: 14,
        },
      ],
      []
    ]
  },
  //different new line
  {
    description: "different new line",
    data: [['#12', '1'], ['1', '23'], ['#comm'], []],
    config: {
      newline: '\r\n',
      delimiter: ',',
      rowInsertCommentLines_commentsString: '#',
    },
    expectedCellPositionMapping: [
      [
        {
          start: 0,
          end: 3,
        },
      ],
      [
        {
          start: 5,
          end: 6,
        },
        {
          start: 7,
          end: 9,
        },
      ],
      [
        {
          start: 11,
          end: 16,
        },
      ],
      []
    ]
  },
]

describe('Parse PRESERVE CELL QUOTES INFORMATION Tests', function() {
  function generateTest(test: CellQuotesTestType) {
    it(test.description, function() {
      let actual: UnparseResult | Error

      try {
        actual = Papa.unparse(test.data, {
          calcCsvFieldToInputPositionMapping: true,
          newline: '\n',
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

  const ALL_TESTS = DISABLE_CALC_CELL_LOCATION.concat(PRESERVE_QUOTE_INFORMATION_CELLS_TESTS)

  for (let i = 0; i < ALL_TESTS.length; i++) {
    generateTest(ALL_TESTS[i])
  }
})
