//-----------------------------------------------------------------------------
// Widgets
//-----------------------------------------------------------------------------
var errorWidget = document.getElementById('compileError');
errorWidget.style.visibility = 'hidden';
var loadingWidget = document.getElementById('loading');
loadingWidget.style.visibility = 'hidden';

var subjectsWidget = document.getElementById('subjects');
var assignmentsWidget = document.getElementById('assignments');
var filesWidget = document.getElementById('files');

// var table = document.getElementById('table');
var slider = document.getElementById('slider');
var editNumWidget = document.getElementById('edit-num');
var eventNumWidget = null;//document.getElementById('event-num');
var codeWidget = document.getElementById('textarea');
var astWidget = document.getElementById('ast_chart');
var astNodeCountWidget = document.getElementById('ast_node_count_chart');
// Display the default slider value
editNumWidget.innerHTML = slider.value + '/' + slider.max;

var findStringWidget = document.getElementById('findString');

var chart = null;
var timeline = null;

var asts = null;

//-----------------------------------------------------------------------------
// File-in-memory variables
//-----------------------------------------------------------------------------
let csvFile = null;
// Key is subject+assignment+file
let key2chunks = {};
// The chunks that are in memory
let chunksInMemory = new Set();
let firstChunkInMemory = -1;
// If a file is smaller than 16 Mb then go ahead and read it entirely into
// memory.
const SMALL_FILE_SIZE = 2**24;

// Map of subjects/assignments/files
let subject2assignments2files = new Map();

// All data
let dfall = null;
// Data for the selected subject
let dfSubject = null;
// Data for the selected subject/assignment
let dfAssign = null;
// Data for the selected subject/assignment/file
let df = null;
let editNum2rowNum = null;
let file = null;

let spreadsheet = null;

function addEntry(subject, assignment, file) {
  if (!subject2assignments2files.has(subject)) {
    subject2assignments2files.set(subject, new Map());
  }
  let assignments2files = subject2assignments2files.get(subject);
  if (!assignments2files.has(assignment)) {
    assignments2files.set(assignment, new Set());
  }
  let files = assignments2files.get(assignment);
  files.add(file);
}

function clearEntries() {
  subject2assignments2files = new Map();
}

//-----------------------------------------------------------------------------
// updatedfall
// If a subject/assignment/file combination is chosen that isn't in memory,
// read it in.
//-----------------------------------------------------------------------------
function updatedfall() {
  // Everything was read in
  if (Object.keys(key2chunks).length == 0) return true;
  
  let subjectID = subjectsWidget.value;
  let assignmentID = assignmentsWidget.value;
  let file = filesWidget.value;
  
  let chunks = key2chunks[subjectID+assignmentID+file];

  // Already in memory
  if (chunksInMemory.has(chunks[0]) &&
      (chunks.length==1 || chunksInMemory.has(chunks[1])))
    return true;

  // // Already in the first chunk. (Reread if it's in the second
  // // chunk to ensure that we have it in its entirety.)
  // if (firstChunkInMemory == chunks[0]) return true;

  // Read in chunks
  readTwoChunks(chunks[0]);
  return false;
}

//-----------------------------------------------------------------------------
// removeAllChildNodes
//-----------------------------------------------------------------------------
function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

//-----------------------------------------------------------------------------
// ps2Changed
// A new file is selected to read in.
//-----------------------------------------------------------------------------
function ps2Changed(event) {
  const fileList = event.target.files;
  if (fileList.length > 0) {
    const file = fileList[0];
    if (file.size < SMALL_FILE_SIZE) {
      readFileFull(file, '');
    } else {
      // window.alert('csv file too large to fit in memory. ' +
      //              'Files may load slightly slower.');
      readFilePartial(file, '');
    }
  }
}

//-----------------------------------------------------------------------------
// incFile
// Move to the next/prev file
//-----------------------------------------------------------------------------
function incFile(inc) {
  if (inc == 1) {
    if (filesWidget.selectedIndex < filesWidget.options.length-1) {
      filesWidget.selectedIndex += 1;
      fileChanged();
    } else if (assignmentsWidget.selectedIndex < assignmentsWidget.options.length-1) {
      assignmentsWidget.selectedIndex += 1;
      assignmentChanged();
    } else if (subjectsWidget.selectedIndex < subjectsWidget.options.length-1) {
      subjectsWidget.selectedIndex += 1;
      subjectChanged();
    } else {
      return false;
    }
  } else {
    if (filesWidget.selectedIndex > 0) {
      filesWidget.selectedIndex -= 1;
      fileChanged();
    } else if (assignmentsWidget.selectedIndex > 0) {
      assignmentsWidget.selectedIndex -= 1;
      assignmentChanged();
    } else if (subjectsWidget.selectedIndex > 0) {
      subjectsWidget.selectedIndex -= 1;
      subjectChanged();
    } else {
      return false;
    }
  }
  return true;
}

