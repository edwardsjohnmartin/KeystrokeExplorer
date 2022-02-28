Timeline = function() {
  // this.starts = [];
  // this.ends = [];
  this.start = -1;
  this.end = -1;
}

Timeline.prototype.create = function(df) {
  if (df.length > 0) {
    this.start = df[0].ClientTimestamp;
    this.end = df[df.length-1].ClientTimestamp;
  } else {
    d3.select('#timeline').selectAll('*').remove();
    return;
  }

  const chartWidth = document.getElementById('chart').clientWidth;
  const chartHeight = document.getElementById('chart').clientHeight;
  // const width = chartWidth/n;
  const f = chartWidth/(this.end-this.start);
  let chart = this;

  let existing = d3.select('#timeline').selectAll('rect').data(df.slice(0,-1));
  let enter = existing.enter().append('rect');
  // console.log(enter);
  existing.merge(enter)
    .attr('x', (d,i) => (d.ClientTimestamp - this.start)*f)
    .attr('width', (d,i) => (df[i+1].ClientTimestamp-d.ClientTimestamp)*f)
    .attr('y', (d,i) => 0)
    .attr('height', chartHeight)
    .style('fill', (d,i) => (df[i+1].ClientTimestamp-d.ClientTimestamp) > 10*60*1000 ? 'red' : 'steelblue')
    .style('stroke', (d,i) => (df[i+1].ClientTimestamp-d.ClientTimestamp) > 10*60*1000 ? 'red' : 'steelblue')
    // .on('mouseover', function (d, i) {
    //   d3.select(this).style("stroke", "red");
    //   let idx = chart.atEvent(d, slider.value);
    //   markText(idx, idx+1);
    // })
    // .on('mouseout', function (d, i) {
    //   d3.select(this).style("stroke", "steelblue");
    // })
  ;
}

// Chart.prototype.updatePlaybar = function(value) {
//   const chartWidth = document.getElementById('chart').clientWidth;
//   const chartHeight = document.getElementById('chart').clientHeight;
//   const f = chartHeight/(this.end == 0?1:this.end);
//   // this.playbar = [slider.value-100];
//   this.playbar = [value];

//   let existing = d3.select('#playbarg').selectAll('rect')
//       .data(this.playbar);
//   let enter = existing.enter();
//   enter = enter
//     .append('rect');
//   existing.merge(enter)
//     .attr('id', 'playbar')
//     .attr('x', 0)
//     .attr('width', chartWidth)
//     .attr('y', d => (this.end-d)*f)
//     .attr('height', 0.5)
//     .style('stroke', '#EDBB99')
//   ;
// }

// // Get the index of a change at event i
// Chart.prototype.atEvent = function(change, i) {
//   if (!change.isin(i)) return -1;
//   let c = this.head;
//   let j = 0;
//   while (c != null) {
//     if (c == change) {
//       return j;
//     }
//     if (c.isin(i)) {
//       j++;
//     }
//     c = c.next;
//   }
//   throw 'Unexpected';
// }

// Chart.prototype.getStatistics = function() {
//   // // Statistics
//   // let c = this.head;
//   // let total = 0;
//   // let deleted = 0;
//   // while (c != null) {
//   //   total++;
//   //   if (c.end > -1) deleted++;
//   //   c = c.next;
//   // }
//   // console.log(`${deleted}/${total}`);
// }

// Chart.prototype.printAll = function() {
//   let c = this.head;
//   let temp = '';
//   while (c != null) {
//     temp += c.s;
//     c = c.next;
//   }
//   console.log(temp);
// }

// Chart.prototype.printFinal = function() {
//   let temp = '';
//   for (let i = 0; i < this.arr.length; ++i) {
//     temp += this.arr[i].s;
//   }
//   console.log(temp);
// }
