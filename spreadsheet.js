var Spreadsheet = function() {
}

let sgrid = null;
let selectedID = '';

Spreadsheet.prototype.update = function(df, sid) {
  // if (this.grid) {
  //   this.grid.refresh();
  //   this.grid.renderArray(df);
  // }
  // if (sgrid) {
  selectedID = sid;
  sgrid.refresh();
  sgrid.renderArray(df);
  // }
}

Spreadsheet.prototype.reset = function(df) {
  require([
    'dojo/_base/declare',
    'dojo/aspect',
    'dgrid/OnDemandGrid',
    'dgrid/extensions/ColumnHider',
    'dgrid/extensions/ColumnResizer'
  ], function (declare, aspect, OnDemandGrid, ColumnHider, ColumnResizer) {

    const props = Object.getOwnPropertyNames(df[0]);
    // console.log(props);

    let visiblecols = new Set(['EventType', 'EditType', 'InsertText', 'DeleteText']);

    let columns = {};
    props.forEach(p => {
      if (p != '') {
        columns[p] = {
          label: p,
          hidden: !visiblecols.has(p),
          sortable: false
        };
      }
    });

    var grid = new (declare([ OnDemandGrid, ColumnHider, ColumnResizer ]))({
      columns: columns
    }, 'grid');

    sgrid = grid;

    aspect.after(grid, "renderRow", function(row, args) {
      // Apply classes to `row` based on `args[0]` here
      if (args[0].EventIdx == selectedID) {
        row.className += ' dgrid-selected-row';
      }
      return row;
    });

  });
  
}
