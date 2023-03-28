// global variables
var allText;
var astdata;
var dataset = [];
var dataForAssign = [];
//readTextFile('ast_metrics_with_heights.csv');
//readTextFile('TASTMetricsCalc2_3.csv')
//readTextFile('TASTMetricsCalc2_10.csv')
//readTextFile('astMetricsCalc3_17.csv');
//readTextFile('astMetricsAssign10_2_27.csv')
readTextFile('astMetricsKeystrokes3_17.csv');
//readTextFile('ast_metrics_with_monotonicity2.csv');
var xmax = 100;
var ymax = 200;
var xmin = 0;
var ymin = 0;
var colormin;
var colormax;
var colorindex;
var xAxis = document.getElementById('x-axis').options[document.getElementById('x-axis').selectedIndex].value;
var yAxis = document.getElementById('y-axis').options[document.getElementById('y-axis').selectedIndex].value;
var xAxisText = document.getElementById('x-axis').options[document.getElementById('x-axis').selectedIndex].html;
var yAxisText = document.getElementById('y-axis').options[document.getElementById('y-axis').selectedIndex].html;
var colorScaleMetric = document.getElementById('color-scale').options[document.getElementById('color-scale').selectedIndex].value;
var xtext;
var ytext;
var xIndex;
var yIndex;
var prevColor;
var m;
var b;
var tooltip = d3.select("#Scatters").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

function readTextFile(file) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function (){
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
                allText = rawFile.responseText;
                $.ajax({
                    async:true,
                    url: file,
                    dataType: 'csv',
                    success: function(data) {
                        updateScatter();
                    }
                });
                // console.log(allText);
                return allText;
            }
        }
    }
    rawFile.send(null);
}

function parseACSV(text){
    //console.log(String(text));
    var rows = text.split(/\r?\n/);
    //console.log('split');
    var data_rows = rows.slice(1);
    //console.log(data_rows)
    var final_data = [];
    for (let i = 0; i < data_rows.length; i++){
        var obj = {};
        var r = data_rows[i];
        //console.log(r);
        //console.log(r);
        var r_split = r.split("\"", 4);
        //console.log(r_split.length)
        //console.log(r_split[2]
        if (r_split.length == 1){
            var d = r_split[0].split(",")
            obj["student"] = d[0];
            obj["assign"] = d[1];
            obj["filename"] = d[2];
            obj["filegroup"] = d[3];
            obj["grade"] = parseFloat(d[4]);
            obj["keystrokes"] = parseInt(d[5]);
            obj["comments"] = parseInt(d[6]);
            obj["compilable_states"] = parseFloat(d[7]);
            obj["mono_compilable_states"] = parseFloat(d[8])
            obj["height"] =parseInt(d[9]);
            obj["monotonicity"] = parseFloat(d[10]);
            obj["depth_atm"] = parseFloat(d[11]);
            obj["depth_skew"] = parseFloat(d[12]);
            obj["height_atm"] = parseFloat(d[14]);
            obj["height_skew"] = parseFloat(d[15]);
        }
        else{
            var d = r_split[0].split(",");
            var d_2 = r_split[2].split(",");
            //console.log(d_2);
            obj["student"] = d[0];
            obj["assign"] = d[1];
            obj["filename"] = d[2];
            obj["filegroup"] = d[3];
            obj["grade"] = parseFloat(d[4]);
            obj["keystrokes"] = parseInt(d[5]);
            obj["comments"] = parseInt(d[6]);
            obj["compilable_states"] = parseFloat(d[7]);
            obj["mono_compilable_states"] = parseFloat(d[8])
            obj["height"] =parseInt(d[9]);
            obj["monotonicity"] = parseFloat(d[10]);
            obj["depth_atm"] = parseFloat(d[11]);
            obj["depth_skew"] = parseFloat(d[12]);
            obj["height_atm"] = parseFloat(d_2[1]);
            obj["height_skew"] = parseFloat(d_2[2]);
        }
        //console.log(d)
        //console.log(d[5])
        //console.log(obj);
        if (r_split[1] == null){
            obj["depths"] = [];
            obj["heights"] = [];
        }
        else {
            obj["depths"] = r_split[1];
            obj["heights"] = r_split[3];
        }
        //console.log(obj["depths"]);
        //console.log(obj["depths"].length);
        obj["numOfNodes"] = obj["depths"].length;
        final_data[i] = obj;
    }
    return final_data;
}

