import { AnyARecord } from "dns";
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
    public src;

    // The event number
    public eventNum: number;

    // text-position attributes -- compute later
    public startLine: number;
    public startCol: number;
    public endLine: number;
    public endCol: number;
    public start: number;
    public end: number;

    // Temporal relationships. These attributes describe a node's
    // ancestry and posterity in time. Using them we can answer questions
    // such as "when was this node created?" and "how many keystrokes
    // were spent on this node?"

    // tid - a unique "temporal ID"
    public tid: number|undefined = undefined;
    // tparent - temporal parent - the node from which this node
    // was created
    public tparent: number|undefined = undefined;
    // tchildren - temporal children - nodes created out of this
    // node. The reason this is an array of ids and not nodes themselves
    // (as is the children attribute) is because having references to
    // the nodes themselves would require all ASTs for a program to be
    // in memory.
    public tchildren: Array<number> = [];
    public starti: number|undefined = undefined;
    public endi: number|undefined = undefined;
    public num_edits: number = -1;
    public num_new_chars: number = -1;

    constructor(src, eventNum: number) {
        this.descendants = 0;
        this.type = "ERROR PARSING";
        this.name = undefined;
        this.children = []
        this.src = src;
        this.eventNum = eventNum;

        this.startLine = src.lineno-1;
        this.startCol = src.col_offset;
        this.type = src._astname;

        // console.log('** constructor:', this.starti);
    }
}

//-------------------------------------------------
// AstGenerator
//-------------------------------------------------

export type AstGeneratorValue = {
    node: AstNode;
    level: number;
}

export function* AstGenerator(node:AstNode, level:number=0): Generator<AstGeneratorValue, null, any> {
    if (node) {
        yield {node:node, level:level};
        for (let i:number = 0; i < node.children?.length; ++i) {
            let n:AstNode = node.children[i];
            yield* AstGenerator(n, level+1);
        }
    }
    return null;
}

export function* AstTemporalGenerator(node: AstNode, tid2node: Array<AstNode>, level: number=0): Generator<AstGeneratorValue, null, any> {
    if (node) {
        yield {node:node, level:level};
        for (let i:number = 0; i < node.tchildren.length; ++i) {
            let n:AstNode = tid2node[node.tchildren[i]];
            yield* AstTemporalGenerator(n, tid2node, level+1);
        }
    }
    return null;
}

//-------------------------------------------------
// printAst
//-------------------------------------------------
export function printAst2(ast:AstNode) {
    const gen = AstGenerator(ast);
    let cur = gen.next();
    while (!cur.done) {
        const node:AstNode = cur.value.node;
        const prefix:string = ''.padStart(cur.value.level*2, ' ');
        console.log(prefix, node);
        cur = gen.next();
    }
}

export function printAst(ast:AstNode) {
    const gen = AstGenerator(ast);
    let cur = gen.next();
    while (!cur.done) {
        const node:AstNode = cur.value.node;
        const prefix:string = ''.padStart(cur.value.level*2, ' ');

        const tid:string = (node.tid !== undefined) ? `tid=${node.tid}` : '';
        const tparent:string = (node.tparent !== undefined) ? `tparent=${node.tparent}` : '';
        const location:string = (node.starti !== undefined) ? `loc=${node.starti}-${node.endi}` : '';
        const new_chars:string = (node.num_new_chars !== undefined) ? `new_chars=${node.num_new_chars}` : '';

        console.log(`${prefix}${node.name} ${tid} ${tparent} ${location} ${new_chars}`);

        cur = gen.next();
    }
}

//-------------------------------------------------
// AstBuilder
//-------------------------------------------------
export abstract class AstBuilder {
    static createAst(codeState: string, eventNum: number) {
        let parse = null;
        try {
            // first argument is file-name (pointless)
            parse = Sk.parse("", codeState);
        } catch (error) {
            throw SyntaxError(`Error on line ${error.traceback[0].lineno}`);
        }

        const ast = Sk.astFromParse(parse.cst, "", parse.flags);
        const root = this.createAstNode(ast, eventNum);
        this.updateRegions(root, codeState);

        return root;
    }

