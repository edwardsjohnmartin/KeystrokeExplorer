// data
// default
var dataset = [[90, 20], [20, 100], [66, 44], [53, 80], [24, 182], [80, 72], [10, 76], [33, 150], [100, 15], [30, 12], [100, 76], [3, 10], [50, 1]];
// data from ast_metrics
var allText;
var astdata;
var dataForAssign = [];
// 0=6,1=7,2=8,3=9,4=11,5=12,6=13
/*var skews = [[0.7755102040816326, 1.1658291457286432, 0, 0.9722222222222222, 1.0311526479750779, 0.9240506329113924, 0.9724770642201835, 0, 0.8850574712643678, 0.8625592417061612, 0, 0, 0, 0.90625, 0.7369791666666666, 0.8231046931407943, 1.2757475083056478, 0.8487394957983193, 0, 0.975, 1.143646408839779, 0, 0, 1.0101010101010102, 0.7386363636363636, 0.9890710382513661, 0.9641025641025641, 0.8947368421052632, 0, 1.1047619047619048, 0, 0, 0.8587570621468926, 0.9518072289156626, 0.8745098039215686, 0, 0, 1.1428571428571428, 1.1058201058201058, 0, 0.6666666666666666, 0, 1.1586538461538463, 0],
    [0.7653061224489796, 0.7142857142857143, 0, 0.6609195402298851, 0, 0, 0, 0.8159203980099502, 0.8181818181818182, 1.1782178217821782, 0, 0.6894736842105263, 0.8093525179856115, 1.1371428571428572, 0.9523809523809523, 0.9333333333333333, 0, 0, 0, 0.9251700680272109, 0.5817307692307693, 0, 0.6806083650190115, 1.256544502617801, 0, 0.8673469387755102, 0.9722222222222222, 0.8205128205128205, 0, 0.738831615120275, 0.7233009708737864, 0.711764705882353, 0, 0, 0.8830409356725146, 0, 0.8913043478260869, 0, 0.7853403141361257, 0, 0, 0, 1.1910828025477707, 0.7870370370370371],
    [1.1772575250836121, 1.1902912621359223, 0, 0, 0, 0, 0.9510603588907015, 0, 0.8654781199351702, 0, 0.8478915662650602, 0, 0.7949526813880127, 0.8066561014263075, 0.9777015437392796, 1.0414507772020725, 1.0983899821109124, 0, 0, 1.0480274442538593, 1.0448028673835126, 0.8736, 1.1031307550644567, 0.9904761904761905, 0, 1.1807692307692308, 0.851373182552504, 1.0016420361247949, 0, 1.0682196339434276, 1.022653721682848, 0.9312714776632303, 0.8623417721518988, 0, 0, 0, 1.303088803088803, 1.0104166666666667, 0.8467741935483871, 0, 0.8643790849673203, 0.9965034965034965, 1.07168458781362, 0.8845029239766082]];
var grades = [[99.0, 95.0, 70.0, 79.0, 73.0, null, 93.0, 90.0, 89.0, 0.0, 95.0, 33.0, -50.0, 90.0, 93.0, 100.0, 0.0, 32.0, 78.0, 66.0, 73.0, 100.0, 48.0, 95.0, 45.0, 63.0, 88.0, 90.0, null, 89.0, 70.0, 85.0, 95.0, null, 100.0, 3.0, 84.0, 95.0, 95.0, 60.0, 25.0, 100.0, 93.0, 47.0],
    [99.0, 100.0, 88.0, 87.5, 100.0, null, 86.0, 75.0, 96.0, 89.0, 100.0, 37.0, 58.5, 96.0, 100.0, 100.0, 100.0, 93.0, 89.0, 90.0, 88.0, 100.0, 99.0, 100.0, 35.0, 88.0, 100.0, 100.0, null, 100.0, 100.0, 81.0, 100.0, null, 100.0, 88.0, 8.0, 100.0, 75.0, 100.0, 0.0, 100.0, 0.0, 76.0],
    [100.0, 100.0, 45.0, 96.0, 99.0, null, 100.0, 86.0, 100.0, 95.0, 92.0, 40.0, 93.0, 98.0, 99.0, 100.0, 99.0, 97.0, 98.0, 94.0, 100.0, 100.0, 100.0, 98.0, 100.0, 96.0, 100.0, 100.0, null, 99.0, 90.0, 90.0, 98.0, null, 100.0, 0.0, 92.0, 100.0, 87.0, 94.0, 84.0, 99.5, 100.0, 78.0],
    [100.0, 85.0, 63.0, 95.0, 0.0, null, 92.0, 75.0, 94.0, 96.0, 0.0, 11.0, 96.0, 95.0, 98.0, 98.0, 87.0, 5.0, 100.0, 96.0, 86.0, 100.0, 95.0, 98.0, 0.0, 58.0, 100.0, 97.0, null, 81.5, 92.0, 98.0, 95.0, null, 100.0, 28.0, 89.0, 100.0, 91.0, 100.0, 71.0, 97.0, 100.0, 56.0],
    [0.0, 94.0, 97.0, 86.0, 100.0, null, 93.0, 96.0, 100.0, 88.0, 79.0, 21.0, 74.0, 0.0, 68.0, 91.0, 92.0, 0.0, 88.0, 97.0, 86.0, 100.0, 88.0, 92.0, 0.0, 56.0, 100.0, 91.0, null, 64.0, 96.0, 94.0, 89.0, null, 100.0, 84.0, 100.0, 86.0, 97.0, 96.0, 100.0, 95.0, 100.0, 66.0],
    [82.0, 100.0, 20.0, 99.0, 100.0, null, 76.0, 90.0, 89.0, 78.0, 86.0, 7.0, 66.0, 97.0, 21.0, 94.0, 96.0, 0.0, 93.0, 86.0, 89.0, 100.0, 74.0, 97.0, 0.0, 66.0, 100.0, 46.0, null, 21.0, 97.0, 0.0, 97.0, null, 100.0, 20.0, 100.0, 32.0, 15.0, 94.0, 26.0, 98.0, 81.0, 79.0],
    [86.0, 0.0, 88.0, 77.0, 95.0, null, 66.0, 98.0, 0.0, 51.0, 45.0, 0.0, 63.0, 56.0, 0.0, 0.0, 78.0, 0.0, 97.0, 84.0, 56.0, 56.0, 38.0, 15.0, 0.0, 0.0, 0.0, 0.0, null, 10.0, 95.0, 44.0, 75.0, null, 0.0, 58.0, 94.0, 40.0, 0.0, 18.0, 9.0, 18.0, 0.0, 50.0]];
*/
readTextFile('ast_metrics.csv');
var xmax = 100
    ymax = 200;
