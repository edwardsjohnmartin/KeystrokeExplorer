import { Data } from '../../data';

import * as d3 from "d3";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';
import { isFunction } from 'util';
import { AstNode, AstTemporalGenerator } from '../../ast';


@inject(Data)
export class Tree {
    data: Data;
    tancestry: Set<number>;
    tposterity: Set<number>;

    constructor(data: Data) {
        this.data = data;
        this.tancestry = new Set<number>();
        this.tposterity = new Set<number>();
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
                const node: AstNode = d.data;
                console.log(node.name, 'tid='+node.tid, 'eventNum='+node.eventNum, 'tparent='+node.tparent, 'edits='+node.num_edits);
                console.log(node);
                // Find the root parent
                let n: AstNode = node;
                this.tancestry.clear();
                this.tposterity.clear();
                this.tancestry.add(n.tid);
                while (n.tparent !== undefined) {
                    n = this.data.tid2node[n.tparent];
                    this.tancestry.add(n.tid);
                }
                console.log('Origin node:', n);

                const gen = AstTemporalGenerator(node, this.data.tid2node);
                let cur = gen.next();
                while (!cur.done) {
                    let n:AstNode = cur.value.node;
                    this.tposterity.add(n.tid);
                    cur = gen.next();
                }
            });
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
            .attr("r", d => {
                return this.tancestry.has(d.data.tid) || this.tposterity.has(d.data.tid) ? 6 : 3;
            })
            .attr("fill", d => {
                return this.tancestry.has(d.data.tid) ? "#ff0000" : 
                    this.tposterity.has(d.data.tid) ? "#00ff00" : "#364e74";
            })
            ;
    }
}