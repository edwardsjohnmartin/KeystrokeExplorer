import * as Sk from "skulpt";


Sk.configure({
    __future__: Sk.python3
});

export class AstNode {
    // base attributes
    public descendants: number;
    public type: string;
    public name: string;
    public children: Array<AstNode>;
    public parent: AstNode;
    public src;

    // The event
    public timestamp: number;
    public eventNum: number;
    public treeNumber: number;

    // text-position attributes -- compute later.
    public startLine: number;
    public startCol: number;
    public endLine: number;
    public endCol: number;
    public start: number;
    public end: number; // one past the last character of the node

    // Temporal relationships. These attributes describe a node's
    // ancestry and posterity in time. Using them we can answer questions
    // such as "when was this node created?" and "how many keystrokes
    // were spent on this node?"

    // tid - a unique "temporal ID"
    public tid: number | undefined = undefined;
    // tparent - temporal parent - the node from which this node was created
    public tparent: number | undefined = undefined;
    // tchildren - temporal children - nodes created out of this node
    public tchildren: number | undefined = undefined;

    // The number of new characters since the last compilable state
    public numNewChars: number = 0;
    public intermediateLength: number = 0;
    public bodyInserts: number = 0;
    public bodyDeletes: number = 0;
    public numInserts: number = 0;
    public numDeletes: number = 0;
    public numLocalInserts: number = 0;
    public numLocalDeletes: number = 0;

    constructor(src, eventNum: number, parent: AstNode) {
        this.descendants = 0;
        this.type = "ERROR PARSING";
        this.name = undefined;
        this.children = []
        this.src = src;
        this.eventNum = eventNum;
        this.parent = parent;

        this.startLine = src.lineno - 1;
        this.startCol = src.col_offset;
        this.type = src._astname;

        // console.log('** constructor:', this.starti);
    }

    // Not really. Actually the number of new characters since its inception
    public totalEdits(tid2node: Array<AstNode>): number {
        if (this.tparent > 0) {
            return this.numNewChars + tid2node[this.tparent].totalEdits(tid2node);
        }
        return this.numNewChars;
    }
}

//-------------------------------------------------
// AstGenerator
//-------------------------------------------------

export type AstGeneratorValue = {
    node: AstNode;
    level: number;
}

export function* AstGenerator(node: AstNode, level: number = 0): Generator<AstGeneratorValue, null, any> {
    if (node) {
        yield { node: node, level: level };
        for (let i: number = 0; i < node.children?.length; ++i) {
            let n: AstNode = node.children[i];
            yield* AstGenerator(n, level + 1);
        }
    }
    return null;
}

export function* AstTemporalGenerator(node: AstNode, tid2node: Array<AstNode>, level: number = 0): Generator<AstGeneratorValue, null, any> {
    if (node) {
        yield { node: node, level: level };
        yield* AstTemporalGenerator(tid2node[node.tchildren], tid2node, level + 1);
    }
    return null;
}

export function createEmptyAst() {
    return AstBuilder.createAst("", -1, -1);
}

//-------------------------------------------------
// printAst
//-------------------------------------------------
export function printAst2(ast: AstNode) {
    const gen = AstGenerator(ast);
    let cur = gen.next();
    while (!cur.done) {
        const node: AstNode = cur.value.node;
        const prefix: string = ''.padStart(cur.value.level * 2, ' ');
        console.log(prefix, node);
        cur = gen.next();
    }
}

export function printAst(ast: AstNode) {
    const gen = AstGenerator(ast);
    let cur = gen.next();
    while (!cur.done) {
        const node: AstNode = cur.value.node;
        const prefix: string = ''.padStart(cur.value.level * 2, ' ');

        const tid: string = (node.tid !== undefined) ? `tid=${node.tid}` : '';
        const tparent: string = (node.tparent !== undefined) ? `tparent=${node.tparent}` : '';
        const location: string = (node.start !== undefined) ? `loc=${node.start}-${node.end}` : '';
        const new_chars: string = (node.numNewChars !== undefined) ? `new_chars=${node.numNewChars}` : '';

        console.log(`${prefix}${node.name} ${tid} ${tparent} ${location} ${new_chars}`);

        cur = gen.next();
    }
}

//-------------------------------------------------
// AstBuilder
//-------------------------------------------------
export abstract class AstBuilder {
    static treeNumber = 0;

    static createAst(codeState: string, eventNum: number, treeNumber: number) {
        let parse = null;
        try {
            // first argument is file-name (pointless)
            parse = Sk.parse("", codeState);
        } catch (error) {
            throw SyntaxError(`Error on line ${error.traceback[0].lineno}`);
        }

        AstBuilder.treeNumber = treeNumber;
        const ast = Sk.astFromParse(parse.cst, "", parse.flags);
        const root = this.createAstNode(ast, eventNum, undefined);
        this.updateRegions(root, codeState);

        return root;
    }

