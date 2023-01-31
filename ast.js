let debug = false;

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
  constructor(src) {
    this.name = '';
    this.children = [];
    this.lineno = -1;
    this.col_offset = -1;
    this.src = src;
  }
}

function createBinOp(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  node.name = ast.op.prototype._astname;
  node.children.push(createAstNode(ast.left));
  node.children.push(createAstNode(ast.right));
  return node;
}

function createCall(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  if (ast.func.id !== undefined) {
    node.name = 'call ' + ast.func.id.v;
  } else {
    node.name = 'call ' + ast.func.attr.v;
  }

  // Arguments
  if (ast.args != null) {
    ast.args.forEach((child) => {
      node.children.push(createAstNode(child));
    });
  }

  return node;
}

function createArgument(ast) {
  // ast is an argument node
  let node = new AstNode(ast);
  node.name = ast.arg.v;

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  // if (debug) {
  //   console.log(ast);
  // }

  // The arguments node and the child nodes of arguments are all called
  // arguments. Sigh.
  if (ast.args !== undefined && ast.args != null) {
    ast.args.forEach((child) => {
      // node.children.push(createAstNode(child));
      node.children.push(createArgument(child));
    });
  }
  
  return node;
}

function createParameters(ast) {
  // Sk.astnodes.arguments_ node
  let node = new AstNode(ast);
  node.name = 'Parameters';

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  ast.args.forEach((child) => {
    let cnode = new AstNode(child);
    cnode.name = child.arg.v;
    node.children.push(cnode);
  });

  // } else {
  //     // console.log(ast);
  //     node.children.push(createAstNode(ast));
  //     // ast.forEach((child) => {
  //     //   // node.children.push(createAstNode(child));
  //     //   node.children.push(createArgument(child));
  //     // });
  //   }

  return node;
}

function createFunctionDef(ast) {
  let node = new AstNode(ast);
  node.name = 'def ' + ast.name.v;

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  // Parameters
  if (ast.args.args.length > 0) {
    node.children.push(createParameters(ast.args));
  }

  // Body of a function, loop, conditional, etc
  if (ast.body !== undefined) {
    ast.body.forEach((child) => {
      node.children.push(createAstNode(child));
    });
  }

  return node;
}

function createCompare(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  node.name = 'Compare';
  
  node.children.push(createAstNode(ast.left));
  ast.ops.forEach((opnode,i) => {
    // let op = new AstNode(opnode);
    let op = new AstNode(ast.ops);
    op.name = opnode.prototype._astname;
    node.children.push(op);
    node.children.push(createAstNode(ast.comparators[i]));
  });

  return node;
}

function createAssign(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  node.name = '=';
  
  ast.targets.forEach((target) => {
    node.children.push(createAstNode(target));
  });
  node.children.push(createAstNode(ast.value));

  return node;
}

function createAugDecAssign(ast, aug) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  if (aug) {
    node.name = '+=';
  } else {
    node.name = '-=';
  }
  
  node.children.push(createAstNode(ast.target));
  node.children.push(createAstNode(ast.value));

  return node;
}

function createFor(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  node.name = 'For';

  node.children.push(createAstNode(ast.target));
  node.children.push(createAstNode(ast.iter));
  ast.body.forEach((target) => {
    node.children.push(createAstNode(target));
  });

  return node;
}

function createReturn(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  node.name = 'Return';
  if (ast.value != null) {
    node.children.push(createAstNode(ast.value));
  }

  return node;
}

//------------------------------------------------------------
// Main function
//------------------------------------------------------------
function createAstNode(ast) {
  let node = new AstNode(ast);

  node.lineno = ast.lineno;
  node.col_offset = ast.col_offset;

  node.name = ast._astname;

  if (node.name == 'Call') {
    node = createCall(ast);
  } else if (node.name == 'BinOp') {
    node = createBinOp(ast);
  } else if (node.name == 'Expr') {
    // Don't keep the expression -- just take it's value node
    node = createAstNode(ast.value);
  } else if (node.name == 'FunctionDef') {
    node = createFunctionDef(ast);
  } else if (node.name == 'Name') {
    node.name = ast.id.v;
  } else if (node.name == 'Compare') {
    node = createCompare(ast);
  } else if (node.name == 'Assign') {
    node = createAssign(ast);
  } else if (node.name == 'AugAssign') {
    node = createAugDecAssign(ast, true);
  } else if (node.name == 'DecAssign') {
    node = createAugDecAssign(ast, false);
  } else if (node.name == 'For') {
    node = createFor(ast);
  } else if (node.name == 'Return') {
    node = createReturn(ast);
  } else {
    // Loop, conditional, etc
    if (ast.test !== undefined) {
      node.children.push(createAstNode(ast.test));
    }
    // Body of a function, loop, conditional, etc
    if (ast.body !== undefined) {
      ast.body.forEach((child) => {
        node.children.push(createAstNode(child));
      });
    }
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
        debug = true;
      }
      asts[i] = createAstNode(ast);
      if (i == 1327) {
        // This is useful to inspect what is in an AST
        console.log('compare asts');
        console.log(ast);
        console.log(asts[i]);
      }
    } catch (e) {
      if (e.tp$name != 'SyntaxError')
        console.log('AST parse failed:', e);
      asts[i] = null;
    }
  });
  return asts;
}
