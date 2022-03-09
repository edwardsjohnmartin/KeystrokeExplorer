var Spreadsheet = function() {
}

let sgrid = null;

Spreadsheet.prototype.update = function(df) {
  // if (this.grid) {
  //   this.grid.refresh();
  //   this.grid.renderArray(df);
  // }
  if (sgrid) {
    sgrid.refresh();
    sgrid.renderArray(df);
  }
}

Spreadsheet.prototype.reset = function(df) {
  require([
    'dojo/_base/declare',
    'dgrid/OnDemandGrid',
    'dgrid/extensions/ColumnHider',
    'dgrid/extensions/ColumnResizer'
  ], function (declare, OnDemandGrid, ColumnHider, ColumnResizer) {

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

    // 'use strict';
    // console.log(this);
    sgrid = grid;
    // grid.renderArray(df.slice(0, 10));

  });
  
}
