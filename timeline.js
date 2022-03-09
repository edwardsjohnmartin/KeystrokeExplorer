const GREEN_SEQUENTIAL_CM = ["#f7fcf5","#f6fcf4","#f6fcf4","#f5fbf3","#f5fbf2","#f4fbf2","#f4fbf1","#f3faf0","#f2faf0","#f2faef","#f1faee","#f1faee","#f0f9ed","#f0f9ec","#eff9ec","#eef9eb","#eef8ea","#edf8ea","#ecf8e9","#ecf8e8","#ebf7e7","#ebf7e7","#eaf7e6","#e9f7e5","#e9f6e4","#e8f6e4","#e7f6e3","#e7f6e2","#e6f5e1","#e5f5e1","#e4f5e0","#e4f4df","#e3f4de","#e2f4dd","#e1f4dc","#e1f3dc","#e0f3db","#dff3da","#def2d9","#ddf2d8","#ddf2d7","#dcf1d6","#dbf1d5","#daf1d4","#d9f0d3","#d8f0d2","#d7efd1","#d6efd0","#d5efcf","#d4eece","#d4eece","#d3eecd","#d2edcb","#d1edca","#d0ecc9","#cfecc8","#ceecc7","#cdebc6","#ccebc5","#cbeac4","#caeac3","#c9eac2","#c8e9c1","#c6e9c0","#c5e8bf","#c4e8be","#c3e7bd","#c2e7bc","#c1e6bb","#c0e6b9","#bfe6b8","#bee5b7","#bde5b6","#bbe4b5","#bae4b4","#b9e3b3","#b8e3b2","#b7e2b0","#b6e2af","#b5e1ae","#b3e1ad","#b2e0ac","#b1e0ab","#b0dfaa","#aedfa8","#addea7","#acdea6","#abdda5","#aadca4","#a8dca3","#a7dba2","#a6dba0","#a5da9f","#a3da9e","#a2d99d","#a1d99c","#9fd89b","#9ed799","#9dd798","#9bd697","#9ad696","#99d595","#97d494","#96d492","#95d391","#93d390","#92d28f","#91d18e","#8fd18d","#8ed08c","#8ccf8a","#8bcf89","#8ace88","#88cd87","#87cd86","#85cc85","#84cb84","#82cb83","#81ca82","#80c981","#7ec980","#7dc87f","#7bc77e","#7ac77c","#78c67b","#77c57a","#75c479","#74c478","#72c378","#71c277","#6fc276","#6ec175","#6cc074","#6bbf73","#69bf72","#68be71","#66bd70","#65bc6f","#63bc6e","#62bb6e","#60ba6d","#5eb96c","#5db86b","#5bb86a","#5ab769","#58b668","#57b568","#56b467","#54b466","#53b365","#51b264","#50b164","#4eb063","#4daf62","#4caf61","#4aae61","#49ad60","#48ac5f","#46ab5e","#45aa5d","#44a95d","#42a85c","#41a75b","#40a75a","#3fa65a","#3ea559","#3ca458","#3ba357","#3aa257","#39a156","#38a055","#379f54","#369e54","#359d53","#349c52","#339b51","#329a50","#319950","#30984f","#2f974e","#2e964d","#2d954d","#2b944c","#2a934b","#29924a","#28914a","#279049","#268f48","#258f47","#248e47","#238d46","#228c45","#218b44","#208a43","#1f8943","#1e8842","#1d8741","#1c8640","#1b8540","#1a843f","#19833e","#18823d","#17813d","#16803c","#157f3b","#147e3a","#137d3a","#127c39","#117b38","#107a37","#107937","#0f7836","#0e7735","#0d7634","#0c7534","#0b7433","#0b7332","#0a7232","#097131","#087030","#086f2f","#076e2f","#066c2e","#066b2d","#056a2d","#05692c","#04682b","#04672b","#04662a","#03642a","#036329","#026228","#026128","#026027","#025e27","#015d26","#015c25","#015b25","#015a24","#015824","#015723","#005623","#005522","#005321","#005221","#005120","#005020","#004e1f","#004d1f","#004c1e","#004a1e","#00491d","#00481d","#00471c","#00451c","#00441b"];


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
    this.df = [];
    return;
  }

  const chartWidth = document.getElementById('timelinesvg').clientWidth;
  const chartHeight = document.getElementById('timelinesvg').clientHeight;
  const f = chartWidth/(this.end-this.start);

  const BREAK_TIME_MINUTES = 15;
  const BREAK_TIME = 1000*60*BREAK_TIME_MINUTES;
  const BREAK_PIXELS = 20;

  df[0].elapsed = -1;
  for (let i = 1; i < df.length; ++i) {
    df[i].elapsed = df[i].ClientTimestamp-df[i-1].ClientTimestamp
  }
  const numBreaks = df.filter(e => e.elapsed >= BREAK_TIME).length;
  const totalBreakPixels = numBreaks * BREAK_PIXELS;
  const totalWorkingPixels = chartWidth - totalBreakPixels;
  const totalWorkingTime = df.filter(e => e.elapsed < BREAK_TIME)
        .reduce((prev, curE) => prev + curE.elapsed, 0);
  let getWorkingPixels = function(elapsed) {
    return (elapsed / totalWorkingTime) * totalWorkingPixels;
  };

  let x = 0;
  for (let i = 0; i < df.length-1; ++i) {
    df[i].timelinex = x;
    let w = getWorkingPixels(df[i+1].elapsed);
    if (df[i+1].elapsed >= BREAK_TIME) {
      w = BREAK_PIXELS;
    }
    df[i].timelineWidth = w;
    x += w;
  }

  this.df = df;

  let chart = this;

  let cm = GREEN_SEQUENTIAL_CM;
  let blockColor = function(i) {
    // if ((df[i+1].NewTimestamp-df[i].NewTimestamp) >= BREAK_TIME) {
    if (df[i+1].elapsed >= BREAK_TIME) {
      return 'white';
    }
    // Normalized size
    let nsize = 1 - df[i+1].elapsed/BREAK_TIME;
    let k = Math.floor(nsize * cm.length);
    return cm[k];
  }
  
  d3.select('#timelinechartgroup')
    .attr("transform", `translate(0 ${chartHeight}) scale(1 -1)`);

  let update = d3.select('#timeline').selectAll('rect').data(df.slice(0,-1));
  let enter = update.enter().append('rect');
  update.merge(enter)
    .attr('x', (d,i) => d.timelinex)
    .attr('width', (d,i) => d.timelineWidth)
    .attr('y', (d,i) => 0)
    .attr('height', chartHeight)
    .style('fill', (d,i) => blockColor(i))
    .style('stroke', (d,i) => blockColor(i))
  ;
  update.exit().remove();
}

Timeline.prototype.updatePlaybar = function(value) {
  if (this.df.length == 0) return;
  value = +value;
  // console.log(this.df.length, value);

  const chartWidth = document.getElementById('timelinesvg').clientWidth;
  const chartHeight = document.getElementById('timelinesvg').clientHeight;
  const f = chartHeight/(this.end == 0?1:this.end);
  // this.playbar = [value];
  this.playbar = [this.df[value].timelinex];

  let update = d3.select('#timelineplaybarg').selectAll('rect')
      .data(this.playbar);
  let enter = update.enter();
  enter = enter
    .append('rect');
  update.merge(enter)
    .attr('id', 'timelineplaybar')
    .attr('x', d => d)
    .attr('width', 2.5)
    .attr('y', 0)
    .attr('height', chartHeight)
    .style('stroke', '#EDBB99')
    .style('fill', '#EDBB99')
  ;
  update.exit().remove();
}

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
