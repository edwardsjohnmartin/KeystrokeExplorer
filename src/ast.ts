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
    public lineno: number;
    public col_offset: number;
    public src;

    // text-position attributes -- compute later
    public startLine: number;
    public startCol: number;
    public endLine: number;
    public endCol: number;
    public start: number;
    public end: number;

    constructor(src) {
        this.descendants = 0;
        this.type = "ERROR PARSING";
        this.name = undefined;
        this.children = []
        this.lineno = -1;
        this.col_offset = -1;
        this.src = src;
    }
}

export abstract class AstBuilder {
    static createAst(codeState: string) {
        let parse = null;
        try {
            // first argument is file-name (pointless)
            parse = Sk.parse("", codeState);
        } catch (error) {
            throw SyntaxError(`Error on line ${error.traceback[0].lineno}`);
        }

        const ast = Sk.astFromParse(parse.cst, "", parse.flags);
        const root = this.createAstNode(ast);
        this.updateRegions(root, codeState);

        return root;
    }

    //------------------------------------------------------------
    // Main function
    //------------------------------------------------------------
    static createAstNode(ast: any) {
        let node = new AstNode(ast);

        switch (ast._astname) {
            case "Call":
                node = this.createCall(ast);
                break;
            case "BinOp":
                node = this.createBinOp(ast);
                break;
            case "Expr":
                node = this.createAstNode(ast.value);
                break;
            case "FunctionDef":
                node = this.createFunctionDef(ast);
                break;
            case "Name":
                node.name = ast.id.v;
                break;
            case "Compare":
                node = this.createCompare(ast);
                break;
            case "Assign":
                node = this.createAssign(ast);
                break;
            case "AugAssign":
                node = this.createAugDecAssign(ast, true);
                break;
            case "DecAssign":
                node = this.createAugDecAssign(ast, false);
                break;
            case "For":
                node = this.createFor(ast);
                break;
            case "Return":
                node = this.createReturn(ast);
                break;
            case "arguments":
                ast._astname = "Arguments"
                node = this.createArguments(ast);
                break;
            default: {
                // Loop, conditional, etc
                if (ast.test !== undefined) {
                    node.children.push(this.createAstNode(ast.test));
                }

                // Body of a function, loop, conditional, etc
                if (ast.body !== undefined) {
                    ast.body.forEach((child: any) => {
                        node.children.push(this.createAstNode(child));
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
                    node.children.push(this.createAstNode(orelse));
                }
            }
        }

        node.lineno = ast.lineno;
        node.col_offset = ast.col_offset;
        node.type = ast._astname;

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
    static createBinOp(ast: any) {
        let node = new AstNode(ast);

        node.children.push(this.createAstNode(ast.left));
        node.children.push(this.createAstNode(ast.right));

        return node;
    }

    static createCall(ast: any) {
        let node = new AstNode(ast);

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
                node.children.push(this.createAstNode(child));
            });
        }

        return node;
    }

    static createArguments(ast: any) {
        // Sk.astnodes.arguments_ node
        let node = new AstNode(ast);

        ast.args.forEach((child: any) => {
            child._astname = "Name";
            child.id = child.arg;
            node.children.push(this.createAstNode(child));
        });

        return node;
    }

    static createFunctionDef(ast: any) {
        let node = new AstNode(ast);
        node.name = "def " + ast.name.v;

        // Arguments
        if (ast.args.args.length > 0) {
            node.children.push(this.createAstNode(ast.args));
        }

        // Body of a function, loop, conditional, etc
        if (ast.body !== undefined) {
            ast.body.forEach((child: any) => {
                node.children.push(this.createAstNode(child));
            });
        }

        return node;
    }

    static createCompare(ast: any) {
        let node = new AstNode(ast);

        const lhs = ast.left;
        const rhs = ast.comparators[0];
        const op = ast.ops[0].prototype;

        node.children.push(this.createAstNode(lhs));
        node.children.push(this.createAstNode(op));
        node.children.push(this.createAstNode(rhs));

        return node;
    }

    static createAssign(ast: any) {
        let node = new AstNode(ast);
        node.name = "=";

        ast.targets.forEach((target: any) => {
            node.children.push(this.createAstNode(target));
        });
        node.children.push(this.createAstNode(ast.value));

        return node;
    }

    static createAugDecAssign(ast: any, aug: boolean) {
        let node = new AstNode(ast);
        node.name = aug ? "+=" : "-=";

        node.children.push(this.createAstNode(ast.target));
        node.children.push(this.createAstNode(ast.value));

        return node;
    }

    static createFor(ast: any) {
        let node = new AstNode(ast);

        node.children.push(this.createAstNode(ast.target));
        node.children.push(this.createAstNode(ast.iter));
        ast.body.forEach((child: any) => {
            node.children.push(this.createAstNode(child));
        });

        return node;
    }

    static createReturn(ast: any) {
        let node = new AstNode(ast);

        if (ast.value != null) {
            node.children.push(this.createAstNode(ast.value));
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
            lineLengths[i] = line.length + 1;
        });

        let lineLengthCumSum = lineLengths.map((sum => value => sum += value)(0));
        lineLengthCumSum = [0].concat(lineLengthCumSum);

        this.updateRegionsImpl(node, code, lines, lineLengthCumSum, lines.length - 1, lineLengths[lines.length - 1]);
    }

    static updateRegionsImpl(node: AstNode, code: string, lines: Array<string>, lineLengthCumSum: Array<any>, endLine: number, endCol: number) {
        node.startLine = node.lineno - 1;
        node.startCol = node.col_offset;
        node.endLine = endLine;
        node.endCol = endCol;

        // Get linear indices
        node.start = this.getIndex(node.startLine, node.startCol, lineLengthCumSum);
        node.end = this.getIndex(node.endLine, node.endCol, lineLengthCumSum);

        // Ignore whitespace at end
        let s = code.substring(node.start, node.end);
        let trim = s.length - s.trimEnd().length;
        node.end -= trim;

        // Set start and end for each child
        node.children.forEach(child => {
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
}