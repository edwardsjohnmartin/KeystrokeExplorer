import { Data } from '../../data';

import * as d3 from "d3";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';


@inject(Data)
export class Tree {
    data: Data;

    constructor(data: Data) {
        this.data = data;
    }

    attached() {
        this.buildTree();

        // somehow we lose "this" context inside the event listenter
        //   would be nice for resizing, but not important for now
        // window.addEventListener("resize", this.buildTree);
    }

    @watch("data.playback")
    buildTree() {
        const ast = this.data.precompiledAsts[this.data.playback];
        if (ast === null || ast === undefined) return;

        // console.log(ast);

        // clear old html out
        d3.select("g#tree").selectAll("*").remove();

        const size = d3.select("svg#tree").node().getBoundingClientRect();
        const treeRoot = d3.hierarchy(ast);
        const tree = d3.tree().size([(size.height), (size.width) * 0.8]);
        tree(treeRoot);

        // Add nodes and links to the tree. 
        const nodes = treeRoot.descendants();
        const links = treeRoot.links()

        // Shift tree a little to the right so it doesn't clip the text
        d3.select("g#tree")
            .attr("transform", "translate(75, 0)")
            ;

        d3.select("g#tree")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("g")
            .attr("transform", d => `translate(${d.y}, ${d.x})`)
            .append("text")
            .text(d => d.data.name)
            .attr("class", "text")
            .attr("text-anchor", d => d.children === undefined ? "start" : "end")
            .attr("dx", d => d.children === undefined ? 10 : -10)
            .attr("dy", d => d.children === undefined ? 5 : -10)
            ;

        d3.select("g#tree")
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x))
            ;

        d3.select("g#tree")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("g")
            .attr("transform", d => `translate(${d.y}, ${d.x})`)
            .append("circle")
            .attr("r", 3)
            .attr("fill", "#364e74")
            ;
    }
}