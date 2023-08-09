import { Data } from '../../data';

import * as d3 from "d3";
import { DataFrame, IDataFrame, ISeries } from "data-forge";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';
import { AstNode } from '../../ast';

@inject(Data)
export class StudentStruggle {
    private data: Data;
    // private taskStruggleRate: Map<string, Struggle>;
    private taskStruggleRate: IDataFrame;

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

    private computeNodeStruggleRate() {
        this.taskStruggleRate = new DataFrame(
            { columnNames: ["nodeType", "name", "tparent", "numEdits", "numInserts", "numDeletes"] }
        );

        const tid2node = this.data.temporalHierarchy.getTid();
        console.log(tid2node);

        // only consider leaf nodes so we don't double up
        tid2node.forEach((node: AstNode) => {
            if (node.tchildren !== undefined) return;

            this.taskStruggleRate = this.taskStruggleRate.appendPair([node.tid, {
                "nodeType": node.type, "name": node.name, "tparent": node.tparent, "numInserts": node.numInserts, "numDeletes": node.numDeletes
            }]);
        });

        console.log(this.taskStruggleRate.toString());
    }

    private createChart() {
        // const data = this.taskStruggleRate;

        // const struggleChart = d3.select("svg#struggleChart");
        // const size = struggleChart.node().getBoundingClientRect();
        // struggleChart.selectAll("*").remove();

        // const margin = { top: 50, right: 30, bottom: 50, left: 80 };
        // const xScale = d3
        //     .scaleLinear()
        //     .domain([0, d3.max([...data.values()], (struggle: Struggle) => struggle.numEdits) + 5])
        //     .range([0, size.width - margin.left - margin.right])
        //     ;
        // const yScale = d3
        //     .scaleBand()
        //     .domain([...data.keys()])
        //     .range([0, size.height - (margin.bottom + margin.top)])
        //     .padding(0.5)
        //     ;

        // // create x-axis on the chart
        // struggleChart
        //     .append("g")
        //     .attr("id", "xAxis")
        //     .attr("transform", `translate(${margin.left}, ${size.height - margin.bottom})`)
        //     .call(d3.axisBottom(xScale))
        //     .selectAll("text")
        //     .attr("transform", "translate(-5, 2) rotate(-30)")
        //     .style("text-anchor", "end")
        //     ;

        // // create y-axis on the chart
        // struggleChart
        //     .append("g")
        //     .attr("id", "yAxis")
        //     .attr("transform", `translate(${margin.left}, ${margin.top})`)
        //     .call(d3.axisLeft(yScale))
        //     ;

        // // create bars
        // struggleChart
        //     .selectAll("rect")
        //     .data([...data.keys()])
        //     .enter()
        //     .append("rect")
        //     .attr("x", xScale(0) + margin.left)
        //     .attr("y", (d: string) => yScale(d) + margin.top)
        //     .attr("width", (d: string) => xScale(data.get(d).numEdits))
        //     .attr("height", yScale.bandwidth())
        //     .attr("fill", "#69b3a2")
        //     ;
    }

    private updateChart() {
        //     const data = this.taskStruggleRate;
        //     console.log(data);

        //     const struggleChart = d3.select("svg#struggleChart");
        //     const size = struggleChart.node().getBoundingClientRect();

        //     const margin = { top: 50, right: 30, bottom: 50, left: 80 };
        //     const xScale = d3
        //         .scaleLinear()
        //         .domain([0, d3.max([...data.values()], (struggle: Struggle) => struggle.numEdits) + 5])
        //         .range([0, size.width - margin.left - margin.right])
        //         ;
        //     const yScale = d3
        //         .scaleBand()
        //         .domain([...data.keys()])
        //         .range([0, size.height - (margin.bottom + margin.top)])
        //         .padding(0.5)
        //         ;

        //     const xAxis = d3.select("g#xAxis");
        //     const yAxis = d3.select("g#yAxis");

        //     xAxis.transition().duration(1000).call(d3.axisBottom(xScale));
        //     yAxis.transition().duration(1000).call(d3.axisLeft(yScale));

        //     struggleChart
        //         .selectAll("rect")
        //         .data([...data.keys()])
        //         .join("rect")
        //         .transition()
        //         .duration(1000)
        //         .attr("x", xScale(0) + margin.left)
        //         .attr("y", (d: string) => yScale(d) + margin.top)
        //         .attr("width", (d: string) => xScale(data.get(d).numEdits))
        //         .attr("height", yScale.bandwidth())
        //         .attr("fill", "#69b3a2")
        //         ;
    }
}