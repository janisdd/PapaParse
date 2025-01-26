# Found issues in papaparse

found issues -> todo report back

- `Papa.unparse([[null]], {skipEmptyLines: true})`
  - issue: throws
  - reason: `emptyLine = skipEmptyLines === 'greedy' ? data[row].join('').trim() === '' : data[row].length === 1 && data[row][0].length === 0;`
    - where `data[row][0]` is `null and then `.length === 0;` throws