// help with linear regression line https://bl.ocks.org/HarryStevens/be559bed98d662f69e68fc8a7e0ad097
function calcLinear(data, x, y, minX, maxX) {
    /////////
    //SLOPE//
    /////////

    // Let n = the number of data points
    var n = data.length;

    // Get just the points
    var pts = [];
    data.forEach(function (d, i) {
        var obj = {};
        obj.x = d[x];
        obj.y = d[y];
        obj.mult = obj.x * obj.y;
        pts.push(obj);
    });
    // Let a equal n times the summation of all x-values multiplied by their corresponding y-values
    // Let b equal the sum of all x-values times the sum of all y-values
    // Let c equal n times the sum of all squared x-values
    // Let d equal the squared sum of all x-values
    var sum = 0;
    var xSum = 0;
    var ySum = 0;
    var sumSq = 0;
    pts.forEach(function (pt) {
        sum = sum + pt.mult;
        xSum = xSum + pt.x;
        ySum = ySum + pt.y;
        sumSq = sumSq + (pt.x * pt.x);
        //sumSq = sumSq + (pt.x * pt.x);
    });
    var a = sum * n;
    b = xSum * ySum;
    var c = sumSq * n;
    var d = xSum * xSum;

    // Plug the values that you calculated for a, b, c, and d into the following equation to calculate the slope
    // slope = m = (a - b) / (c - d)
    m = (a - b) / (c - d);
    /////////////
    //INTERCEPT//
    /////////////

    // Let e equal the sum of all y-values
    var e = ySum;

    // Let f equal the slope times the sum of all x-values
    var f = m * xSum;

    // Plug the values you have calculated for e and f into the following equation for the y-intercept
    // y-intercept = b = (e - f) / n
    b = (e - f) / n;

    // Print the equation below the chart
    //document.getElementsByClassName("equation")[0].innerHTML = "y = " + m + "x + " + b;
    //document.getElementsByClassName("equation")[1].innerHTML = "x = ( y - " + b + " ) / " + m;

    // return an object of two points
    // each point is an object with an x and y coordinate
    return {
        ptA: {
            x: minX,
            y: m * minX + b
        },
        ptB: {
            y: m * maxX + b,
            x: maxX
        }
    }
}


function onMouseEnter(d){
    prevColor = d3.select(this).style("fill");
    d3.select(this)
        .transition()
        .duration('100')
        .attr("r", 5)
        .style("fill", "pink");
    tooltip.style("opacity", 1)
      .html(d["student"] +
          "<br/>" + d["assign"] +
          "<br/> Grade: " + d["grade"] +
          "<br/> Height: " + d["height"] +
          "<br/> Depth ATM: " + d["depth_atm"] +
          "<br/> Monotonicity: " + d["monotonicity"] +
          "<br/> Height ATM: " + d["height_atm"] +
          "<br/> Height Skew: " + d["height_skew"] +
          "<br/> Number of Nodes: " + d["numOfNodes"])
      .style("left", (d3.event.pageX + -220) + "px")
      .style("top", (d3.event.pageY - 35) + "px");
}

function onMouseOut(){
    d3.select(this)
        .transition()
        .duration('200')
        .attr("r", 3)
        .style("fill", prevColor);
    tooltip.transition()
      .duration(200)
      .style("opacity", 0);
}

function onClick(d){
    // get student # and assign #
    console.log("student clicked");
    var newStudent = d["student"];
    var currentAssign = assignmentsWidget.value
    var currentAssignIndex = assignmentsWidget.selectedIndex
    var currentFile = filesWidget.value
    var currentFileIndex = filesWidget.value
    // change dropdown to the new student and assign #s
    for (var option of subjectsWidget.options) {
        if (option.value == newStudent) {
            option.selected = true;
            // change the code displayed
            //assignmentChanged();
            //updateSubjectWidget();
            subjectChanged();
            //return;
        }
    }
    for (var option of assignmentsWidget.options) {
        if (option.value == currentAssign) {
            option.selected = true;
            // change the code displayed
            assignmentChanged();
        }
    }
    for (var option of filesWidget.options) {
        if (option.value == currentFile) {
            option.selected = true;
            // change the code displayed
            fileChanged();
        }
    }
}