    //------------------------------------------------------------
    // Main function
    //------------------------------------------------------------
    static createAstNode(ast: any, eventNum: number, parent: AstNode) {
        // console.log(ast);

        let node: AstNode;

        switch (ast._astname) {
            case "Call":
                node = this.createCall(ast, eventNum, parent);
                break;
            case "BinOp":
                node = this.createBinOp(ast, eventNum, parent);
                break;
            case "Expr":
                node = this.createAstNode(ast.value, eventNum, node);
                break;
            case "FunctionDef":
                node = this.createFunctionDef(ast, eventNum, parent);
                break;
            case "Name":
                node = new AstNode(ast, eventNum, parent);
                node.name = ast.id.v;
                node.endLine = node.startLine;
                node.endCol = node.startCol + node.name.length;
                break;
            case "Num":
                node = new AstNode(ast, eventNum, parent);
                node.endLine = node.startLine;
                node.endCol = node.startCol + ast.n.v.toString().length;
                break;
            case "Compare":
                node = this.createCompare(ast, eventNum, parent);
                break;
            case "Assign":
                node = this.createAssign(ast, eventNum, parent);
                break;
            case "AugAssign":
                node = this.createAugDecAssign(ast, true, eventNum, parent);
                break;
            case "DecAssign":
                node = this.createAugDecAssign(ast, false, eventNum, parent);
                break;
            case "For":
                node = this.createFor(ast, eventNum, parent);
                break;
            case "Return":
                node = this.createReturn(ast, eventNum, parent);
                break;
            case "Else":
                node = new AstNode(ast, eventNum, parent);
                node.name = "Else";
                node.children.push(this.createAstNode(ast.body[0], eventNum, node));
                break;
            default: {
                node = new AstNode(ast, eventNum, parent);

                // Loop, conditional, etc
                if (ast.test !== undefined) {
                    node.children.splice(node.children.length, 0, this.createAstNode(ast.test, eventNum, node))
                }

                // Body of a function, loop, conditional, etc
                if (ast.body !== undefined) {
                    ast.body.forEach((child: any) => {
                        node.children.splice(node.children.length, 0, this.createAstNode(child, eventNum, node))
                    });
                }

                // Conditional else -- split the ast off into a new one
                if (ast.orelse !== undefined && ast.orelse.length > 0) {
                    let orelse = ast.orelse[0];
                    if (orelse._astname === "If") {
                        orelse._astname = "Elif";
                    } else {
                        orelse = {
                            lineno: orelse.lineno,
                            col_offset: orelse.col_offset,
                            _astname: "Else",
                            body: [ast.orelse[0]],
                        }
                    }
                    node.parent.children.splice(node.parent.children.length, 0, this.createAstNode(orelse, eventNum, parent));
                }
            }
        }

        // default name is the type
        if (node.name === undefined) {
            node.name = ast._astname;
        }

        // rename NameConstants to be one of [True, False, None]
        if (node.name == "NameConstant") {
            if (node.src.value.v === 1) node.name = "True";
            if (node.src.value.v === 0) node.name = "False";
            if (node.src.value.v === null) node.name = "None";
        }

        node.treeNumber = AstBuilder.treeNumber;
        node.descendants = node.children.length;
        node.children.forEach(child => node.descendants += child.descendants);

        return node;
    }

    //------------------------------------------------------------
    // Functions to recursively create our format of AST from
    // the Skulpt format.
    //------------------------------------------------------------
    static createBinOp(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);

        node.children.splice(node.children.length, 0, this.createAstNode(ast.left, eventNum, node));
        node.children.splice(node.children.length, 0, this.createAstNode(ast.right, eventNum, node));