var xAxis = document.getElementById('x-axis').options[document.getElementById('x-axis').selectedIndex].value;
var yAxis = document.getElementById('y-axis').options[document.getElementById('y-axis').selectedIndex].value;
var xtext;
var ytext;
var xIndex;
var yIndex;
var dots;
//var data = parseASTCSV(allText);
//alert(data);
// var data = []
// alert(data)
//$.ajax({
//    url: 'ast_metrics.csv',
//    dataType: 'text',
//}).done(parseCSV);
/*
d3.csv('ast_metrics.csv', function(data){
    //astdata = data;
    //console.log(astdata)
    console.log(data);
    //console.log(astdata.Assignment);
    //updateScatter();
    //console.log(astdata);
});*/

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
                //alert(allText);
                return allText;
            }
        }
    }
    rawFile.send(null);
}
/*
function parseASTCSV(text){
    //console.log(String(text));
    var rows = text.split(/\r?\n/);
    //console.log('split');
    var data_rows = rows.slice(1);
    var final_data = [];
    for (let i = 0; i < data_rows.length; i++){
        var r = data_rows[i];
        var r_split = r.split("\"", 2);
        var d = r_split[0].split(",");
        if (data_rows[1] == null){
            d.push([]);
        }
        else {
            d.push(data_rows[1]);
        }
        final_data[i] = d
    }
    return final_data;
}
*/

function parseACSV(text){
    //console.log(String(text));
    var rows = text.split(/\r?\n/);
    //console.log('split');
    var data_rows = rows.slice(1);
    var final_data = [];
    for (let i = 0; i < data_rows.length; i++){
        var obj = {};
        var r = data_rows[i];
        var r_split = r.split("\"", 2);
        var d = r_split[0].split(",");
        obj["student"] = d[0];
        obj["assign"] = d[1];
        obj["grade"] = parseFloat(d[2]);
        obj["height"] = parseInt(d[3]);
        obj["skew"] = parseFloat(d[4]);
        //console.log(obj);
        if (r_split[1] == null){
            obj["depths"] = [];
        }
        else {
            obj["depths"] = r_split[1];
        }
        //console.log(obj["depths"]);
        //console.log(obj["depths"].length);
        obj["numOfNodes"] = obj["depths"].length;
        final_data[i] = obj;
    }
    return final_data;
}


