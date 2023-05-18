import { Data } from '../../data';

import * as d3 from "d3";
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';
import { AstNode, AstTemporalGenerator } from '../../ast';


@inject(Data)
export class Tree {
    private data: Data;

    private tancestry: Set<number>;
    private tposterity: Set<number>;

    public tids: Array<AstNode>;
    public nodeName: string;
    public tid: number;
    public firstTid: number;
    public previousTid: number;
    public nextTid: number;
    public lastTid: number;

    constructor(data: Data) {
        this.data = data;
        this.reset();
    }

    attached() {
        this.buildTree();

        window.addEventListener("resize", () => this.buildTree());
    }

    reset() {
        this.tids = undefined;
        this.nodeName = undefined;
        this.tid = undefined;
        this.firstTid = undefined;
        this.previousTid = undefined;
        this.nextTid = undefined;
        this.lastTid = undefined;

        this.tancestry = new Set<number>();
        this.tposterity = new Set<number>();
    }

    @watch("data.playback")
    buildTree() {
        const ast = this.data.precompiledAsts[this.data.playback];

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
            ;

        d3.select("g#tree")
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("class", "link")
            .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x))
            ;

        const self = this;
        d3.select("g#tree")
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("g")
            .attr("transform", d => `translate(${d.y}, ${d.x})`)
            .append("circle")
            .attr("r", d => {
                return this.tancestry.has(d.data.tid) || this.tposterity.has(d.data.tid) ? 9 : 5;
            })
            .attr("fill", d => {
                return this.tancestry.has(d.data.tid) ? "#ff0000" :
                    this.tposterity.has(d.data.tid) ? "#00ff00" : "#364e74";
            })
            .on("mouseover", function () {
                d3.select(this).transition().duration(2).attr("r", 9);
            })
            .on("mouseout", function () {
                d3.select(this).transition().duration(2).attr("r", 5);
            })
            .on("click", (_, d) => {
                this.selectNewNode(d.data);
                this.treeNodeClick(d);
            })
            ;
    }

    private treeNodeClick(d: any) {
        const node: AstNode = d.data;
        const tid2node = this.data.temporalHierarchy.getTid();

        // console.log(node.name, 'tid=' + node.tid, 'eventNum=' + node.eventNum,
        //     'tparent=' + node.tparent, 'edits=' + node.totalEdits(tid2node));
        // console.log(node);

        // Find the root parent
        let n: AstNode = node;
        this.tancestry.clear();
        this.tposterity.clear();
        this.tancestry.add(n.tid);
        while (n.tparent !== undefined) {
            n = tid2node[n.tparent];
            this.tancestry.add(n.tid);
        }
        // console.log('Origin node:', n);

        const gen = AstTemporalGenerator(node, tid2node);
        let cur = gen.next();
        while (!cur.done) {
            let n: AstNode = cur.value.node;
            this.tposterity.add(n.tid);
            cur = gen.next();
        }
    }

    private selectNewNode(node: AstNode) {
        this.nodeName = node.name;

        // tids mapping for next 4 sections
        this.tids = this.data.temporalHierarchy.getTid();

        // find the first tid
        let firstTid = node.tid;
        let parentTid = node.tparent;
        while (parentTid !== undefined) {
            firstTid = parentTid;
            parentTid = this.tids[parentTid].tparent;
        }

        // find the last tid
        let lastTid = node.tid;
        let childTid = node.tchildren.at(-1);
        while (childTid !== undefined) {
            lastTid = childTid;
            childTid = this.tids[childTid].tchildren.at(-1);
        }

        this.tid = node.tid;
        this.firstTid = firstTid;
        this.previousTid = node.tparent;
        this.nextTid = node.tchildren.at(-1);
        this.lastTid = lastTid;
    }

    public gotoFirstTid() {
        if (this.tids) this.data.playback = this.tids[this.firstTid].treeNumber;
    }

    public gotoPreviousTid() {
        if (this.tids) this.data.playback = this.tids[this.previousTid].treeNumber;
    }

    public gotoInitialTid() {
        if (this.tids) this.data.playback = this.tids[this.tid].treeNumber;
    }

    public gotoNextTid() {
        if (this.tids) this.data.playback = this.tids[this.nextTid].treeNumber;
    }

    public gotoLastTid() {
        if (this.tids) this.data.playback = this.tids[this.lastTid].treeNumber;
    }
}