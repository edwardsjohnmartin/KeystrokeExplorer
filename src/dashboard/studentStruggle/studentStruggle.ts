import { Data } from '../../data';

import * as d3 from "d3";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';
import { AstNode } from '../../ast';

interface Struggle {
    numEdits: number,
    numInserts: number,
    numDeletes: number,
}

@inject(Data)
export class StudentStruggle {
    private data: Data;
    private struggleRate: Map<string, Struggle>;

    constructor(data: Data) {
        this.data = data;
    }

    attached() {
        this.computeNodeStruggleRate();
        this.createChart();
    }

    @watch("data.taskId")
    private taskChanged() {
        this.computeNodeStruggleRate();
        this.updateChart();
    }

    private createChart() {
        const data = this.struggleRate;

        const struggleChart = d3.select("svg#struggleChart");
        const size = struggleChart.node().getBoundingClientRect();
        struggleChart.selectAll("*").remove();

        const margin = { top: 50, right: 30, bottom: 50, left: 80 };
        const xScale = d3
            .scaleLinear()
            .domain([0, d3.max([...data.values()], (struggle: Struggle) => struggle.numEdits) + 5])
            .range([0, size.width - margin.left - margin.right])
            ;
        const yScale = d3
            .scaleBand()
            .domain([...data.keys()])
            .range([0, size.height - (margin.bottom + margin.top)])
            .padding(0.5)
            ;

        // create x-axis on the chart
        struggleChart
            .append("g")
            .attr("id", "xAxis")
            .attr("transform", `translate(${margin.left}, ${size.height - margin.bottom})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("transform", "translate(-5, 2) rotate(-30)")
            .style("text-anchor", "end")
            ;

        // create y-axis on the chart
        struggleChart
            .append("g")
            .attr("id", "yAxis")
            .attr("transform", `translate(${margin.left}, ${margin.top})`)
            .call(d3.axisLeft(yScale))
            ;

        // create bars
        struggleChart
            .selectAll("rect")
            .data([...data.keys()])
            .enter()
            .append("rect")
            .attr("x", xScale(0) + margin.left)
            .attr("y", (d: string) => yScale(d) + margin.top)
            .attr("width", (d: string) => xScale(data.get(d).numEdits))
            .attr("height", yScale.bandwidth())
            .attr("fill", "#69b3a2")
            ;
    }

    private computeNodeStruggleRate() {
        const tid2node = this.data.temporalHierarchy.getTid();
        const struggleRate = new Map<string, Struggle>();

        console.log(tid2node);

        // only consider leaf nodes so we don't double up
        tid2node.forEach((node: AstNode) => {
            if (node.tchildren.length > 0) return;

            // TODO: Module is showing WAYY too many times
            console.log(node.type);

            // create a new struggle object if the node type hasn't been seen
            if (!struggleRate.has(node.type)) {
                struggleRate.set(node.type, <Struggle>{
                    numEdits: 0,
                    numInserts: 0,
                    numDeletes: 0,
                });
            }

            const struggle: Struggle = {
                numEdits: struggleRate.get(node.type).numEdits + node.numEdits,
                numInserts: struggleRate.get(node.type).numInserts + node.numInserts,
                numDeletes: struggleRate.get(node.type).numDeletes + node.numDeletes,
            };
            struggleRate.set(node.type, struggle);
        });

        // sort map based on highest numEdits -> lowest numEdits
        this.struggleRate = (
            new Map([...struggleRate.entries()].sort(
                (a, b) => struggleRate.get(b[0]).numEdits - struggleRate.get(a[0]).numEdits)
            )
        );
    }

    private updateChart() {
        const data = this.struggleRate;
        console.log(data);

        const struggleChart = d3.select("svg#struggleChart");
        const size = struggleChart.node().getBoundingClientRect();

        const margin = { top: 50, right: 30, bottom: 50, left: 80 };
        const xScale = d3
            .scaleLinear()
            .domain([0, d3.max([...data.values()], (struggle: Struggle) => struggle.numEdits) + 5])
            .range([0, size.width - margin.left - margin.right])
            ;
        const yScale = d3
            .scaleBand()
            .domain([...data.keys()])
            .range([0, size.height - (margin.bottom + margin.top)])
            .padding(0.5)
            ;

        const xAxis = d3.select("g#xAxis");
        const yAxis = d3.select("g#yAxis");

        xAxis.transition().duration(1000).call(d3.axisBottom(xScale));
        yAxis.transition().duration(1000).call(d3.axisLeft(yScale));

        struggleChart
            .selectAll("rect")
            .data([...data.keys()])
            .join("rect")
            .transition()
            .duration(1000)
            .attr("x", xScale(0) + margin.left)
            .attr("y", (d: string) => yScale(d) + margin.top)
            .attr("width", (d: string) => xScale(data.get(d).numEdits))
            .attr("height", yScale.bandwidth())
            .attr("fill", "#69b3a2")
            ;
    }
}