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


class AstNode {
  constructor(name) {
    this.name = name;
    this.children = [];
  }
}

function createAstNode(ast) {
  let node = new AstNode('');//ast._astname);
  if (ast._astname !== undefined) {
    node.name = ast._astname;
  }
  if (ast.arg !== undefined && ast.arg.v !== undefined) {
    node.name = ast.arg.v;
  }

  // The arguments node and the child nodes of arguments are all called
  // arguments. Sigh.
  if (node.name == 'arguments') {
    ast.args.forEach((child) => {
      node.children.push(createAstNode(child));
    });
  } else {
    if (ast.args !== undefined) {
      node.children.push(createAstNode(ast.args));
    }
  }

  if (ast.body !== undefined) {
    ast.body.forEach((child) => {
      node.children.push(createAstNode(child));
    });
  }

  return node;
}

function createAsts(df) {
  asts = []
  codeStateTracker = new CodeStateTracker()
  df.forEach((row, i) => {
    codeStateTracker.updateCode(row, i)

    try {
      var parse = Sk.parse(null, codeStateTracker.currentCodeState);
      var ast = Sk.astFromParse(parse.cst, null, parse.flags);
      if (i == 1327) {
        // This is useful to inspect what is in an AST
        console.log(ast);
      }
      asts[i] = createAstNode(ast);
    } catch (e) {
      // console.log('AST parse failed:', e);
      asts[i] = null;
    }
  });
  // console.log(asts[asts.length-1]);
  // console.log(new AstNode(asts[asts.length-1]));
  return asts;
}

// class ASTs {
//   constructor() {
//     // this.astNodeCounts = []
//     this.asts = []
//     this.codeStateTracker = new CodeStateTracker()
//   }

//   newRow(row, i) {
//     // Puts code into this.codeStateTracker.currentCodeState
//     this.codeStateTracker.updateCode(row, i)

//     try {
//       var parse = Sk.parse(null, this.codeStateTracker.currentCodeState);
//       var ast = Sk.astFromParse(parse.cst, null, parse.flags);
//       this.asts[i] = ast;
//       // console.log(ast);
//     } catch (e) {
//       this.asts[i] = null;
//       // console.log(null);
//     }

//     // // DEBUG
//     // if (i % 100 == 0) {
//     //   this.asts[i] = calcNumAstNodes(this.codeStateTracker.currentCodeState)
//     // } else {
//     //   this.astNodeCounts[i] = 0;
//     // }
//   }

//   create(df) {
//     df.forEach((row, i) => {
//       this.newRow(row, i)
//     });
//   }
// }