function onRegLineHover(){
    console.log("reg line hover")
    d3.select(this)
        .transition()
        .duration('100')
        .attr("stroke","orange");
    tooltip.style("opacity", 1)
      .html("y = " + m.toFixed(2) + "x + " + b.toFixed(2)+
          "<br/>" + "x = ( y - " + b.toFixed(2) + " ) / " + m.toFixed(2))
      .style("left", (d3.event.pageX + -130) + "px")
      .style("top", (d3.event.pageY - 35) + "px");
}

function onRegLineLeave(){
    d3.select(this)
        .transition()
        .duration('200')
        .attr("stroke","steelblue");
    tooltip.transition()
      .duration(200)
      .style("opacity", 0);
}

function get_color_scale(){
    if (colorScaleMetric == "Height"){
        colorindex = "height";
        colormax = getMax(dataForAssign, colorindex) + 1;
        colormin = 0;
    }
    else if (colorScaleMetric == "Monotonicity of Compilable States"){
        colorindex = "mono_compilable_states";
        colormax = getMax(dataForAssign, colorindex) + 0.025;
        colormin = getMin(dataForAssign, colorindex) - 0.025;
    }
    else if (colorScaleMetric == "Percent of Compilable States"){
        colorindex = "compilable_states";
        colormax = 1;
        colormin = 0;
    }
    else if (colorScaleMetric == "Number of Comments"){
        colorindex = "comments";
        colormax = getMax(dataForAssign, colorindex) + 2;
        colormin = 0;
    }
    else if (colorScaleMetric == "Number of Keystrokes"){
        colorindex = "keystrokes";
        colormax = getMax(dataForAssign, colorindex) + 5;
        colormin = 0;
    }
    else if (colorScaleMetric == "Attentiveness"){
        colorindex = "monotonicity";
        colormax = getMax(dataForAssign, colorindex) + 0.025;
        colormin = getMin(dataForAssign, colorindex) - 0.025;
    }
    else if (colorScaleMetric == "Foresight"){
        colorindex = "depth_atm";
        colormax = getMax(dataForAssign, colorindex) + 0.025;
        colormin = getMin(dataForAssign, colorindex) - 0.025;
    }
    else if (colorScaleMetric == "Depth Skew"){
        colorindex = "depth_skew";
        colormax = getMax(dataForAssign, colorindex) + 0.025;
        colormin = getMin(dataForAssign, colorindex) - 0.025;
    }
    else if (colorScaleMetric == "Height ATM"){
        colorindex = "height_atm";
        colormax = getMax(dataForAssign, colorindex) + 0.025;
        colormin = getMin(dataForAssign, colorindex) - 0.025;
    }
    else if (colorScaleMetric == "Height Skew"){
        colorindex = "height_skew";
        colormax = getMax(dataForAssign, colorindex) + 0.025;
        colormin = getMin(dataForAssign, colorindex) - 0.025;
    }
    else if (colorScaleMetric == "Grades"){
        colorindex = "grade";
        colormax = 100;
        colormin = 0;
    }
    else if (colorScaleMetric == "Number of Nodes"){
        colorindex = "numOfNodes";
        colormax = getMax(dataForAssign, colorindex) + 5;
        colormin = 0;
    }
    return [colormin, colormax]
}

