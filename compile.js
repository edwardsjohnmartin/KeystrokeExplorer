function outf(text) { 
  // var mypre = document.getElementById("output"); 
  // mypre.innerHTML = mypre.innerHTML + text; 
  console.log(text);
} 
function builtinRead(x) {
  if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
    throw "File not found: '" + x + "'";
  return Sk.builtinFiles["files"][x];
}

// Returns the line number of the error or null if prog compiles.
function compile(prog) {
  // Try skulpt
  // let prog1 = 'print("Hello world", end="\n\n")';
  // let prog2 = 'print(a)\nprint(xxyy)\n\nprint("Hello world, end=\n\n)';
  Sk.pre = "output";
  Sk.configure({output:outf, read:builtinRead}); 
  (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'mycanvas';
  try {
    var parse = Sk.parse(null, prog);
    var ast = Sk.astFromParse(parse.cst, null, parse.flags);
    console.log(ast);
    
    Sk.compile(prog);
    return null;
  } catch(e) {
    // Error in the compiler
    if (e.traceback == null || e.traceback.length == 0) {
      console.log('Warning: error while checking Python code for compile errors');
      // console.log(prog);
      console.log(e);
      return -1;
    }
    return e.traceback[0].lineno;
  }
  // var myPromise = Sk.misceval.asyncToPromise(function() {
  //   return Sk.importMainWithBody("<stdin>", false, prog, true);
  // });
  // myPromise.then(function(mod) {
  //   console.log('success');
  // }, function(err) {
  //   console.log(err.toString());
  // });
}
