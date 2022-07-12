// set variables
var xmax = 100;
var ymax = 100;
var allText;
var astdata;
var dataset;
readTextFile('ast_metrics.csv');

function readTextFile(file) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function (){
        if(rawFile.readyState === 4){
            if(rawFile.status === 200 || rawFile.status == 0){
                allText = rawFile.responseText;
                //alert(allText);
                return allText;
            }
        }
    }
    rawFile.send(null);
}

function parseASTCSV(text){
    var rows = text.split(/\r?\n/);
    var data_rows = rows.slice(1);
    var final_data = [];
    for (let i = 0; i < data_rows.length; i++){
        // get student assignment
        var r = data_rows[i];
        // get data and array separate
        var r_split = r.split("\"", 2);
        var d = r_split[0].split(",");
        // combine data into array
        if (r_split[1] == null){
            d.push([]);
        }
        else {
            d.push(r_split[1]);
        }
        // add assignment array to overall data array
        final_data[i] = d;
    }
    return final_data;
}

function get_depth_data(){
    if (astdata == null){
        astdata = parseASTCSV(allText);
    }
    // get dropdown menu values
    var subjectsWidget = document.getElementById('depth student select');
    var assignmentsWidget = document.getElementById('depth assign select');
    var cont = true;
    var counter = 0;
    var index;
    while (cont){
        var current = astdata[counter];
        if (current[0] == subjectsWidget.value && current[1] == assignmentsWidget.value){
            index = counter;
            //alert(current);
            cont = false;
        }
        else{
            if (counter + 1 >= astdata.length){
                cont = false;
            }
            else{
                counter += 1;
            }
        }
    }
    if (index == null){
        return [];
    }
    else {
        var student_assignment = astdata[index];
        var depths = student_assignment[student_assignment.length - 1];
        //alert(depths);
        return depths;
    }
}


function draw_depth() {
    //alert(dataset);
    //dataset = [5, 10, 15, 20];
    var svg = d3.select("#depthsvg");
    var width = svg.attr("width") - 70;
    var height = svg.attr("height") - 90;
    var barPadding = 1;
    svg.remove();
    svg = d3.select("#Depths").append("svg")
        .attr("id", "depthsvg")
        .attr("width", width +70)
		.attr("height", height +90);

    // set scales
    xmax = dataset.length;
    var domain = [];
    for (let i = 0; i <= xmax; i++){
        domain[i] = i;
    }
    //alert(xmax);
    ymax = 12;
    var xScale = d3.scaleBand().range([0, width]),
        yScale = d3.scaleLinear().range([height, 0]);
    //var xScale = d3.scaleLinear().domain([0, xmax]).range([0, width]),
    //    yScale = d3.scaleLinear().domain([0, ymax]).range([height, 0]);
    xScale.domain(domain);
    yScale.domain([0,ymax]);
    var g = svg.append("g")
        .attr("transform", "translate(" + 50 + "," + 50 + ")");

    svg.append('text')
        .attr('x', width / 2 + 50)
        .attr('y', 40)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Helvetica')
        .style('font-size', 20)
        .text('Depth Chart');

    // X label
    svg.append('text')
        .property('id', 'xtext')
        .attr('x', width / 2 + 50)
        .attr('y', height - 15 + 100)
        .attr('text-anchor', 'middle')
        .style('font-family', 'Helvetica')
        .style('font-size', 12)
        .text("Node Depth in Order of Creation");

    // Y label
    svg.append('text')
        .property('id', 'ytext')
        .attr('text-anchor', 'middle')
        .attr('transform', 'translate(20,' + height + ')rotate(-90)')
        .style('font-family', 'Helvetica')
        .style('font-size', 12)
        .text("Depth Value");

    var x_Ax = g.append("g")
        .property('id', 'xscale')
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(xScale).tickFormat(function(d){
             return "";}));

    var y_Ax = g.append("g")
        .property('id', 'yscale')
        .call(d3.axisLeft(yScale));
    //g.selectAll(".bar")
    // help found at:
    //https://sahansera.dev/d3-creating-bar-chart-ground-up/
    g.selectAll("rect")
         .data(dataset)
         .enter().append("rect")
         .attr("class", "bar")
         .attr("x", function(d, i) {return xScale(i);})
         .attr("y", function(d, i) {return yScale(d);})
         .attr("width", xScale.bandwidth())
         .attr("height", function(d,i) {return height - yScale(d);})
         .on("mouseover", handleMouseOver)
         .on("mouseout", handleMouseOut)
         .attr('fill', 'lightblue')
         //.attr("height", function(d) { return height - yScale(d); });

}

//dataset = get_depth_data();
//draw_depth();

function updateDepth(){
    //alert("update depths");
    console.log("updating")
    dataset = get_depth_data();
    draw_depth();
    if (dataset == null){
        alert("Sorry, the data for this student assignment is unavailable.");
    }
}

function handleMouseOver(d, i) {
    // Use D3 to select element, change color and size
    // Get current event info
    console.log(d3.event);
    // Get x & y co-ordinates
    console.log(d3.mouse(this));
    
    d3.select(this).attr({
        fill: "orange"
    });
}

function handleMouseOut(d, i) {
    // Use D3 to select element, change color back to normal
    d3.select(this).attr({
        fill: "lightblue"
    });
}

//dataset = get_data();