// https://www.visualcinnamon.com/2016/05/smooth-color-legend-d3-svg-gradient/
function create_legend(){
    colorScaleMetric = document.getElementById('color-scale').options[document.getElementById('color-scale').selectedIndex].value;
    var svg = d3.select("#scattersvg")
    //Append a defs (for definition) element to your SVG
    var defs = svg.append("defs");
    //Append a linearGradient element to the defs and give it a unique id
    var linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient");
    //Horizontal gradient
    linearGradient
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "100%")
        .attr("y2", "0%");
    var colorScaleVals = get_color_scale();
    var colorMin = colorScaleVals[0];
    var colorMax = colorScaleVals[1];
    //A color scale
    var colorScale = d3.scaleSequential().domain([colorMin,colorMax]).interpolator(d3.interpolateRdYlGn);
    var colorTotal = + Math.abs(colorMax) - Math.abs(colorMin);
    var bucket = colorTotal/5;
    var buckets = []
    for (let i = 0; i < 6; i++){
        buckets[i] = colorMin + (i*bucket);
    }
    console.log(buckets);
    console.log(colorMin);
    console.log(colorMax);
    //A color scale
    var color = d3.scaleLinear()
        .range([colorScale(colorMin), colorScale(buckets[1]), colorScale(buckets[2]),
            colorScale(buckets[3]), colorScale(buckets[4]), colorScale(colorMax)]);

    //Append multiple color stops by using D3's data/enter step
    linearGradient.selectAll("stop")
        .data( color.range() )
        .enter().append("stop")
        .attr("offset", function(d,i) { return i/(color.range().length-1); })
        .attr("stop-color", function(d) { return d; });
    //Append multiple color stops by using D3's data/enter step
    linearGradient.selectAll("stop")
        .data( colorScale.domain() )
        .enter().append("stop")
        .attr("offset", 10)
        .attr("stop-color",colorScale(colorMax));

    var legendWidth = width * 0.6,
	legendHeight = 10;

    //Color Legend container
    var legendsvg = svg.append("g")
	    .attr("class", "legendWrapper")
	    .attr("transform", "translate(" + (width/2 + 30) + "," + (height + 50) + ")");

    //Draw the Rectangle
    legendsvg.append("rect")
	    .attr("class", "legendRect")
	    .attr("x", -legendWidth/2)
	    .attr("y", 10)
	    //.attr("rx", legendHeight/2)
	    .attr("width", legendWidth)
	    .attr("height", legendHeight)
        .style("fill", "url(#linear-gradient)");

    //Append title
    legendsvg.append("text")
	    .attr("class", "legendTitle")
	    .attr("x", -2)
	    .attr("y", -2)
	    .text(colorScaleMetric);

    //Set scale for x-axis
    var leg_xScale = d3.scaleLinear()
	    .range([0, legendWidth])
	    .domain([colorMin,colorMax]);
	    //.domain([d3.min(pt.legendSOM.colorData)/100, d3.max(pt.legendSOM.colorData)/100]);

    //Define x-axis
    var leg_xAxis = d3.axisBottom(leg_xScale)
	  .ticks(5)  //Set rough # of ticks
	  //.tickFormat(formatPercent)

    //Set up X axis
    legendsvg.append("g")
	    .attr("class", "axis")  //Assign "axis" class
	    .attr("transform", "translate(" + (-legendWidth/2) + "," + (10 + legendHeight) + ")")
	    .call(leg_xAxis);

}

function draw_scatter(student, assignment) {
    //alert("draw scatter");
    var svg = d3.select("#scattersvg")
        width = svg.attr("width") - 70,
        height = svg.attr("height") - 90;

    svg.remove()
    svg = d3.select("#Scatters").append("svg")
        .attr("id", "scattersvg")
        .attr("width", width +70)
		.attr("height", height +90);

    // set scales
    var xScale = d3.scaleLinear().domain([xmin, xmax]).range([0, width]),
        yScale = d3.scaleLinear().domain([ymin, ymax]).range([height-75, 0]);

    var g = svg.append("g")
        .attr("transform", "translate(" + 50 + "," + 50 + ")");

    // get dropdown menu values
    var subjectsWidget = document.getElementById('subjects');
    var assignmentsWidget = document.getElementById('assignments');

    var title = assignment + " " + xAxisText + " vs " + yAxisText;

    svg.append('text')
        .attr('x', width / 2 + 50)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Helvetica')
        .style('font-size', 20)
        .text(title);

    // X label
    svg.append('text')
        .property('id', 'xtext')
        .attr('x', width / 2 + 50)
        .attr('y', height + 15)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Helvetica')
        .style('font-size', 16)
        .text(xAxisText);

    // Y label
    svg.append('text')
        .property('id', 'ytext')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(13,' + (height-137) + ')rotate(-90)')
        .style('font-family', 'Helvetica')
        .style('font-size', 16)
        .text(yAxisText);

    xtext = d3.select("#xtext");
    ytext = d3.select("#ytext");

    // add axis
    var x_Ax = g.append("g")
        .property('id', 'xscale')
        .style('font-size', 12)
        .attr("transform", "translate(0," + (height - 75) + ")")
        .call(d3.axisBottom(xScale));

    var y_Ax = g.append("g")
        .property('id', 'yscale')
        .style('font-size', 12)
        .call(d3.axisLeft(yScale));

    // scale for color
    // create_legend();
    // var myColor = d3.scaleSequential().domain([colormin,colormax]).interpolator(d3.interpolateRdYlGn);
    svg.selectAll(".dot")
        .data(dataset)
        .enter().append("circle")
        .attr("cx", function (d) {
            return xScale(d[xIndex]);
        })
        .attr("cy", function (d) {
            return yScale(d[yIndex]);
        })
        .attr("r", 3)
        .attr("class", "dot")
        .attr("transform", "translate(" + 50 + "," + 50 + ")")
        //.style("fill", function(d){return myColor(d[colorindex]) })
        .style("fill", "black")
        .on('mouseover', onMouseEnter)
        .on('mouseout', onMouseOut)
        .on('click', onClick);

    // recolor selected student assignment
    // var chosenPoint = getPoint(svg, student, assignment, xScale, yScale);
    // chosenPoint.attr("r", 4).style("fill", "yellow");
    // add regression line
    var lg = calcLinear(dataset, xIndex, yIndex, xmin, xmax);
    var lineGenerator = d3.line();
    var points = [[xScale(lg.ptA.x), yScale(lg.ptA.y)], [xScale(lg.ptB.x), yScale(lg.ptB.y)]]
    var pathData = lineGenerator(points);
    g.append('path')
        .attr("class", "regression")
        .attr('d', pathData)
        .on('mouseover', onRegLineHover)
        .on('mouseout', onRegLineLeave);


}