//-----------------------------------------------------------------------------
// onKeyPress
//-----------------------------------------------------------------------------
function onKeyPress(event) {
  // console.log(event.key);

  let inc = 'f';
  let dec = 'd';
  let inc10 = 'F';
  let dec10 = 'D';
  let incCheck = 'g';
  let decCheck = 's';
  let stringSearch = 'S';
  
  if (event.key == incCheck) {
    if (slider.value == slider.max) {
      if (incFile(1)) {
        slider.value = 0;
        sliderChanged(slider);
      }
    } else {
      slider.value = getNextCheckpoint();
      sliderChanged(slider);
    }
  } else if (event.key == decCheck) {
    if (slider.value == 0) {
      incFile(-1);
    } else {
      slider.value = getPrevCheckpoint();
      sliderChanged(slider);
    }
  } else if (event.key == 'j') {
    incFile(1);
  } else if (event.key == 'k') {
    incFile(0);
  } else if (event.key == 'a') {
    slider.value = 0;
    sliderChanged(slider);
  } else if (event.key == 'e') {
    slider.value = slider.max;
    sliderChanged(slider);
  } else if (event.key == dec) {
    slider.value = +slider.value - 1;
    sliderChanged(slider);
  } else if (event.key == inc) {
    // changeSlider(+slider.value + 1);
    slider.value = +slider.value + 1;
    sliderChanged(slider);
  } else if (event.key == dec10) {
    slider.value = +slider.value - 10;
    sliderChanged(slider);
  } else if (event.key == inc10) {
    slider.value = +slider.value + 10;
    sliderChanged(slider);
  } else if (event.key == ' ') {
    togglePlay();
  } else if (event.key == stringSearch) {
    let i = findString(findStringWidget.value);
    if (i > -1) {
      slider.value = i;
      sliderChanged(slider);
    }
  } else if (event.key == 'x') {
    test();
  }
}

function test() {
  debugger
}

//-----------------------------------------------------------------------------
// onKeyDown
//-----------------------------------------------------------------------------
function onKeyDown(event) {
  // console.log(event.key);

  if (event.key == 'ArrowRight') {
    incFile(1);
  } else if (event.key == 'ArrowLeft') {
    incFile(0);
  }    
}

function test1() {
  console.log('hover');
}

function mouseOverCode(e) {
  console.log(event);
  console.log(codeWidget.coordsChar({left:e.x, top:e.y}));
}

//-----------------------------------------------------------------------------
// onload
//-----------------------------------------------------------------------------
function onload() {
  spreadsheet = new Spreadsheet();
  
  // Get the tab with id="defaultOpen" and click on it
  // document.getElementById("defaultOpen").click();

  codeWidget = CodeMirror.fromTextArea(codeWidget, {
    mode: "python",
    // Enabling line numbers is a problem. Each time we call setValue()
    // on the widget 4 elements get added, per this code:
    //   document.querySelectorAll('div.CodeMirror-measure *').length
    // I don't know why CodeMirror does this -- I imagine it's a bug.
    // Anyway, it slows down the UI significantly as the user navigates more
    // and more.
    // lineNumbers: true,
    lineWrapping: true,
    readOnly: true,
    styleSelectedText: true,
  });
  CodeMirror.on(codeWidget.getWrapperElement(), "mouseover", mouseOverCode);
  
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keypress", onKeyPress);

  document.getElementById('ps2-selector').
    addEventListener('change', ps2Changed);

  loadDefaultCSV();
}

function loadDefaultCSV() {
  var request = new XMLHttpRequest();  
  request.open('GET', './sample.csv', true);
  request.onreadystatechange = function(){
    if (request.readyState === 4){
      if (request.status === 404) {  
      } else {
        // Load a file automatically for testing
        $.ajax({
          async:true,
          url: './sample.csv',
          dataType: 'text',
          success: function(data) {
            parseCSV(data);
          }
        });
      }
    }
  };
  request.send();
}

