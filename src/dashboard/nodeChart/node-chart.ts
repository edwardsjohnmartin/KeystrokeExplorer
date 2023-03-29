import { AstNode } from './../../ast';
import { Data } from '../../data';

import * as d3 from "d3";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';


@inject(Data)
export class NodeChart {
    data: Data;

    constructor(data: Data) {
        this.data = data;
    }

    attached() {
        this.buildNodeChart();

        // somehow we lose "this" context inside the event listenter
        //   would be nice for resizing, but not important for now
        // window.addEventListener("resize", this.buildNodeChart);
    }

    @watch("data.taskId")
    buildNodeChart() {
        const data = this.data.precompiledAsts;

        const nodeChart = d3.select("svg#node-chart");
        const size = d3.select("svg#node-chart").node().getBoundingClientRect();
        nodeChart.selectAll("*").remove();

        const margin = { top: 50, right: 15, bottom: 15, left: 45 };
        const xScale = d3
            .scaleLinear()
            .domain([0, data.length])
            .range([0, size.width - (margin.left + margin.right)])
            ;
        const yScale = d3
            .scaleLinear()
            .domain([0, d3.max(data, (node: AstNode) => node ? node.descendants : 0) + 5])
            .range([size.height - margin.top - margin.bottom, 0])
            ;

        // line-chart
        nodeChart.selectAll("line")
            .data(data)
            .enter()
            .append("line")
            .attr("transform", `translate(${margin.left}, ${margin.bottom})`)
            .attr("y1", (node: AstNode, _: number) => node ? yScale(node.descendants) : 0)
            .attr("y2", (node: AstNode, _: number) => node ? yScale(node.descendants + 1) : 0)
            .attr("x1", (_: AstNode, index: number) => xScale(index))
            .attr("x2", (_: AstNode, index: number) => xScale(index + 1))
            .attr("visibility", (node: AstNode) => node ? "visibile" : "hidden")
            .attr("class", "stroke-orange-500")
            ;

        // vertical bar
        nodeChart.selectAll("rect")
            .data([0])
            .enter()
            .append("rect")
            .attr("x", margin.left)
            .attr("y", margin.bottom)
            .attr("width", 1.5)
            .attr("height", size.height - margin.bottom - margin.top)
            .style("fill", "#f87171")
            .style("stroke", "#f87171")
            ;

        // x-axis
        nodeChart.append("g")
            .attr("transform", `translate(${margin.left}, ${size.height - margin.top})`)
            .call(d3.axisBottom(xScale))
            ;

        // y-axis
        nodeChart.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.bottom})`)
            .call(d3.axisLeft(yScale))
            ;

        // title
        nodeChart.append("text")
            .attr("x", size.width / 2 + margin.left)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("class", "text-sm")
            .text("Number of Nodes in Abstract Syntax Trees")
            ;

        // x-label
        nodeChart.append("text")
            .attr("x", size.width / 2 + margin.left)
            .attr("y", size.height - margin.bottom)
            .attr("text-anchor", "middle")
            .attr("class", "text-sm")
            .text("Event Index")
            ;

        // y-label
        nodeChart.append("text")
            .attr("transform", `translate(12, ${(size.height - 12) / 2}) rotate(-90)`)
            .attr("text-anchor", "middle")
            .attr("class", "text-sm")
            .text("Node Count")
            ;
    }

    // TODO: a lot of repeated code with the block above
    @watch("data.playback")
    moveNodeCartLine() {
        const data = this.data.precompiledAsts;

        const nodeChart = d3.select("svg#node-chart");
        const size = d3.select("svg#node-chart").node().getBoundingClientRect();

        const margin = { top: 50, right: 15, bottom: 15, left: 45 };
        const xScale = d3
            .scaleLinear()
            .domain([0, data.length])
            .range([0, size.width - (margin.left + margin.right)])
            ;

        // vertical bar
        nodeChart.selectAll("rect")
            .attr("x", margin.left + xScale(this.data.playback))
            .attr("y", margin.bottom)
            .attr("width", 1.5)
            .attr("height", size.height - margin.bottom - margin.top)
            .style("fill", "#f87171")
            .style("stroke", "#f87171")
            ;
    }
}