//draw_scatter();

function getMax(dataForAssign, index){
    var numbers = [];
    for (let k = 0; k < dataForAssign.length; k++){
        numbers.push(dataForAssign[k][index]);
    }
    var max = 0;
    for (let i = 0; i < numbers.length; i++){
        if (numbers[i] > max){
            max = numbers[i];
        }
    }
    return max;
}

function getMin(dataForAssign, index){
    var numbers = [];
    for (let k = 0; k < dataForAssign.length; k++){
        if (dataForAssign[k][index] != 0){
            numbers.push(dataForAssign[k][index]);
        }
    }
    var min = 1000000;
    for (let i = 0; i < numbers.length; i++){
        if (numbers[i] < min){
            min = numbers[i];
        }
    }
    return min;
}


function getScatterData(x, y, student, assign, file){
    //var cont = true;
    //var counter = 0;
    // student, assignment, grade, height, monotonicity, skew, depths
    var newdata = [];
    // get all arrays for the given assignment
    dataForAssign = [];
    for (let i = 0; i < astdata.length; i++){
        if (astdata[i]["assign"] == assign){
            if (astdata[i]["filegroup"] == file){
                dataForAssign.push(astdata[i]);
            }
        }
    }
    // get x and y index values
    if (x == "Height"){
        xIndex = "height";
        xmax = getMax(dataForAssign, xIndex) + 1;
        xmin = 0;
    }
    else if (x == "Monotonicity of Compilable States"){
        xIndex = "mono_compilable_states";
        xmax = getMax(dataForAssign, xIndex) + 0.025;
        xmin = getMin(dataForAssign, xIndex) - 0.025;
    }
    else if (x == "Percent of Compilable States"){
        xIndex = "compilable_states";
        xmax = 1;
        xmin = 0;
    }
    else if (x == "Number of Comments"){
        xIndex = "comments";
        xmax = getMax(dataForAssign, xIndex) + 2;
        xmin = 0;
    }
    else if (x == "Number of Keystrokes"){
        xIndex = "keystrokes";
        xmax = getMax(dataForAssign, xIndex) + 5;
        xmin = 0;
    }
    else if (x == "Attentiveness"){
        xIndex = "monotonicity";
        xmax = getMax(dataForAssign, xIndex) + 0.025;
        xmin = getMin(dataForAssign, xIndex) - 0.025;
    }
    else if (x == "Foresight"){
        xIndex = "depth_atm";
        xmax = getMax(dataForAssign, xIndex) + 0.025;
        xmin = getMin(dataForAssign, xIndex) - 0.025;
    }
    else if (x == "Depth Skew"){
        xIndex = "depth_skew";
        xmax = getMax(dataForAssign, xIndex) + 0.025;
        xmin = getMin(dataForAssign, xIndex) - 0.025;
    }
    else if (x == "Height ATM"){
        xIndex = "height_atm";
        xmax = getMax(dataForAssign, xIndex) + 0.025;
        xmin = getMin(dataForAssign, xIndex) - 0.025;
    }
    else if (x == "Height Skew"){
        xIndex = "height_skew";
        xmax = getMax(dataForAssign, xIndex) + 0.025;
        xmin = getMin(dataForAssign, xIndex) - 0.025;
    }
    else if (x == "Grades"){
        xIndex = "grade";
        xmax = 100;
        xmin = 0;
    }
    else if (x == "Number of Nodes"){
        xIndex = "numOfNodes";
        xmax = getMax(dataForAssign, xIndex) + 5;
        xmin = 0;
    }
    if (y == "Height"){
        yIndex = "height";
        ymax = getMax(dataForAssign, yIndex) + 1;
        ymin = 0;
    }
    else if (y == "Monotonicity of Compilable States"){
        yIndex = "mono_compilable_states";
        ymax = getMax(dataForAssign, yIndex) + 0.025;
        ymin = getMin(dataForAssign, yIndex) - 0.025;
    }
    else if (y == "Percent of Compilable States"){
        yIndex = "compilable_states";
        ymax = 1;
        ymin = 0;
    }
    else if (y == "Number of Comments"){
        yIndex = "comments";
        ymax = getMax(dataForAssign, yIndex) + 2;
        ymin = 0;
    }
    else if (y == "Number of Keystrokes"){
        yIndex = "keystrokes";
        ymax = getMax(dataForAssign, yIndex) + 5;
        ymin = 0;
    }
    else if (y == "Attentiveness"){
        yIndex = "monotonicity";
        ymax = getMax(dataForAssign, yIndex) + 0.025;
        ymin = getMin(dataForAssign, yIndex) - 0.025;
    }
    else if (y == "Foresight"){
        yIndex = "depth_atm";
        ymax = getMax(dataForAssign, yIndex) + 0.025;
        ymin = getMin(dataForAssign, yIndex) - 0.025;
    }
    else if (y == "Depth Skew"){
        yIndex = "depth_skew";
        ymax = getMax(dataForAssign, yIndex) + 0.025;
        ymin = getMin(dataForAssign, yIndex) - 0.025;
    }
    else if (y == "Height ATM"){
        yIndex = "height_atm";
        ymax = getMax(dataForAssign, yIndex) + 0.025;
        ymin = getMin(dataForAssign, yIndex) - 0.025;
    }
    else if (y == "Height Skew"){
        yIndex = "height_skew";
        ymax = getMax(dataForAssign, yIndex);
        ymin = getMin(dataForAssign, yIndex);
    }
    else if (y == "Grades"){
        yIndex = "grade";
        ymax = 100;
        ymin = 0;
    }
    else if (y == "Number of Nodes"){
        yIndex = "numOfNodes";
        ymax = getMax(dataForAssign, yIndex) + 5;
        ymin = 0;
    }
    //console.log(xIndex)
    // get x y array for graphing
    // check for 0 skew values and omit
    if (xIndex == "height" | xIndex == "depth_skew" | xIndex == "depth_atm" | xIndex == "height_skew" | xIndex == "height_atm"){
        for (let j = 0; j < dataForAssign.length; j++) {
            if (dataForAssign[j][xIndex] != 0 && isNaN(dataForAssign[j][yIndex]) == false && isNaN(dataForAssign[j][xIndex]) == false) {
                //newdata.push([dataForAssign[j][xIndex], dataForAssign[j][yIndex]]);
                newdata.push(dataForAssign[j]);
            }
        }
    }
    else if (yIndex == "height" | yIndex == "depth_skew" | yIndex == "depth_atm" | yIndex == "height_skew" | yIndex == "height_atm"){
        for (let j = 0; j < dataForAssign.length; j++) {
            if (dataForAssign[j][yIndex] != 0 && isNaN(dataForAssign[j][yIndex]) == false && isNaN(dataForAssign[j][xIndex]) == false) {
                //newdata.push([dataForAssign[j][xIndex], dataForAssign[j][yIndex]]);
                newdata.push(dataForAssign[j]);
            }
        }
    }
    else {
        for (let j = 0; j < dataForAssign.length; j++) {
            if (isNaN(dataForAssign[j][yIndex]) == false && isNaN(dataForAssign[j][xIndex]) == false){
                //newdata.push([dataForAssign[j][xIndex], dataForAssign[j][yIndex]]);
                newdata.push(dataForAssign[j]);
            }
        }
    }

    return newdata;

}