    //------------------------------------------------------------
    // Main function
    //------------------------------------------------------------
    static createAstNode(ast: any, eventNum: number) {
        let node:AstNode;
        // console.log(ast);

        switch (ast._astname) {
            case "Call":
                node = this.createCall(ast, eventNum);
                break;
            case "BinOp":
                node = this.createBinOp(ast, eventNum);
                break;
            case "Expr":
                node = this.createAstNode(ast.value, eventNum);
                break;
            case "FunctionDef":
                node = this.createFunctionDef(ast, eventNum);
                break;
            case "Name":
                node = new AstNode(ast, eventNum);
                node.name = ast.id.v;
                node.endLine = node.startLine;
                node.endCol = node.startCol + node.name.length;
                break;
            case "Num":
                node = new AstNode(ast, eventNum);
                node.endLine = node.startLine;
                node.endCol = node.startCol + ast.n.v.toString().length;
                break;
            case "Compare":
                node = this.createCompare(ast, eventNum);
                break;
            case "Assign":
                node = this.createAssign(ast, eventNum);
                break;
            case "AugAssign":
                node = this.createAugDecAssign(ast, true, eventNum);
                break;
            case "DecAssign":
                node = this.createAugDecAssign(ast, false, eventNum);
                break;
            case "For":
                node = this.createFor(ast, eventNum);
                break;
            case "Return":
                node = this.createReturn(ast, eventNum);
                break;
            case "arguments":
                ast._astname = "Arguments"
                node = this.createArguments(ast, eventNum);
                break;
            default: {
                node = new AstNode(ast, eventNum);
                // Loop, conditional, etc
                if (ast.test !== undefined) {
                    node.children.push(this.createAstNode(ast.test, eventNum));
                }

                // Body of a function, loop, conditional, etc
                if (ast.body !== undefined) {
                    ast.body.forEach((child: any) => {
                        node.children.push(this.createAstNode(child, eventNum));
                    });
                }

                // Conditional else -- split the ast off into a new one
                if (ast.orelse !== undefined && ast.orelse.length > 0) {
                    const orelse = {
                        "lineno": ast.orelse[0].lineno - 1,
                        "col_offset": ast.orelse[0].col_offset - 4,
                        "body": [ast.orelse[0]],
                        "_astname": "Else",
                    }
                    node.children.push(this.createAstNode(orelse, eventNum));
                }
            }
        }

        // // node.lineno = ast.lineno;
        // // node.col_offset = ast.col_offset;
        // node.startLine = ast.lineno-1;
        // node.startCol = ast.col_offset;
        // node.type = ast._astname;

        // default name is the type
        if (node.name === undefined)
            node.name = ast._astname;

        node.descendants = node.children.length;
        node.children.forEach(child => node.descendants += child.descendants);

        return node;
    }

    //------------------------------------------------------------
    // Functions to recursively create our format of AST from
    // the Skulpt format.
    //------------------------------------------------------------
    static createBinOp(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);

        node.children.push(this.createAstNode(ast.left, eventNum));
        node.children.push(this.createAstNode(ast.right, eventNum));

