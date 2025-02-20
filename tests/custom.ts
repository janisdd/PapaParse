import {assert, describe, it} from 'vitest'
import {Papa, ParseConfig} from '../papaparse'

type TestType<T> = {
  description: string
  config?: ParseConfig
  notes?: string
  expected: T
  run: (callback: (result: T) => void) => void
}

const CUSTOM_TESTS: TestType<any>[] = [
  {
    description: "Should correctly guess custom delimiter when passed delimiters to guess.",
    expected: "~",
    run: function(callback) {
      const results = Papa.parse('"A"~"B"~"C"~"D"', {
        delimitersToGuess: ['~', '@', '%']
      })
      callback(results.meta.delimiter)
    }
  },
  {
    description: "Should still correctly guess default delimiters when delimiters to guess are not given.",
    expected: ",",
    run: function(callback) {
      const results = Papa.parse('"A","B","C","D"')
      callback(results.meta.delimiter)
    }
  },
  //---row mapping tests, fast mode
  //skip empty lines... is true for extension
  {
    description: "Should map line indices to csv line indices (fast mode)",
    expected: [0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n4,5,6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices trailing new line (fast mode)",
    expected: [0, 1, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n4,5,6\n7,8,9\n', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices empty lines (fast mode)",
    expected: [0, 1, 1, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n\n4,5,6\n7,8,9\n', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices empty lines (fast mode)",
    expected: [0, 1, 1, 2, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n\n4,5,6\n\n7,8,9\n', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    // this is because the csv extension uses comments false to output comments as csv lines
    description: "Should map line indices to csv line indices with comments 1 (fast mode)",
    expected: [0, 1, 2, 3],
    run: function(callback) {
      const results = Papa.parse('#test\n1,2,3\n4,5,6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices with comments 2 (fast mode)",
    expected: [0, 1, 2, 3],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n#test\n4,5,6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices with comments 3 (fast mode)",
    expected: [0, 1, 2, 3, 4],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n#test\n#test2\n4,5,6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices with comments trailing (fast mode)",
    expected: [0, 1, 2, 3, 4, 5, 6],
    run: function(callback) {
      const results = Papa.parse('#test\n1,2,3\n#test\n#test2\n4,5,6\n7,8,9\n#end', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices with comments trailing 2 (fast mode)",
    expected: [0, 1, 2, 3, 4, 5, 6, 7],
    run: function(callback) {
      const results = Papa.parse('#test\n1,2,3\n#test\n#test2\n4,5,6\n7,8,9\n#end\n#end2', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices with comments trailing 3 (fast mode)",
    expected: [0, 1, 2, 3, 4, 5, 6, 6],
    run: function(callback) {
      const results = Papa.parse('#test\n1,2,3\n#test\n#test2\n4,5,6\n7,8,9\n#end\n', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices with comments no data (fast mode)",
    expected: [0],
    run: function(callback) {
      const results = Papa.parse('#test', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  //--- normal mode (with quotes)
  {
    description: "Should map line indices to csv line indices last cell last char is new line (normal mode)",
    expected: [0, 1, 1, 2, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n\n4,5,6\n\n7,8,"9\n"', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices last cell last char is new line 2 (normal mode)",
    expected: [0, 1, 1, 2, 2, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n\n4,5,6\n\n7,8,"\n9\n"', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line indices last cell last char is new line 3 (normal mode)",
    expected: [0, 1, 1, 2, 2, 2, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n\n4,5,6\n\n7,"8\n","\n9\n"', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line 0 (normal mode)",
    expected: [0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2",3\n4,5,6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line 1 (normal mode)",
    expected: [0, 1, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2",3\n4,5,6\n7,8,9\n', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line 2 (normal mode)",
    expected: [0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1," 2 ",3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line 3 (normal mode)",
    expected: [0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1," 2 " ,3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with comments 1 (normal mode)",
    expected: [0, 1, 2, 3],
    run: function(callback) {
      const results = Papa.parse('#test\n1," 2 " ,3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with comments 2 (normal mode)",
    expected: [0, 1, 2, 3, 4],
    run: function(callback) {
      const results = Papa.parse('#test\n1," 2 " ,3\n#test\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with comments 3 (normal mode)",
    expected: [0, 1, 2, 3, 4],
    run: function(callback) {
      const results = Papa.parse('#test\n1," 2#nocomment2 " ,3\n#test\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields (normal mode)",
    expected: [0, 0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2",3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 2 (normal mode)",
    expected: [0, 0, 0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2 \n",3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 3 (normal mode)",
    expected: [0, 0, 0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2 \n2",3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 4 (normal mode)",
    expected: [0, 0, 0, 1, 1, 2, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2 \n2",3\n\n4,"5",6\n7,8,9\n', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 5 (normal mode)",
    expected: [0, 0, 0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2 \n2 ",3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 6 (normal mode)",
    expected: [0, 0, 0, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2 \n2 " ,3\n4,"5",6\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 7 (normal mode)",
    expected: [0, 0, 0, 1, 1, 2],
    run: function(callback) {
      const results = Papa.parse('1,"2\n2 \n2",3\n4,"5","6\n6"\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 8 (normal mode)",
    expected: [0, 0, 0, 0, 1, 1, 2],
    run: function(callback) {
      const results = Papa.parse('"\n1","2\n2 \n2",3\n4,"5","6\n6"\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 9 (normal mode)",
    expected: [0, 0, 0, 0, 1, 1, 2, 2],
    run: function(callback) {
      const results = Papa.parse('"\n1","2\n2 \n2",3\n4,"5","6\n6"\n"\n7",8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields 10 (normal mode)",
    expected: [0, 0, 0, 0, 1, 1, 2, 2, 2],
    run: function(callback) {
      const results = Papa.parse('"\n1","2\n2 \n2",3\n4,"5","6\n6"\n"\n7",8,"9\n"', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields and comments 1 (normal mode)",
    expected: [0, 1, 1, 1, 2, 2, 3],
    run: function(callback) {
      const results = Papa.parse('#comment\n1,"2\n2 \n2",3\n4,"5","6\n6"\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields and comments 2 (normal mode)",
    expected: [0, 1, 1, 1, 2, 2, 3, 4],
    run: function(callback) {
      const results = Papa.parse('#comment\n1,"2\n2 \n2",3\n4,"5","6\n6"\n#comment\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields and comments 3 (normal mode)",
    expected: [0, 1, 1, 1, 2, 2, 3, 4, 5],
    run: function(callback) {
      const results = Papa.parse('#comment\n"1","2\n2 \n2","#comment 3"\n4,"5","6\n6"\n#comment\n#comment\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields and comments 4 (normal mode)",
    expected: [0, 1, 1, 1, 1, 2, 2, 3, 4, 5],
    run: function(callback) {
      const results = Papa.parse('#comment\n\n"1","2\n2 \n2",3\n4,"5","6\n6"\n#comment\n#comment\n7,8,9', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  {
    description: "Should map line indices to csv line with new line fields special 1 (normal mode)",
    expected: [0, 1, 1],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3"\n4,"5\n",6', {
        calcLineIndexToCsvLineIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outLineIndexToCsvLineIndexMapping)
    }
  },
  //--- column mapping, we only use the first line... (1 based, with separator)
  {
    description: "Should map column indices to csv column indices (fast mode)",
    expected: [[1, 3, 4], [1, 3, 4], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('1,2,3\n4,5,6\n7,8,9', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 2 (fast mode)",
    expected: [[1, 4, 5], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('1,22,3\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3 (fast mode)",
    expected: [[1, 4, 6], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('1,22,33\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.1 (fast mode)",
    expected: [[1, 4, 6], [2, 6, 10]],
    run: function(callback) {
      const results = Papa.parse('1,22,33\n44,555,6666', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 4 (fast mode)",
    expected: [[0, 6, 8], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse(',22222,33\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices comment (fast mode)",
    expected: [[7], [0, 6, 8], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('#comment\n,22222,33\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices comment longer (fast mode)",
    expected: [[16], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('#comment,22222,33\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices no line break 1 (fast mode)",
    expected: [[1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('1,2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices no line break 2 (fast mode)",
    expected: [[1, 3, 8]],
    run: function(callback) {
      const results = Papa.parse('1,2,33333', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter (fast mode)",
    expected: [[2, 4, 5]],
    run: function(callback) {
      const results = Papa.parse('1 ,2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 1 (fast mode)",
    expected: [[2, 4, 5]],
    run: function(callback) {
      const results = Papa.parse(' 1,2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 2 (fast mode)",
    expected: [[3, 5, 6]],
    run: function(callback) {
      const results = Papa.parse(' 1 ,2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 3 (fast mode)",
    expected: [[3, 8, 9]],
    run: function(callback) {
      const results = Papa.parse(' 1 ,   2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 4 (fast mode)",
    expected: [[3, 8, 12]],
    run: function(callback) {
      const results = Papa.parse(' 1 ,   2,3   ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 4 (fast mode)",
    expected: [[3, 8, 12]],
    run: function(callback) {
      const results = Papa.parse(' 1 ,   2,   3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 4 (fast mode)",
    expected: [[3, 8, 14]],
    run: function(callback) {
      const results = Papa.parse(' 1 ,   2,   3  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  //--- normal mode
  {
    description: "Should map column indices to csv column indices 1 (normal mode)",
    expected: [[3, 5, 6], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('"1",2,3\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 2 (normal mode)",
    expected: [[3, 5, 6], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,3\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 2.1 (normal mode)",
    expected: [[3, 5, 6], [-1], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,3\n\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 2.2 (normal mode)",
    expected: [[3, 5, 6], [0], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,3\n \n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 2.3 (normal mode)",
    expected: [[3, 5, 6], [0], [1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,3\n \n  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3 (normal mode)",
    expected: [[1, 3, 6], [-1]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.1 (normal mode)",
    expected: [[1, 3, 6], [2]], // 2 because the field is not empty
    run: function(callback) {
      const results = Papa.parse('1,2,"3"\n   ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.2 (normal mode)",
    expected: [[1, 3, 9], [0]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"   \n ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.3 (normal mode)",
    expected: [[1, 3, 9], [2, 4, 5]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"   \n 4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.4 (normal mode)",
    expected: [[1, 3, 9], [4, 7, 8]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"   \n "4", 5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.5 (normal mode)",
    expected: [[1, 3, 9], [4, 7, 12]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"   \n "4", 5,"6"  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 3.6 (normal mode)",
    expected: [[1, 3, 9], [4, 7, 12], [0]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"   \n "4", 5,"6"  \n ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices 4 (normal mode)",
    expected: [[3, 5, 8], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with new lines in field (normal mode)",
    expected: [[4, 6, 9], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1\n",2,"3"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with new lines in field 2 (normal mode)",
    expected: [[5, 7, 10], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1\n\n",2,"3"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with new lines in field 3 (normal mode)",
    expected: [[5, 7, 10]],
    run: function(callback) {
      const results = Papa.parse('"1\n\n",2,"3"', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with new lines in field 4 (normal mode)",
    expected: [[4]],
    run: function(callback) {
      const results = Papa.parse('"1\n\n"', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with new lines in field 5 (normal mode)",
    expected: [[4], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1\n\n"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with new lines in field 5 (normal mode)",
    expected: [[4], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1\n\n"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with escaped quotes (normal mode)",
    expected: [[10, 12, 13]],
    run: function(callback) {
      const results = Papa.parse('"1 ""1"" ",2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with escaped quotes 2 (normal mode)",
    expected: [[11, 13, 14]],
    run: function(callback) {
      const results = Papa.parse('"1 ""1"" " ,2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 1 (normal mode)",
    expected: [[5, 7, 8]],
    run: function(callback) {
      const results = Papa.parse('"1"  ,2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 2 (normal mode)",
    expected: [[8, 12, 14]],
    run: function(callback) {
      const results = Papa.parse('  " 1"  , 2 , 3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 3 (normal mode)",
    expected: [[1, 3, 6]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 4 (normal mode)",
    expected: [[1, 3, 8]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 5 (normal mode)",
    expected: [[1, 3, 9]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3 "  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 5 (normal mode)",
    expected: [[1, 3, 11]],
    run: function(callback) {
      const results = Papa.parse('1,2,  "3 "  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 6 (normal mode)",
    expected: [[1, 3, 11], [-1]],
    run: function(callback) {
      const results = Papa.parse('1,2,  "3 "  \n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter 7 (normal mode)",
    expected: [[1, 3, 11], [2]],
    run: function(callback) {
      const results = Papa.parse('1,2,  "3 "  \n   ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 1 (normal mode)",
    expected: [[1, 3, 6], [-1]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 2 (normal mode)",
    expected: [[1, 3, 8], [-1]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"  \n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 3 (normal mode)",
    expected: [[1, 3, 9], [-1]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3 "  \n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 4 (normal mode)",
    expected: [[1, 3, 11], [-1]],
    run: function(callback) {
      const results = Papa.parse('1,2,  "3 "  \n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },

  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 1 and last space (normal mode)",
    expected: [[1, 3, 6], [1]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"\n  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 2 and last space (normal mode)",
    expected: [[1, 3, 8], [1]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3"  \n  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 3 and last space (normal mode)",
    expected: [[1, 3, 9], [2]],
    run: function(callback) {
      const results = Papa.parse('1,2,"3 "  \n   ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with space around delimiter and end new line 4 and last space (normal mode)",
    expected: [[1, 3, 11], [1]],
    run: function(callback) {
      const results = Papa.parse('1,2,  "3 "  \n  ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices no line break (normal mode)",
    expected: [[3, 5, 6]],
    run: function(callback) {
      const results = Papa.parse('"1",2,3', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices no line break 2 (normal mode)",
    expected: [[3, 5, 8]],
    run: function(callback) {
      const results = Papa.parse('"1",2,333', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices no line break 3 (normal mode)",
    expected: [[3, 5, 10]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"333"', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },

  //--- normal mode copied with second row
  {
    description: "Should map column indices to csv column indices with second row 1 (normal mode)",
    expected: [[3, 5, 8], [1, 3, 4]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3"\n4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 2 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 5]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 3 (normal mode)",
    expected: [[3, 5, 9], [6, 7]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n" 4,5",6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 4 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 8]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,6   ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 5 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 8], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,6   \n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 6 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 7], [0]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,6  \n ', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 7 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 8]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,"6 "', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 8 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 8], [-1]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,"6 "\n', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 9 (normal mode)",
    expected: [[3, 5, 9], [2, 4, 5], [4]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,5,6\n#end', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 10 (normal mode)",
    expected: [[3, 5, 9], [2, 8, 9]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,"5\n5",6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices with second row 11 (normal mode)",
    expected: [[3, 5, 9], [2, 7, 8]],
    run: function(callback) {
      const results = Papa.parse('"1",2,"3" \n 4,"5\n",6', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices last empty (fast mode)",
    expected: [[0, 1, 2, 2]],
    run: function(callback) {
      const results = Papa.parse(',,,', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices last not empty (fast mode)",
    expected: [[0, 1, 2, 3]],
    run: function(callback) {
      const results = Papa.parse(',,,a', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices last empty (normal mode)",
    expected: [[3, 4, 5, 5]],
    run: function(callback) {
      const results = Papa.parse('"a",,,', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
  {
    description: "Should map column indices to csv column indices last not empty (normal mode)",
    expected: [[3, 4, 5, 6]],
    run: function(callback) {
      const results = Papa.parse('"a",,,a', {
        calcColumnIndexToCsvColumnIndexMapping: true,
        skipEmptyLines: true,
        rowInsertCommentLines_commentsString: "#",
      })
      callback(results.meta.outColumnIndexToCsvColumnIndexMapping)
    }
  },
]

describe('Custom Tests', function() {
  function generateTest(test: TestType<any>) {

    it(test.description, () => new Promise<void>((done) => {
      test.run(function(actual) {
        assert.deepEqual(JSON.stringify(actual), JSON.stringify(test.expected), test.description)
        done()
      })
    }))
  }

  for (let i = 0; i < CUSTOM_TESTS.length; i++) {
    generateTest(CUSTOM_TESTS[i])
  }
})