function getPoint(svg, student, assignment, xScale, yScale){
    // get location
    var point;
    var cont = true;
    var counter = 0;
    while (cont){
        if (dataForAssign[counter]["student"] == student && dataForAssign[counter]["assign"] == assignment){
            if (isNaN(dataForAssign[counter][yIndex]) == false && isNaN(dataForAssign[counter][xIndex]) == false){
                point = [dataForAssign[counter][xIndex], dataForAssign[counter][yIndex]];
                cont = false;
            }
            else{
                point = [0,0];
                cont = false;
            }
        }
        counter += 1;
        if (counter == dataForAssign.length){
            point = [0,0];
            cont = false;
        }
    }
    // draw dot
    var comparison = "circle[cx='" + xScale(point[0]) + "'][cy='" + yScale(point[1]) + "']";
    var dot = svg.select(comparison)

    return dot;
}


// regression line stuff
// https://bl.ocks.org/nanu146/de5bd30782dfe18fa5efa0d8d299abce
function getCorrelationCoefficient(data){
    var ccParagraph = document.getElementById('correlation coefficient');
    var X = [];
    var Y = [];
    for (let i = 0; i < data.length; i++){
        X.push(parseFloat(data[i][xIndex]));
        Y.push(parseFloat(data[i][yIndex]));
    }
    let sum_X = 0, sum_Y = 0, sum_XY = 0;
    let squareSum_X = 0, squareSum_Y = 0;
    let n = data.length;
    // calculation from https://www.geeksforgeeks.org/program-find-correlation-coefficient/
    for(let i = 0; i < n; i++)
    {

        // Sum of elements of array X.
        sum_X = sum_X + X[i];

        // Sum of elements of array Y.
        sum_Y = sum_Y + Y[i];

        // Sum of X[i] * Y[i].
        sum_XY = sum_XY + X[i] * Y[i];

        // Sum of square of array elements.
        squareSum_X = squareSum_X + X[i] * X[i];
        squareSum_Y = squareSum_Y + Y[i] * Y[i];
    }
    // Use formula for calculating correlation
    // coefficient.
    let corr = (n * sum_XY - sum_X * sum_Y)/
               (Math.sqrt((n * squareSum_X -
                       sum_X * sum_X) *
                          (n * squareSum_Y -
                       sum_Y * sum_Y)));
    ccParagraph.innerText = String(corr.toFixed(2));
}

