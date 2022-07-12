


function draw_tast(){
    d3.json("jsonGraph.json", function(error,data) {
        alert("hello");
        console.log(data);
    });
    d3.select("#tastsvg")
    .graphviz()
    .renderDot('digraph {a -> b}');
}

function updateTAST(){
    draw_tast();
}
//https://andrewmellor.co.uk/blog/articles/2014/12/14/d3-networks/
//https://ipython-books.github.io/64-visualizing-a-networkx-graph-in-the-notebook-with-d3js/
//http://drewconway.com/zia/2013/3/26/visualizing-networkx-graphs-in-the-browser-using-d3

