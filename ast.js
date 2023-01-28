/**
 * Helper class to keep track of the state of code over time
 */
class CodeStateTracker {
  constructor() {
    this.currentCodeState = ''
  }

  /**
   * Update the code by the change from one edit event 
   */
  updateCode(editEvent, i) {
    const codeAdded = editEvent['InsertText']
    const codeRemoved = editEvent['DeleteText']
    
    if (codeAdded == '' && codeRemoved == '') {
      return
    }
    
    if (editEvent['SourceLocation'] == '') {
      return
    }
    
    const editPosition = parseFloat(editEvent['SourceLocation'])
    const plannedRemove = this.currentCodeState.slice(editPosition, editPosition + codeRemoved.length)
    if ( plannedRemove !== codeRemoved) {
      throw new Exception("Code removed doesn't match event")
    }
    const result = this.currentCodeState.slice(0, editPosition) + codeAdded + 
          this.currentCodeState.slice(editPosition + codeRemoved.length, this.currentCodeState.length)
    this.currentCodeState = result
  }
}


class ASTs {
  constructor() {
    // this.astNodeCounts = []
    this.asts = []
    this.codeStateTracker = new CodeStateTracker()
  }

  newRow(row, i) {
    // Puts code into this.codeStateTracker.currentCodeState
    this.codeStateTracker.updateCode(row, i)

    try {
      var parse = Sk.parse(null, this.codeStateTracker.currentCodeState);
      var ast = Sk.astFromParse(parse.cst, null, parse.flags);
      this.asts[i] = ast;
      // console.log(ast);
    } catch (e) {
      this.asts[i] = null;
      // console.log(null);
    }

    // // DEBUG
    // if (i % 100 == 0) {
    //   this.asts[i] = calcNumAstNodes(this.codeStateTracker.currentCodeState)
    // } else {
    //   this.astNodeCounts[i] = 0;
    // }
  }

  create(df) {
    df.forEach((row, i) => {
      this.newRow(row, i)
    });
  }
}
