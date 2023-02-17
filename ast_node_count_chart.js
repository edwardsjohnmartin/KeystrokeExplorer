let lastAstNodeCount = 0

/**
 * Recursively calculate how many nodes are in the abstract syntax tree
 * @param {object} astNode A node in the abstract syntax tree.
 * @returns Number of nodes under this particular node.
 */
function calcNumAstNodesHelper(astNode){
  if(!astNode || astNode === undefined) {
    return 0
  }
  sum = 1
  astNode.children.forEach(child => {
    sum += calcNumAstNodesHelper(child)
  });
  return sum
}

/**
 * Calculate how many abstract syntax tree nodes there are for a piece of code.
 * If the code does not compile, will return the same value as the previous run.
 * 
 * @param {string} code the block of code to consider
 * @returns the number of abstract syntax tree nodes in the given code
 */
function calcNumAstNodes(code) {
    // const errorLineNum = compile(code);
    // if(errorLineNum == null) {
        try {
            ast = get_ast(code)
        } catch {
            // TODO figure out why some code chunks throw an error even though the code compiles
            // console.log(code)
            return lastAstNodeCount
        }
        numNodes = calcNumAstNodesHelper(ast)
        lastAstNodeCount = numNodes
        return numNodes
    // } else {
    //     return lastAstNodeCount
    // }
}


/**
 * This class builds a chart of the number of nodes in the abstract syntax tree over a
 * sequence of events.
 */
class AstNodeCountChart {
  constructor() {
    this.astNodeCounts = [];
  }

    create(asts) {
      asts.forEach((ast,i) => {
        if (ast) {
          this.astNodeCounts[i] = calcNumAstNodesHelper(ast);
        } else {
          this.astNodeCounts[i] = -1;
        }
      });

      const formatted = this.astNodeCounts.map((e, i) => {
        return {
          x: i,
          y: e,
          nexty: i+1 < this.astNodeCounts.length ? this.astNodeCounts[i+1] : -1,
        }
      })

      displayAstNodeCountChart(formatted)
    }
}

/**
 * Display the actual visualization
 * @param {array of objects} data An array of points to display in the chart. Each 
 *   element of the data should have an x and a y.
 */
function displayAstNodeCountChart(data) {
  const margin = {top: 10, right: 30, bottom: 50, left: 60}
  const chartHeight = 400;
  const chartWidth = 400;

  const svg = d3.select("#ast_node_count_chart")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)

  const xScale = d3.scaleLinear().domain([0, data.length]).range([0, chartWidth]);
  const yScale = d3.scaleLinear().domain([0, 200]).range([chartHeight, 0]);

  // const line = d3.line()
  //       .x(function(d) { return xScale(d.x); }) 
  //       .y(function(d) { return yScale(d.y); }) 
  //       .curve(d3.curveMonotoneX)
  
  // var redLines = chart.selectAll(null)
  // var redLines = svg.selectAll(null)
  var redLines = svg.selectAll('line')
      .data(data)
      .enter()
      .append("line")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
      .attr("x1", (d) => xScale(d.x))
      .attr("x2", (d) => xScale(d.x+1))
      .attr("y1", (d) => yScale(d.y))
      .attr("y2", (d) => yScale(d.nexty))
      .attr("visibility", (d) => d.y>-1 && d.nexty>-1 ? "visible" : "hidden")
      .style("stroke", "red")
      // .style("stroke", "#03fc77")
  ;

  // // line
  // svg.append("path")
  //   .datum(data) 
  //   .attr("class", "line") 
  //   .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
  //   .attr("d", line)
  //   // .attr("visibility", (d) => {"hidden"})//d.y>-1 ? "visible" : "hidden"})
  //   .style("fill", "none")
  //   .style("stroke", "#03fc77")
  //   .style("stroke-width", "2");

  // bottom axis and ticks
  svg.append("g")
    .attr("transform", `translate(${margin.left}, ${chartHeight + margin.top})`)
    .call(d3.axisBottom(xScale));
  
  // left axis and ticks
  svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    .call(d3.axisLeft(yScale));

  // Chart Title
  svg.append('text')
    .attr('x', chartWidth/2 + margin.left)
    .attr('y', 20)
    .attr('text-anchor', 'middle')
    .style('font-family', 'Helvetica')
    .style('font-size', 16)
    .text('Number of nodes in Abstract Syntax Tree');
  
  // X label
  svg.append('text')
    .attr('x', chartWidth/2 + margin.left)
    .attr('y', chartHeight + margin.top + margin.bottom - 12)
    .attr('text-anchor', 'middle')
    .style('font-family', 'Helvetica')
    .style('font-size', 12)
    .text('Event Index');
  
  // Y label
  svg.append('text')
    .attr('text-anchor', 'middle')
    .attr('transform', 'translate(15,' + chartHeight / 2 + ')rotate(-90)')
    .style('font-family', 'Helvetica')
    .style('font-size', 12)
    .text('Node Count');
}

