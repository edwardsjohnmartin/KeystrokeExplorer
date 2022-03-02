Change = function(s, start) {
  this.s = s;
  this.prev = null;
  this.next = null;
  this.start = start;
  this.end = -1;
}

Change.prototype.isin = function(i) {
  return this.start <= i && this.end >= i;
}

Chart = function() {
  this.arr = [];
  this.head = null;
  this.end = -1;
}

Chart.prototype.newRow = function(row, i) {
  this.end = i;
  let j = +row.SourceLocation;
  j = j < this.arr.length ? j : this.arr.length;
  // console.log(i);
  // delete
  if (row.DeleteText && row.DeleteText.length > 0) {
    for (let k = 0; k < row.DeleteText.length; ++k) {
      this.arr[j+k].end = i;
    }
    this.arr = this.arr.slice(0,j).concat(this.arr.slice(j+row.DeleteText.length));
  }
  // insert
  if (row.InsertText && row.InsertText.length > 0) {
    for (let k = 0; k < row.InsertText.length; ++k) {
      let c = new Change(row.InsertText[k], i);
      // console.log(j, k);
      if (!this.head) {
        this.arr = [c];
        this.head = c;
      } else if (j+k == this.arr.length) {
        let last = this.arr[this.arr.length-1];
        last.next = c;
        c.prev = last;
        this.arr.push(c);
      } else {
        // console.log(j,k,this.arr.length);
        let prev = this.arr[j+k].prev;
        let next = this.arr[j+k];
        if (prev && next) {
          // In the middle
          if (prev.next != next) {
            console.error('prev.next != next');
          }
          prev.next = c;
          c.next = next;
          c.prev = prev;
          next.prev = c;
        } else if (prev) {
          // At the end
          prev.next = c;
          c.prev = prev;
        } else if (next) {
          // At the beginning
          c.next = next;
          next.prev = c;
        }
        this.arr = this.arr.slice(0,j+k).concat([c]).concat(this.arr.slice(j+k));
      }
    }
  }
}

Chart.prototype.create = function(df) {
  if (df.length > 0) {
    for (let i = 0; i < df.length; ++i) {
      let row = df[i];
      this.newRow(row, i);
    }
  } else {
    d3.select('#bars').selectAll('*').remove();
    d3.select('#barsstart').selectAll('*').remove();
    d3.select('#barsend').selectAll('*').remove();
    return;
  }

  let allChanges = true;

  this.allData = [];
  let n = 0;
  let c = this.head;
  while (c != null) {
    n++;
    if (c.end == -1) {
      c.end = this.end;
      this.allData.push(c);
    } else {
      if (allChanges) {
        this.allData.push(c);
      }
    }
    c = c.next;
  }
  const chartWidth = document.getElementById('chart').clientWidth;
  const chartHeight = document.getElementById('chart').clientHeight;
  const width = chartWidth/n;
  const f = chartHeight/(this.end == 0?1:this.end);
  let chart = this;

  d3.select('#cpchartgroup')
    .attr("transform", `translate(0 ${chartHeight}) scale(1 -1)`);

  // Bars
  {
    let update = d3.select('#bars').selectAll('rect').data(this.allData);
    let enter = update.enter().append('rect');
    update.merge(enter)
      .attr('x', (d,i) => i*width)//yaxisWidth+xScale(d.year))
      .attr('width', width)//xScale.bandwidth())
      .attr('y', d => (this.end-d.end)*f)
      .attr('height', d=>(d.end-d.start)*f)
      .on('mouseover', function (d, i) {
        d3.select(this).style("stroke", "red");
        let idx = chart.atEvent(d, slider.value);
        markText(idx, idx+1);
      })
      .on('mouseout', function (d, i) {
        d3.select(this).style("stroke", "steelblue");
      })
    ;
    update.exit().remove();
  }

  // Start bars
  {
    let update = d3.select('#barsstart').selectAll('rect').data(this.allData);
    let enter = update.enter().append('rect');
    update.merge(enter)
      .attr('x', (d,i) => i*width)//yaxisWidth+xScale(d.year))
      .attr('width', width)//xScale.bandwidth())
      .attr('y', d => (this.end-d.start)*f)
      .style('stroke', 'red')
      .style('stroke-width', '0.5')
      .attr('height', d=>0.5)
    ;
    update.exit().remove();
  }

  // End bars
  {
    let update = d3.select('#barsend').selectAll('rect').data(this.allData);
    let enter = update.enter().append('rect');
    update.merge(enter)
      .attr('x', (d,i) => i*width)
      .attr('width', width)
      .attr('y', d => (this.end-d.end)*f)
      .style('stroke', 'red')
      .style('stroke-width', '0.5')
      .attr('height', 0.5)
    ;
    update.exit().remove();
  }

  // Compilable
  {
    let update = d3.select('#compilable').selectAll('rect').data(df);
    let enter = update.enter().append('rect');
    update.merge(enter)
      .attr('x', 0)
      .attr('width', 0.5)
      .attr('y', (d,i) => (this.end-i)*f)
      .attr('height', 0.5)
      .style('stroke', d => d.compilable ? 'lightgreen' : 'red')
      .style('fill', d => d.compilable ? 'lightgreen' : 'red')
      .style('stroke-width', '3.5')
    ;
    update.exit().remove();
  }
}

Chart.prototype.updatePlaybar = function(value) {
  const chartWidth = document.getElementById('chart').clientWidth;
  const chartHeight = document.getElementById('chart').clientHeight;
  const f = chartHeight/(this.end == 0?1:this.end);
  // this.playbar = [slider.value-100];
  this.playbar = [value];

  let update = d3.select('#playbarg').selectAll('rect')
      .data(this.playbar);
  let enter = update.enter();
  enter = enter
    .append('rect');
  update.merge(enter)
    .attr('id', 'playbar')
    .attr('x', 0)
    .attr('width', chartWidth)
    .attr('y', d => (this.end-d)*f)
    .attr('height', 1.5)
    .style('stroke', '#EDBB99')
    .style('fill', '#EDBB99')
  ;
  update.exit().remove();
}

// Get the index of a change at event i
Chart.prototype.atEvent = function(change, i) {
  if (!change.isin(i)) return -1;
  let c = this.head;
  let j = 0;
  while (c != null) {
    if (c == change) {
      return j;
    }
    if (c.isin(i)) {
      j++;
    }
    c = c.next;
  }
  throw 'Unexpected';
}

Chart.prototype.getStatistics = function() {
  // // Statistics
  // let c = this.head;
  // let total = 0;
  // let deleted = 0;
  // while (c != null) {
  //   total++;
  //   if (c.end > -1) deleted++;
  //   c = c.next;
  // }
  // console.log(`${deleted}/${total}`);
}

Chart.prototype.printAll = function() {
  let c = this.head;
  let temp = '';
  while (c != null) {
    temp += c.s;
    c = c.next;
  }
  console.log(temp);
}

Chart.prototype.printFinal = function() {
  let temp = '';
  for (let i = 0; i < this.arr.length; ++i) {
    temp += this.arr[i].s;
  }
  console.log(temp);
}