        // this breaks identifying the correct parent node with nested BinOps
        // node.startCol = ast.left.col_offset;
        return node;
    }

    static createCall(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);

        let val = "";
        if (ast.func.value !== undefined && ast.func.value != null && ast.func.value.id.v.length > 0) {
            val = ast.func.value.id.v + ".";
        }
        if (ast.func.id !== undefined) {
            node.name = val + ast.func.id.v + "()";
        } else {
            node.name = val + ast.func.attr.v + "()";
        }

        // Arguments
        if (ast.args != null) {
            ast.args.forEach((child: any) => {
                node.children.splice(node.children.length, 0, this.createAstNode(child, eventNum, node));
            });
        }

        return node;
    }

    static createFunctionDef(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);
        node.name = "def " + ast.name.v + "(";

        ast.args.args.forEach(element => {
            node.name += element.arg.v + ",";
        });
        if (ast.args.args.length > 0) node.name = node.name.slice(0, -1);
        node.name += ")";

        // Arguments -- skip
        // if (ast.args.args.length > 0) {
        //     node.children.splice(node.children.length, 0, this.createAstNode(ast.args, eventNum));
        // }

        // Body of a function, loop, conditional, etc
        if (ast.body !== undefined) {
            ast.body.forEach((child: any) => {
                node.children.splice(node.children.length, 0, this.createAstNode(child, eventNum, node));
            });
        }

        return node;
    }

    static createCompare(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);

        const lhs = ast.left;
        const rhs = ast.comparators[0];
        const op = ast.ops[0].prototype;

        node.children.splice(node.children.length, 0, this.createAstNode(lhs, eventNum, node));
        ast._astname = op._astname;
        node.children.splice(node.children.length, 0, this.createAstNode(rhs, eventNum, node));

        return node;
    }

    static createAssign(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);
        node.name = "=";

        ast.targets.forEach((target: any) => {
            node.children.splice(node.children.length, 0, this.createAstNode(target, eventNum, node));
        });
        node.children.splice(node.children.length, 0, this.createAstNode(ast.value, eventNum, node));

        return node;
    }

    static createAugDecAssign(ast: any, aug: boolean, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);
        node.name = aug ? "+=" : "-=";

        node.children.splice(node.children.length, 0, this.createAstNode(ast.target, eventNum, node));
        node.children.splice(node.children.length, 0, this.createAstNode(ast.value, eventNum, node));

        return node;
    }

    static createFor(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);

        node.children.splice(node.children.length, 0, this.createAstNode(ast.target, eventNum, node));
        node.children.splice(node.children.length, 0, this.createAstNode(ast.iter, eventNum, node));
        ast.body.forEach((child: any) => {
            node.children.splice(node.children.length, 0, this.createAstNode(child, eventNum, node));
        });

        return node;
    }

    static createReturn(ast: any, eventNum: number, parent: AstNode) {
        let node = new AstNode(ast, eventNum, parent);

        if (ast.value != null) {
            node.children.splice(node.children.length, 0, this.createAstNode(ast.value, eventNum, node));
        }

        return node;
    }

    static getIndex(line: number, col: number, lineLengthCumSum: Array<any>) {
        return lineLengthCumSum[line] + col;
    }

    static updateRegions(node: AstNode, code: string) {
        // Get the number of characters on each line
        const lines = code.split("\n");
        // +1 to account for the newline character
        const lineLengths: Array<number> = lines.map(line => line.length + 1);
        // Account for the fact that the last string doesn't have a newline character
        // at the end
        lineLengths[lineLengths.length - 1] -= 1;

        let lineLengthCumSum = lineLengths.map((sum => value => sum += value)(0));
        lineLengthCumSum = [0].concat(lineLengthCumSum);

        node.startLine = 0;
        node.startCol = 0;
        this.updateRegionsImpl(node, code, lines, lineLengthCumSum, lines.length - 1, lineLengths[lines.length - 1]);
    }

    static updateRegionsImpl(node: AstNode, code: string, lines: Array<string>, lineLengthCumSum: Array<any>, endLine: number, endCol: number) {
        if (node.endLine === undefined) {
            node.endLine = endLine;
            node.endCol = endCol;
        }

        // Set start and end for each child. We have to iterate backwards.
        let children: Array<AstNode> = [...node.children];
        children.reverse();
        children.forEach(child => {
            this.updateRegionsImpl(child, code, lines, lineLengthCumSum, endLine, endCol);
            endLine = child.startLine;
            endCol = child.startCol;
        });

        // Get linear indices
        node.start = this.getIndex(node.startLine, node.startCol, lineLengthCumSum);
        node.end = this.getIndex(node.endLine, node.endCol, lineLengthCumSum);

        // Ignore whitespace and comments at end
        let s = code.substring(node.start, node.end);
        // Pull whitespace off the end of the string
        s = s.trimEnd();
        // Remove comments from end
        let l = s.split("\n");
        while (l.at(-1).trimStart()[0] == '#') {
            l.pop();
        }
        s = l.join('\n');
        node.end = node.start + s.length - 1;

        // delete child attribute if there are no children
        //   note: makes d3 easier to work with
        if (node.children.length === 0) {
            node.children = undefined;
        }
    }

    // private static setNodeRegions(node: AstNode, startLine: number, startCol: number, endLine: number, endCol: number, lineLengthCumSum: any[], code: string) {

    // }
}