//-----------------------------------------------------------------------------
// prepdfall
// Converts timestamp to an integer and sets EventIdx.
//-----------------------------------------------------------------------------
function prepdfall() {
  let i = 0;
  dfall.forEach(row => {
    row.ClientTimestamp = +row.ClientTimestamp;
    row['EventIdx'] = i;
    i++;
  });
}

// function loadData() {
// }

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function updateSubjectWidget() {
  // let subjects = new Set();
  // dfall.forEach(row => {
  //   subjects.add(row['SubjectID']);
  // });

  // console.log(subjects);

  // console.log('updateSubjectWidget');
  removeAllChildNodes(subjectsWidget);
  // subjects = Array.from(subjects).sort()
  // subjects.forEach(file => {
  // console.log(subject2assignments2files.keys());
  // subject2assignments2files.keys().forEach(s => {
  // console.log('1');
  // console.log(subject2assignments2files);
  for (const s of subject2assignments2files.keys()) {
      var element = document.createElement("option");
    element.innerText = s;
    subjectsWidget.append(element);
  }//);

  subjectChanged();
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function subjectChanged() {
  subject = subjectsWidget.value;
  // dfSubject = dfall.filter(row => row.EventType == 'File.Edit' && row['SubjectID'] == subject);
  updateAssignmentWidget();
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function updateAssignmentWidget() {
  // let assignments = new Set();
  // dfSubject.forEach(row => {
  //   assignments.add(row['AssignmentID']);
  // });

  removeAllChildNodes(assignmentsWidget);
  // assignments = Array.from(assignments).sort()
  // assignments.forEach(assignment => {
  // subject2assignments2files.get(subject).keys().forEach(assignment => {
  for (const assignment of subject2assignments2files.get(subject).keys()) {
    var element = document.createElement("option");
    element.innerText = assignment;
    assignmentsWidget.append(element);
  }//);

  assignmentChanged();
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function assignmentChanged() {
  assignment = assignmentsWidget.value;
  // dfAssign = dfSubject.filter(row => row['AssignmentID'] == assignment);
  updateFileWidget();
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function updateFileWidget() {
  // let files = new Set();
  // dfAssign.forEach(row => {
  //   files.add(row['CodeStateSection']);
  // });

  removeAllChildNodes(filesWidget);
  // files = Array.from(files).sort()
  // files.forEach(file => {
  // subject2assignments2files.get(subject).get(assignment).keys().forEach(file => {
  for (const file of
       subject2assignments2files.get(subject).get(assignment).keys()) {
    var element = document.createElement("option");
    element.innerText = file;
    filesWidget.append(element);
  }//);

  file = filesWidget.value;
  fileChanged();
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
// function storeCompilable(df) {
//   let s = '';
//   let lastChange = -1;
//   // Reconstruct the file
//   for (let i = 0; i < df.length; ++i) {
//     let row = df[i];
//     let j = +row.SourceLocation;
//     lastChange = j;
//     if (row.DeleteText && row.DeleteText.length > 0) {
//       s = s.slice(0,j) + s.slice(j+row.DeleteText.length);
//     }
//     if (row.InsertText && row.InsertText.length > 0) {
//       s = s.slice(0,j) + row.InsertText + s.slice(j);
//     }

//     let errorLineNum = compile(s);
//     df[i].compilable = (errorLineNum == null);
//     // try {
//     //   filbert.parse(s);
//     //   df[i].compilable = true;
//     // } catch(e) {
//     //   df[i].compilable = false;
//     // }
//   }
// }

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function fileChanged() {
  // let t = [];
  // t.push(performance.now()); //****************

  file = filesWidget.value;
  if (!updatedfall()) return;
  loadingWidget.style.visibility = 'visible';

  spreadsheet.reset(dfall);

  df = dfall.filter(row => {
    return row.SubjectID == subject &&
      row.AssignmentID == assignment &&
      row.CodeStateSection == file &&
      row.EventType == 'File.Edit';
  });

  slider.max = df.length-1;
  slider.value = slider.max;
  editNumWidget.innerHTML = slider.value + '/' + slider.max;
  reconstruct(df, true);
  loadingWidget.style.visibility = 'hidden';

  // console.log('creating asts');
  asts = createAsts(df);
  updateAst();

  chart = new Chart();
  chart.create(df);
  chart.updatePlaybar(slider.value);

  astNodeCountChart = new AstNodeCountChart();
  astNodeCountChart.create(asts);

  timeline = new Timeline();
  timeline.create(df);
  timeline.updatePlaybar(slider.value);

  // t.push(performance.now()); //****************
  // console.log('timings');
  // for (let i = 1; i < t.length; ++i) {
  //   console.log(`${((t[i]-t[i-1])/1000).toFixed(1)}`);
  // }

}

//-----------------------------------------------------------------------------
// sliderChanged
//-----------------------------------------------------------------------------
function sliderChanged(slider) {
  // requestAnimationFrame(tick);

  editNumWidget.innerHTML = slider.value + '/' + slider.max;
  reconstruct(df, false);

  chart.updatePlaybar(slider.value);
  timeline.updatePlaybar(slider.value);
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
let play = false;
function togglePlay() {
  play = !play;
  if (play) {
    tick(0);
  }
}

// let drawing = false;
// function changeSlider(newValue) {
//   if (!drawing) {
//     slider.value = newValue;
//     requestAnimationFrame(tick);
//   }
// }
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
let lastTimestamp = -1;
function tick(timestamp) {
  if (play) {
    slider.value = +slider.value + 1;
    sliderChanged(slider);
    let i = +slider.value;
    if (i < df.length - 1) {
      let delay = df[i+1].ClientTimestamp - df[i].ClientTimestamp;
      delay = delay/10;
      if (delay < 1000/60) {
        delay = 1000/60;
      } else if (delay > 5000) {
        delay = 5000;
      }
      console.log(delay);
      setTimeout(() => { requestAnimationFrame(tick); }, delay);
    }
  }

  // if (animate) {
  //   ticks++;
  //   requestAnimationFrame(tick);
  //   var animSpeed = 500;

  //   var start = new Date().getTime();
  //   var once = true;
  //   // while (once || !showAnimation) {
  //   // while (once || !document.getElementById("showAnimation").checked) {
  //   once = false;
  //   for (var i = 0; i < animSpeed; ++i) {
  //     doStep();
  //   }

  //   var stop = new Date().getTime();
  //   tickElapsedTime += (stop-start);
  //   if (ticks == ticksPerUpdate) {
  //     var stepsPerSec = (animSpeed*ticksPerUpdate / tickElapsedTime) * 1000;
  //     logger.setDebugValue("fps", (stepsPerSec / 500).toFixed(1));
  //     tickElapsedTime = 0;
  //     ticks = 0;
  //   }

  //   render();
  // }
}


//-----------------------------------------------------------------------------
// sliderChanged
// Update the current slider value (each time you drag the slider handle)
//-----------------------------------------------------------------------------
slider.oninput = function() {
  sliderChanged(this);
}

//-----------------------------------------------------------------------------
// getNextCheckpoint
//-----------------------------------------------------------------------------
function getNextCheckpoint() {
  if (slider.value == slider.max) return slider.max;
  for (let i = +slider.value+1; i <= +slider.max; ++i) {
    let row = df[i];
    if (row.EditType == 'X-Checkpoint') {
      return i;
    }
  }
  return slider.max;
}

//-----------------------------------------------------------------------------
// getPrevCheckpoint
//-----------------------------------------------------------------------------
function getPrevCheckpoint() {
  if (slider.value == 0) return 0;
  for (let i = slider.value-1; i > 0; --i) {
    let row = df[i];
    if (row.EditType == 'X-Checkpoint') {
      return i;
    }
  }
  return 0;
}

//-----------------------------------------------------------------------------
// findString
// Look for the first time that a string appears in the reconstruction.
// Returns the index of the change.
//-----------------------------------------------------------------------------
function findString(toFind) {
  if (df.length == 0) {
    return -1;
  }
  
  // Reconstruct the file
  let s = '';
  for (let i = 0; i <= slider.max; ++i) {
    let row = df[i];
    let j = +row.SourceLocation;
    if (row.DeleteText && row.DeleteText.length > 0) {
      s = s.slice(0,j) + s.slice(j+row.DeleteText.length);
    }
    if (row.InsertText && row.InsertText.length > 0) {
      s = s.slice(0,j) + row.InsertText + s.slice(j);
    }

    if (s.indexOf(toFind) > -1) {
      return i;
    }
  }
  return -1;
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
function jumpToCh(i) {
  codeWidget.setCursor(codeWidget.doc.posFromIndex(i));
}

// //-----------------------------------------------------------------------------
// // i is the index of the character in a linearized representation of the code.
// //-----------------------------------------------------------------------------
// function getLineCh(i, lines) {
//   let j = 0;
//   let j_ = 0;
//   let line = 0;
//   while (j < i) {
//     j_ = j;
//     j += lines[line].length+1;
//     line++;
//   }
//   if (line == 0) line = 1;
//   let ch = i - j_;
//   return {line: line-1, ch: ch};
// }

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
let lastMark = null;
function markText(start, end) {
  if (lastMark) lastMark.clear();

  // let s = codeWidget.getValue();
  // // let s = codeWidget.value;
  // let lines = s.split('\n');
  // let a = getLineCh(start, lines);
  // let b = getLineCh(end, lines);
  let a = codeWidget.doc.posFromIndex(start);
  let b = codeWidget.doc.posFromIndex(end);

  lastMarkStart = a;
  lastMarkEnd = b;
  
  lastMark = codeWidget.markText(a, b, {className: "styled-background"});
}

//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
let lineLastMark = null;
function lineMarkText(start, end, className) {
  if (lineLastMark) lineLastMark.clear();

  // let s = codeWidget.getValue();
  // // let s = codeWidget.vaue;
  // let lines = s.split('\n');
  // let a = getLineCh(start, lines);
  // let b = getLineCh(end, lines);
  let a = codeWidget.doc.posFromIndex(start);
  let b = codeWidget.doc.posFromIndex(end);

  a.ch = 0;
  b.line = a.line+1;
  b.ch = 0;
  
  lineLastMarkStart = a;
  lineLastMarkEnd = b;
  
  lineLastMark = codeWidget.markText(a, b, {className: className});
  // console.log(lineLastMark);
}

// s is the current text
function replace(s, j, insertText, deleteText) {
  // let lines = s.split('\n');
  insertText = insertText ? insertText : '';
  deleteText = deleteText ? deleteText : '';
  s = s.slice(0,j) + insertText + s.slice(j+deleteText.length);

  // let a = codeWidget.doc.posFromIndex(start);
  // let b = codeWidget.doc.posFromIndex(end);
  // let lines = codeWidget.getValue().split('\n');
  // let a = getLineCh(j, lines);
  let a = codeWidget.doc.posFromIndex(j);
  if (deleteText.length > 0) {
    // let b = getLineCh(j + deleteText.length, lines);
    let b = codeWidget.doc.posFromIndex(j+deleteText.length);
    codeWidget.doc.replaceRange(insertText, a, b);
  } else {
    codeWidget.doc.replaceRange(insertText, a);
  }
  // doc.replaceRange(replacement: string, from: {line, ch}, to: {line, ch}, ?origin: string)

  return s;
}

//-----------------------------------------------------------------------------
// reconstruct
// Reconstruct the file.
//-----------------------------------------------------------------------------
let curIndex = -1;
let curReconstruction = '';
function reconstruct(df, fromScratch) {
  // console.log('reconstructing');
  // table.innerHTML = '';

  // codeWidget.setValue('');
  // codeWidget.value = '';

  if (df.length == 0) {
    return;
  }

  if (fromScratch) {
    curIndex = -1;
    curReconstruction = '';
  }

  let head = null;

  let s = curReconstruction;
  let lastChange = -1;
  // Reconstruct the file
  let newIndex = +slider.value;
  if (df.length > 0 && newIndex != curIndex) {
    // Setup
    let rstart = 0;
    // Moving forward
    if (curIndex < newIndex) {
      rstart = curIndex+1;
      s = curReconstruction;
    } else {
      // Moving backward. See if going backward or starting from
      // scratch would be more efficient.
      if (newIndex < curIndex - newIndex) {
        // Start from scratch
        rstart = 0;
        s = '';
      } else {
        // Move backward
        rstart = curIndex;
        s = curReconstruction;
      }
    }
    codeWidget.setValue(s);

    // Loop and do reconstruction
    if (newIndex >= rstart) {
      // Move forward
      for (let i = rstart; i <= newIndex; ++i) {
        let row = df[i];
        let j = +row.SourceLocation;
        lastChange = j;
        s = replace(s, j, row.InsertText, row.DeleteText);
      }
    } else {
      // Move backward
      for (let i = rstart; i > newIndex; --i) {
        let row = df[i];
        let j = +row.SourceLocation;
        lastChange = j;
        s = replace(s, j, row.DeleteText, row.InsertText);
      }
    }
    curIndex = newIndex;
  }

  curReconstruction = s;

  jumpToCh(lastChange);
  lineMarkText(lastChange, lastChange+1, "line-highlight");

  let lastAstLineMark = null

  let errorLineNum = compile(s);
  if (errorLineNum == null) {
    errorWidget.style.visibility = 'hidden';
    updateAst();
  } else {
    errorWidget.innerHTML = `Error on line ${errorLineNum}`;
    errorWidget.style.visibility = 'visible';
  }
  
  eventNum = df[slider.value].EventIdx;
  if (eventNumWidget != null) {
    eventNumWidget.innerHTML = eventNum;
  }
  const n = 5;
  let start = eventNum >= n ? eventNum-n : 0;
  let end = eventNum <= dfall.length-n ? eventNum+n : dfall.length;

  spreadsheet.update(dfall.slice(start, end), eventNum-start);
}

function updateAst() {
  if (asts != null) {
    ast = asts[+slider.value];
    if (ast != null) {
      ast_vis = Tree(ast, {
        label: d => d.name,
        children: d => d.children,
        nodeOnMouseOver: d => {
          // console.log(d.data);
          if(d.data.lineno !== undefined) {
            // lineno = d.data['lineno'];
            // col_offset = d.data['col_offset'];
            // startIndex = codeWidget.doc.indexFromPos({ line: lineno - 1, ch: col_offset});
            // lineMarkText(startIndex, startIndex+1, "ast-line-highlight");

            let node = d.data;
            // let startIndex = codeWidget.doc.indexFromPos({ line: node.startLine, ch: node.startCol});
            // let endIndex = codeWidget.doc.indexFromPos({ line: node.endLine, ch: node.endCol});
            let startIndex = node.start;
            let endIndex = node.end;

            let a = codeWidget.doc.posFromIndex(startIndex);
            let b = codeWidget.doc.posFromIndex(endIndex);

            // lineLastMarkStart = a;
            // lineLastMarkEnd = b;

            let className = 'ast-line-highlight';
            lineLastMark = codeWidget.markText(a, b, {className: className});
          }
        },
        nodeOnMouseOut: d => {
          lineLastMark.clear();
        },
      });
      removeAllChildNodes(astWidget);
      astWidget.append(ast_vis);
    }
  }
}

//-----------------------------------------------------------------------------
// parseCSV
// Given a string (data), parse the CSV. Assumes the header is in data.
//-----------------------------------------------------------------------------
function parseCSV(data) {
  temp = $.csv.toObjects(data);
  if (temp.length == 0) {
    window.alert('Empty csv file.')
    return;
  }

  dfall = temp;

  // Sort the original file
  dfall.sort((a,b) => {
    if (a.SubjectID != b.SubjectID) {
      return ('' + a.SubjectID).localeCompare(b.SubjectID)
      // return a.SubjectID - b.SubjectID
    }
    if (a.AssignmentID != b.AssignmentID) {
      return ('' + a.AssignmentID).localeCompare(b.AssignmentID)
      // return a.AssignmentID - b.AssignmentID
    }
    return a.ClientTimestamp - b.ClientTimestamp;
  });

  clearEntries();
  dfall.forEach(row => {
    addEntry(row.SubjectID, row.AssignmentID, row.CodeStateSection);
  });

  prepdfall();
  // loadData();//header+data);

  loadingWidget.style.visibility = 'visible';
  updateSubjectWidget();
  loadingWidget.style.visibility = 'hidden';
}

//-----------------------------------------------------------------------------
// readFileFull
// Read a CSV file into memory.
//-----------------------------------------------------------------------------
function readFileFull(file, header) {
  loadingWidget.style.visibility = 'visible';
  const reader = new FileReader();
  reader.addEventListener('load', (event) => {
    const data = event.target.result;
    parseCSV(data);
  });
  reader.readAsText(file);
}

//-----------------------------------------------------------------------------
// readFilePartial
// Read a file into memory in chunks.
//-----------------------------------------------------------------------------
function readFilePartial(file, header) {
  // loadingWidget.style.visibility = 'visible';
  csvFile = file;
  readAllChunks(file, (x) => {console.log('callback');});
}

let header = null;
let chunkOffsets = [0];
//-----------------------------------------------------------------------------
// readAllChunks
// Reads the csv file in its entirety, chunk-by-chunk. Finds all subjects,
// assignments, and files and also populates the chunkOffsets array for later
// reading of chunks from file.
//-----------------------------------------------------------------------------
function readAllChunks(file, callback) {
  header = null;
  clearEntries();
  Papa.parse(file, {
    header: true,
    worker: false,
    chunk: function(results) {
      if (header == null) {
        header = results.meta.fields;
      }
      console.log('chunk', chunkOffsets.length-1);

      let rows = results.data;
      let cursor = results.meta.cursor;

      // Get the first row and add to existing list of cursor positions.
      let curKey = rows[0].SubjectID +
          rows[0].AssignmentID +
          rows[0].CodeStateSection;
      if (curKey in key2chunks) {
        key2chunks[curKey].push(chunkOffsets.length-1);
      } else {
        key2chunks[curKey] = [chunkOffsets.length-1];
      }

      // clearEntries();
      addEntry(rows[0].SubjectID, rows[0].AssignmentID, rows[0].CodeStateSection);
      
      rows.forEach(row => {
        let key = row.SubjectID+row.AssignmentID+row.CodeStateSection;
        if (key != curKey) {
          key2chunks[key] = [chunkOffsets.length-1];
          curKey = key;
          addEntry(row.SubjectID, row.AssignmentID, row.CodeStateSection);
          // console.log(subject2assignments2files.keys());
        }
      });
      chunkOffsets.push(cursor);
    },
    complete: function() {
      console.log('completed reading chunks');
      // console.log(subject2assignments2files);
      // readTwoChunks(0);
      updateSubjectWidget();
    }
  });

}

//-----------------------------------------------------------------------------
// readTwoChunks
// We read two chunks into memory at a time since a file's events may span
// across a chunk boundary. This assumes that no file's events span an entire
// chunk.
//-----------------------------------------------------------------------------
function readTwoChunks(chunkIdx) {
  console.log('readTwoChunks', chunkIdx);

  if (chunkIdx == chunkOffsets.length-1) {
    chunkIdx-=2;
  } else if (chunkIdx == chunkOffsets.length-2) {
    chunkIdx-=1;
  }
  var offset = chunkOffsets[chunkIdx];
  var chunkSize = chunkOffsets[chunkIdx+2] - offset;
  var fr = new FileReader();
  
  let subjectIdx = header.findIndex((e) => e=='SubjectID');
  let assignIdx = header.findIndex((e) => e=='AssignmentID');
  let fileIdx = header.findIndex((e) => e=='CodeStateSection');
  
  fr.onload = function() {
    let data = event.target.result;
    var istart = Date.now();
    
    if (offset == 0) {
      dfall = $.csv.toObjects(data);
    } else {
      // Add the header for the parse
      dfall = $.csv.toObjects(header.join(',')+'\n'+data);
    }

    prepdfall();

    console.log(`Read chunk in ${(Date.now() - istart)/1000.0} seconds`);

    chunksInMemory = new Set([chunkIdx, chunkIdx+1]);
    firstChunkInMemory = chunkIdx;
    // updateSubjectWidget();
    fileChanged();
  };
  fr.onerror = function() {
    console.log('Error reading chunks');
  };

  // Should be >=?
  if (offset+chunkSize > csvFile.size) {
    console.error('Error: offset+chunk size is greater than file size');
    return;
  }
  var slice = csvFile.slice(offset, offset + chunkSize);
  fr.readAsText(slice);
}

//-----------------------------------------------------------------------------
// Tabs
//-----------------------------------------------------------------------------
function changeTabs(evt, tabName) {
  // // Declare all variables
  // var i, tabcontent, tablinks;

  // // Get all elements with class="tabcontent" and hide them
  // tabcontent = document.getElementsByClassName("tabcontent");
  // for (i = 0; i < tabcontent.length; i++) {
  //   tabcontent[i].style.display = "none";
  // }

  // // Get all elements with class="tablinks" and remove the class "active"
  // tablinks = document.getElementsByClassName("tablinks");
  // for (i = 0; i < tablinks.length; i++) {
  //   tablinks[i].className = tablinks[i].className.replace(" active", "");
  // }

  // // Show the current tab, and add an "active" class to the button that
  // // opened the tab
  // document.getElementById(tabName).style.display = "block";
  // evt.currentTarget.className += " active";
}
