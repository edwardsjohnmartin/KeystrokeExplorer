let lastAstNodeCount = 0

function calcNumAstNodesHelper(jsonObj){
    if(!jsonObj) {
        return 0
    }
    sum = 1
    jsonObj['children'].forEach(child => {
        sum += calcNumAstNodesHelper(child)
    })
    return sum
}

function calcNumAstNodes(code) {
    const errorLineNum = compile(code);
    if(errorLineNum == null && typeof brythonListener === "function") {
        try {
            ast = get_ast(code)
        } catch {
            console.log(code)
            return lastAstNodeCount
        }
        numNodes = calcNumAstNodesHelper(ast)
        lastAstNodeCount = numNodes
        return numNodes
    } else {
        return lastAstNodeCount
        // return code.length
    }
}

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

/**
 * This class builds a chart of the number of nodes in the abstract syntax tree over a
 * sequence of events.
 */
class AstNodeCountChart {
    constructor() {
        this.astNodeCounts = []
        this.codeStateTracker = new CodeStateTracker()
    }

    /**
     * Apply one additional event to the saved code state and calculate how many ast
     * nodes there are after the event is applied
     * 
     * @param {object} row one event from the file
     * @param {number} i the index of the row event
     */
    newRow(row, i) {
        this.codeStateTracker.updateCode(row, i)
        this.astNodeCounts[i] = calcNumAstNodes(this.codeStateTracker.currentCodeState)
    }

    /**
     * Create a visualization of how many nodes are in the abstract syntax tree over time
     * @param {Array of objects} df An array of all event objects for this file
     */
    create(df, attemptsCounter = 0) {

        // Since brython is required to build the AST, we have to wait for it to be loaded
        // before creating this visualization. There are probably better ways to do this.
        if(typeof brythonListener !== "function") {
            console.log('Waiting for the brython listener to be defined')
            window.setTimeout(() => this.create(df, attemptsCounter++), 100 * attemptsCounter);
        } else {
            df.forEach((row, i) => {
                this.newRow(row, i)
            });

            const formatted = this.astNodeCounts.map((e, i) => {
                return {
                    x: i,
                    y: e
                }
            })

            displayAstNodeCountChart(formatted)
        }
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


    const allYs = data.map(d => d.y)
    const maxY = Math.max(allYs)
    console.log('maxY: ', maxY)

    const svg = d3.select("#ast_node_count_chart")
        .append("svg")
        .attr("width", chartWidth + margin.left + margin.right)
        .attr("height", chartHeight + margin.top + margin.bottom)

    const xScale = d3.scaleLinear().domain([0, data.length]).range([0, chartWidth]);
    const yScale = d3.scaleLinear().domain([0, 200]).range([chartHeight, 0]);

    const line = d3.line()
        .x(function(d) { return xScale(d.x); }) 
        .y(function(d) { return yScale(d.y); }) 
        .curve(d3.curveMonotoneX)
        
    svg.append("path")
        .datum(data) 
        .attr("class", "line") 
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", "#03fc77")
        .style("stroke-width", "2");

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