        return node;
    }

    static createCall(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);

        let val = "";
        if (ast.func.value !== undefined && ast.func.value != null && ast.func.value.id.v.length > 0) {
            val = ast.func.value.id.v + ".";
        }
        if (ast.func.id !== undefined) {
            node.name = "call " + val + ast.func.id.v;
        } else {
            node.name = "call " + val + ast.func.attr.v;
        }

        // Arguments
        if (ast.args != null) {
            ast.args.forEach((child: any) => {
                node.children.push(this.createAstNode(child, eventNum));
            });
        }

        return node;
    }

    static createArguments(ast: any, eventNum: number) {
        // Sk.astnodes.arguments_ node
        let node = new AstNode(ast, eventNum);

        ast.args.forEach((child: any) => {
            child._astname = "Name";
            child.id = child.arg;
            node.children.push(this.createAstNode(child, eventNum));
        });

        return node;
    }

    static createFunctionDef(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);
        node.name = "def " + ast.name.v;

        // Arguments
        if (ast.args.args.length > 0) {
            node.children.push(this.createAstNode(ast.args, eventNum));
        }

        // Body of a function, loop, conditional, etc
        if (ast.body !== undefined) {
            ast.body.forEach((child: any) => {
                node.children.push(this.createAstNode(child, eventNum));
            });
        }

        return node;
    }

    static createCompare(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);

        const lhs = ast.left;
        const rhs = ast.comparators[0];
        const op = ast.ops[0].prototype;

        node.children.push(this.createAstNode(lhs, eventNum));
        node.children.push(this.createAstNode(op, eventNum));
        node.children.push(this.createAstNode(rhs, eventNum));

        return node;
    }

    static createAssign(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);
        node.name = "=";

        ast.targets.forEach((target: any) => {
            node.children.push(this.createAstNode(target, eventNum));
        });
        node.children.push(this.createAstNode(ast.value, eventNum));

        return node;
    }

    static createAugDecAssign(ast: any, aug: boolean, eventNum: number) {
        let node = new AstNode(ast, eventNum);
        node.name = aug ? "+=" : "-=";

        node.children.push(this.createAstNode(ast.target, eventNum));
        node.children.push(this.createAstNode(ast.value, eventNum));

        return node;
    }

    static createFor(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);

        node.children.push(this.createAstNode(ast.target, eventNum));
        node.children.push(this.createAstNode(ast.iter, eventNum));
        ast.body.forEach((child: any) => {
            node.children.push(this.createAstNode(child, eventNum));
        });

        return node;
    }

    static createReturn(ast: any, eventNum: number) {
        let node = new AstNode(ast, eventNum);

        if (ast.value != null) {
            node.children.push(this.createAstNode(ast.value, eventNum));
        }

        return node;
    }

    static getIndex(line: number, col: number, lineLengthCumSum: Array<any>) {
        return lineLengthCumSum[line] + col;
    }

    static updateRegions(node: AstNode, code: string) {
        // Get the number of characters on each line
        const lines = code.split("\n");
        const lineLengths = new Array(lines.length);
        lines.forEach((line, i) => {
            // +1 to account for the newline character
            lineLengths[i] = line.length;
        });

        let lineLengthCumSum = lineLengths.map((sum => value => sum += value)(0));
        lineLengthCumSum = [0].concat(lineLengthCumSum);

        // node.lineno = 1;
        // node.col_offset = 0;
        node.startLine = 0;
        node.startCol = 0;
        this.updateRegionsImpl(node, code, lines, lineLengthCumSum, lines.length - 1, lineLengths[lines.length - 1]);
    }

    static updateRegionsImpl(node: AstNode, code: string, lines: Array<string>, lineLengthCumSum: Array<any>, endLine: number, endCol: number) {
        if (node.endLine === undefined) {
            node.endLine = endLine;
            node.endCol = endCol;
        }

        // Get linear indices
        node.start = this.getIndex(node.startLine, node.startCol, lineLengthCumSum);
        node.end = this.getIndex(node.endLine, node.endCol, lineLengthCumSum);

        // console.log('test***', node.name, node);
        // Ignore whitespace at end
        let s = code.substring(node.start, node.end);
        let trim = s.length - s.trimEnd().length;
        node.end -= trim;
        // Set start and end for each child. We have to iterate backwards.
        let children:Array<AstNode> = [...node.children];
        children.reverse();
        children.forEach(child => {
            this.updateRegionsImpl(child, code, lines, lineLengthCumSum, endLine, endCol);
            endLine = child.startLine;
            endCol = child.startCol;
        });

        // delete child attribute if there are no children
        //   note: makes d3 easier to work with
        if (node.children.length === 0) {
            node.children = undefined;
        }
    }

    // private static setNodeRegions(node: AstNode, startLine: number, startCol: number, endLine: number, endCol: number, lineLengthCumSum: any[], code: string) {

    // }
}