/*
function linearRegression(y,x){
        var lr = {};
        var n = y.length;
        var sum_x = 0;
        var sum_y = 0;
        var sum_xy = 0;
        var sum_xx = 0;
        var sum_yy = 0;

        for (var i = 0; i < y.length; i++) {

            sum_x += x[i];
            sum_y += y[i];
            sum_xy += (x[i]*y[i]);
            sum_xx += (x[i]*x[i]);
            sum_yy += (y[i]*y[i]);
        }

        lr['slope'] = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
        lr['intercept'] = (sum_y - lr.slope * sum_x)/n;
        lr['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);

        return lr;
}

// help with linear regression https://stackoverflow.com/questions/6195335/linear-regression-in-javascript
function getRegressionPoints(data){
    var X;
    var Y;
    for (let i = 0; i < data.length; i++){
        X.push(parseFloat(data[i][0]));
        Y.push(parseFloat(data[i][1]));
    }
    var lr = linearRegression(Y, X);
    var regressionPoints = {
        const firstX = data[0].x;
        const lastX = data.slice(-1)[0].x;
        const xCoordinates = [firstX, lastX];


        return xCoordinates.map(d => ({
            x: d,                         // We pick x and y arbitrarily, just make sure they match d3.line accessors
            y: linearRegressionLine(d)
        }));
    }
}*/

function onMouseOver(){
    //dots.attr("r", 3)
    //    .style("fill", "pink");
    console.log("woooooo");
}

function onMouseOut(){
    dots.attr("r", 3)
        .style("fill", "pink");
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

    d3.select('#Charts').on("mouseover", function(event, d){
        console.log('scatters');
    });

    // set scales
    var xScale = d3.scaleLinear().domain([0, xmax]).range([0, width]),
        yScale = d3.scaleLinear().domain([0, ymax]).range([height, 0]);

    var g = svg.append("g")
        .attr("transform", "translate(" + 50 + "," + 50 + ")");

    // get dropdown menu values
    var subjectsWidget = document.getElementById('subjects');
    var assignmentsWidget = document.getElementById('assignments');

    svg.append('text')
        .attr('x', width / 2 + 50)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Helvetica')
        .style('font-size', 20)
        .text('Scatter Plot');

    // X label
    svg.append('text')
        .property('id', 'xtext')
        .attr('x', width / 2 + 50)
        .attr('y', height - 15 + 100)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Helvetica')
        .style('font-size', 12)
        .text(xAxis);

    // Y label
    svg.append('text')
        .property('id', 'ytext')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(20,' + height + ')rotate(-90)')
        .style('font-family', 'Helvetica')
        .style('font-size', 12)
        .text(yAxis);

    xtext = d3.select("#xtext");
    ytext = d3.select("#ytext");

    // add axis
    var x_Ax = g.append("g")
        .property('id', 'xscale')
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale));

    var y_Ax = g.append("g")
        .property('id', 'yscale')
        .call(d3.axisLeft(yScale));

    //draw_dots(svg);
    /*
    var div = d3.select("body").append("div")
     .attr("class", "tooltip")
     .style("opacity", 0);*/

    svg.selectAll(".dot")
        .data(dataset)
        .enter().append("circle")
        .attr("cx", function (d) {
            return xScale(d[0]);
        })
        .attr("cy", function (d) {
            return yScale(d[1]);
        })
        .attr("r", 3)
        .attr("class", "dot")
        .attr("transform", "translate(" + 50 + "," + 50 + ")")
        .style("fill", "#CC0000")
        .on('mouseover', function (d, i) {
            d3.select(this).transition()
                .duration('100')
                .attr("r", 7);
        })
        .on('mouseout', function (d, i) {
            d3.select(this).transition()
                .duration('200')
                .attr("r", 5);
        });



    /*d3.selectAll(".dot").on("mouseover", (event, d) => {
        console.log("circle");
        d3.select(this)
            .attr("r","5")
            .style("fill", "pink");
    });

    /*d3.selectAll(".dot")
        .on('mouseover', onMouseOver);*/

    //console.log("dots");
    //d3.selectAll(".dot")
     // .on("click", onMouseOver);
    /*var dotElements= document.getElementsByClassName('dot')
    console.log(dotElements);
    for (i = 0; i < dotElements.length; i++) {
        dotElements[i].addEventListener('mouseover', onMouseOver);
        dotElements[i].addEventListener('mouseout', onMouseOut);
    }*/

