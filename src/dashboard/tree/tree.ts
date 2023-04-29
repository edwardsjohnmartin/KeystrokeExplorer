import { Data } from '../../data';

import * as d3 from "d3";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';
import { isFunction } from 'util';
import { AstNode } from '../../ast';


@inject(Data)
export class Tree {
    data: Data;
    selectedParent: number;
    parents: Set<number>;

    constructor(data: Data) {
        this.data = data;
        this.selectedParent = -1;
        this.parents = new Set<number>();
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
        // if (ast === null || ast === undefined) return;

        // clear old html out
        d3.select("g#tree").selectAll("*").remove();

        if (ast === null || ast === undefined) return;

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
            .on("mouseover", (event: MouseEvent, d) => {
                let node: AstNode = d.data;
                console.log(node.name, 'cid='+node.cid, 'eventNum='+node.eventNum, 'tparent='+node.tparent, 'edits='+node.num_edits);
                this.selectedParent = node.tparent;
                // Find the root parent
                let n: AstNode = node;
                this.parents.clear();
                this.parents.add(n.cid);
                while (n.tparent !== undefined) {
                    n = this.data.cid2node[n.tparent];
                    this.parents.add(n.cid);
                }
                console.log('Origin node:', n);
            })
            // .on("mouseout", function() {
            //     // // Remove the info text on mouse out.
            //     // d3.select(this).select('text.info').remove()
            //   });            
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
            .attr("r", d => this.parents.has(d.data.cid) ? 6 : 3)
            .attr("fill", d => {
                
                return this.parents.has(d.data.cid) ? "#ff0000" : "#364e74";
            })
            ;
    }
}