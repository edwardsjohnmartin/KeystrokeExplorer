var Spreadsheet = function() {
  this.lastSelIdx = 0;
}

let sgrid = null;
let selectedID = '';

Spreadsheet.prototype.update = function(df, sid) {
  let data = [];
  let selIdx = sid;
  for (let i = 0; i < df.length; ++i) {
    let row = df[i];
    // data.push([row.EventType, row.EditType, row.InsertText, row.DeleteText]);
    let d = [];
    this.visiblecols.forEach(p => {
      d.push(row[p]);
    });
    data.push(d);
  }
  this.datatable.refresh(data);
  this.datatable.style.removeStyle(`.dt-cell--row-${this.lastSelIdx}`);
  this.datatable.style.setStyle(
    `.dt-cell--row-${selIdx}`, {backgroundColor: 'var(--ke-selected-color)'});

  this.lastSelIdx = selIdx;
}

Spreadsheet.prototype.reset = function(df) {
  let ignore = new Set(['EventID', 'SubjectID', 'AssignmentID',
                        'CodeStateSection', 'ToolInstances', 'CodeStateID',
                        'EventIdx']);
  this.visiblecols = Object.getOwnPropertyNames(df[0]).filter(
    x => x != '' && !ignore.has(x));
  let cols = [];
  this.visiblecols.forEach(name => {
    cols.push({
      name: name,
      id: name,
      editable: false,
      // resizable: false,
      sortable: false,
      focusable: false,
      dropdown: false,
      // format: (value) => {
      //   // console.log(value);
      //   // return value.fontcolor('blue');
      //   // return value.fontsize(.8).fontfamily('monospace');
      //   return value.fontsize(.8);
      // }
    })
  });
  
  this.datatable = new DataTable('#grid', {
    columns: cols,
    serialNoColumn: false,
    // dynamicRowHeight: true,
    cellHeight: 15,
  });
}