/*
    dots.on('mouseover', function (d,i) {
            alert("hi");
            console.log(d);
            d3.select(this).transition()
                .duration('100')
                .attr("r", 5);
            console.log(d3.event);
        })
        .on('mouseout', function (d,i) {
            console.log("out");
            d3.select(this).transition()
                .duration('200')
                .attr("r", 3);
            console.log(d3.event);
            /*div.transition()
                .duration('200')
                .style("opacity", 0);
        });*/

    //console.log("events");

    //colorChosenAssignment(svg, student, assignment, xScale, yScale);


    // draw line of best fit (regression line)
    /*
    regressionPoints = getRegressionPoints();
    line = d3.line()
         .x(d => xScale(d.x))
         .y(d => yScale(d.y))
    svg.append('path')
        .classed('regressionLine', true)
        .datum(regressionPoints)
        .attr('d', line);*/

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

function getScatterData(x, y, student, assign){
    //var cont = true;
    //var counter = 0;
    // student, assignment, grade, height, skew, depths
    var newdata = [];
    // get all arrays for the given assignment
    dataForAssign = [];
    for (let i = 0; i < astdata.length; i++){
        if (astdata[i]["assign"] == assign){
            dataForAssign.push(astdata[i]);
        }
    }
    // get x and y index values
    if (x == "height"){
        xIndex = "height";
        xmax = getMax(dataForAssign, xIndex);
    }
    else if (x == "tree depth skew"){
        xIndex = "skew";
        xmax = 1.5;
    }
    else if (x == "grades"){
        xIndex = "grade";
        xmax = 100;
    }
    else if (x == "number of nodes"){
        xIndex = "numOfNodes";
        xmax = getMax(dataForAssign, xIndex);
    }
    if (y == "height"){
        yIndex = "height";
        ymax = getMax(dataForAssign, yIndex);
    }
    else if (y == "tree depth skew"){
        yIndex = "skew";
        ymax = 1.5;
    }
    else if (y == "grades"){
        yIndex = "grade";
        ymax = 100;
    }
    else if (y == "number of nodes"){
        yIndex = "numOfNodes";
        ymax = getMax(dataForAssign, yIndex);
    }
    //console.log(xIndex)
    // get x y array for graphing
    // check for 0 skew values and omit
    if (xIndex == "height" | xIndex == "skew"){
        for (let j = 0; j < dataForAssign.length; j++) {
            if (dataForAssign[j][xIndex] != 0 && isNaN(dataForAssign[j][yIndex]) == false && isNaN(dataForAssign[j][xIndex]) == false) {
                newdata.push([dataForAssign[j][xIndex], dataForAssign[j][yIndex]]);
            }
        }
    }
    else if (yIndex == "height" | yIndex == "skew"){
        for (let j = 0; j < dataForAssign.length; j++) {
            if (dataForAssign[j][yIndex] != 0 && isNaN(dataForAssign[j][yIndex]) == false && isNaN(dataForAssign[j][xIndex]) == false) {
                newdata.push([dataForAssign[j][xIndex], dataForAssign[j][yIndex]]);
            }
        }
    }
    else {
        for (let j = 0; j < dataForAssign.length; j++) {
            if (isNaN(dataForAssign[j][yIndex]) == false && isNaN(dataForAssign[j][xIndex]) == false){
                newdata.push([dataForAssign[j][xIndex], dataForAssign[j][yIndex]]);
            }
        }
    }

    return newdata;

}

function colorChosenAssignment(svg, student, assignment, xScale, yScale){
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
    svg.append("g").selectAll(".dot")
        .data([point])
        .enter().append("circle")
        .attr("cx", function (d) {
            return xScale(d[0]);
        })
        .attr("cy", function (d) {
            return yScale(d[1]);
        })
        .attr("r", 4)
        .attr("transform", "translate(" + 50 + "," + 50 + ")")
        .style("fill", "yellow");

    //console.log(point);
}

function getCorrelationCoefficient(data){
    var ccParagraph = document.getElementById('correlation coefficient');
    var X = [];
    var Y = [];
    for (let i = 0; i < data.length; i++){
        X.push(parseFloat(data[i][0]));
        Y.push(parseFloat(data[i][1]));
    }
    //console.log(X);
    //console.log(Y);
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
    ccParagraph.innerText = String(corr);
}

function updateScatter(){
    // check to see if csv has been parsed
    //alert("update scatter");
    if (astdata == null){
        //console.log("data null");
        astdata = parseACSV(allText);
    }
    // update axis names
    xAxis =document.getElementById('x-axis').options[document.getElementById('x-axis').selectedIndex].value
    yAxis =document.getElementById('y-axis').options[document.getElementById('y-axis').selectedIndex].value
    // get student and assignment values
    var studentnum =subjectsWidget.value;
    var assignnum =assignmentsWidget.value;
    // get new data
    dataset.length = 0;
    dataset = getScatterData(xAxis, yAxis, studentnum, assignnum);
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