function getFileGroup(assign, student, file){
    for (let i = 0; i < astdata.length; i++) {
        if (astdata[i]["assign"] == assign & astdata[i]["student"] == student & astdata[i]["filename"] == file) {
            return astdata[i]["filegroup"]
        }
    }
    return "unknown"
}

function updateScatter(){
    // check to see if csv has been parsed
    if (astdata == null){
        //console.log("data null");
        astdata = parseACSV(allText);
    }
    // update axis names
    xAxis =document.getElementById('x-axis').options[document.getElementById('x-axis').selectedIndex].value
    yAxis =document.getElementById('y-axis').options[document.getElementById('y-axis').selectedIndex].value
    // update file group
    var group = getFileGroup(assignment, subject, file);
    fileGroupDisplay.innerHTML = group;
    // get student and assignment values
    var studentnum =subjectsWidget.value;
    var assignnum =assignmentsWidget.value;
    var filename = filesWidget.value;
    // get file group
    var filegroup = getFileGroup(assignnum, studentnum, filename);
    // get new data
    dataset.length = 0;
    dataset = getScatterData(xAxis, yAxis, studentnum, assignnum, filegroup);
    //console.log(dataset);
    getCorrelationCoefficient(dataset);

    // help with updating scales and data from:
    // https://d3-graph-gallery.com/graph/scatter_buttonXlim.html
    // redraw graph with new data
    draw_scatter(studentnum, assignnum);
    xtext.text(xAxis);
    ytext.text(yAxis);
}

//updateScatter();
