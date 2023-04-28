import { AstBuilder, AstNode, AstGenerator, printAst } from './ast';
import { DataFrame, IDataFrame, ISeries } from 'data-forge';

import { watch } from '@aurelia/runtime-html';
import internal from 'stream';
import { ConsoleSink } from 'aurelia';

export type CharNode = {
    char: string;
    action: string;
    index: number;
    prev_index: number;
}

function CharNode2string(c:CharNode) {
    return c.prev_index + '_' + c.char + '_' + c.index;
}

function updateLoc(code:string, ast:AstNode) {
    let lines:Array<string> = code.split('\n');
    // +1 to account for the newline character
    const line_lengths:Array<number> = lines.map(line => line.length+1);
    const cumulativeSum = (sum => value => sum += value)(0);
    const line_length_cum_sum:Array<number> = [0].concat(line_lengths.map(cumulativeSum));

    const gen = AstGenerator(ast);
    let cur = gen.next();
    while (!cur.done) {
        let node:AstNode = cur.value.node;

        // console.log(node);
        // console.log('abcde');
        if (node.startLine !== undefined && node.endLine !== undefined) {
            // node.starti = line_length_cum_sum[node.lineno-1] + node.col_offset;
            // node.endi = line_length_cum_sum[node.endLine-1] + node.endCol;
            node.starti = line_length_cum_sum[node.startLine] + node.startCol;
            node.endi = line_length_cum_sum[node.endLine] + node.endCol;
            // console.log(node.name, node.startLine, node.startCol, node.endLine, node.endCol);//node.endLine, line_length_cum_sum[node.endLine], node.endCol, node.starti, node.endi);
        }

        // This code is backup
        // if (node.lineno !== undefined && node.endLine !== undefined) {
        //     // node.starti = line_length_cum_sum[node.lineno-1] + node.col_offset;
        //     // node.endi = line_length_cum_sum[node.endLine-1] + node.endCol;
        //     node.starti = line_length_cum_sum[node.lineno] + node.col_offset;
        //     node.endi = line_length_cum_sum[node.endLine] + node.endCol;
        //     console.log(node.name, node.lineno, node.col_offset, node.endLine, node.endCol);//node.endLine, line_length_cum_sum[node.endLine], node.endCol, node.starti, node.endi);
        // }

        cur = gen.next();
    }

    // console.log('UpdateLocVisitor');
    // printAst(ast);

    // if hasattr(node, 'lineno') and hasattr(node, 'end_lineno'):
//             node.starti = self.line_length_cum_sum[node.lineno-1] + node.col_offset
//             node.endi = self.line_length_cum_sum[node.end_lineno-1] + node.end_col_offset
//         super().visit(node)
//         return None
}

// class UpdateLocVisitor(ast.NodeVisitor):
//     def __init__(self, code):
//         lines = code.split('\n')
//         # +1 to account for the newline character
//         line_lengths = [len(line)+1 for line in lines]
//         self.line_length_cum_sum = [0] + list(np.cumsum(line_lengths))
        
//     def visit(self, node):
//         if hasattr(node, 'lineno') and hasattr(node, 'end_lineno'):
//             node.starti = self.line_length_cum_sum[node.lineno-1] + node.col_offset
//             node.endi = self.line_length_cum_sum[node.end_lineno-1] + node.end_col_offset
//         super().visit(node)
//         return None
export class Edit {
    public location: number = 0;
    public insertText: string = "";
    public deleteText: string = "";

    constructor(location: number, insertText: string, deleteText: string) {
        this.location = location;
        this.insertText = insertText;
        this.deleteText = deleteText;
    }
}

export class Data {
    public file: any;
    public filteredFile: IDataFrame;
    public codeStates: Array<string> = [""];

    public cachedSubjects: any = {};
    public subjectId: string;
    public assignmentId: string;
    public taskId: string;

    public playbackEnabled: boolean = false;
    public playback: number = 0;
    public code: string = "";
    public edits: Array<Edit> = [];

    public fileLoading: boolean = false;
    public estimatedLoadTime: number = 0;

    public precompiledAsts: Array<AstNode> = [];
    public astParseErrors: Array<string> = [];

    constructor() {
        // this.file = require("sample.csv");
        this.file = require("correspondence.csv");
        this.fileLoaded();

        setInterval(async () => {
            if (!this.playbackEnabled) return;

            if (this.playback >= this.codeStates.length - 1) return;
            this.playback += 1;
        }, 84);
    }

    fileLoaded() {
        this.filteredFile = new DataFrame(this.file).where(row => row.EventType == "File.Edit");
        this.cacheStudentAssignments();

        // cannot compile Asts because we don't know which student/assignment/file is loaded
        //  perform this in the 'extractStudentData' function
        // this.compileAsts();

        // TODO:
        // Garbage collect doesn't work??
        //   I believe that the GC doesn't sweep these values out
        //   because the Aurelia component is still attached
        this.file = null;
        this.filteredFile = null;
    }

    public studentFileLoaded() {
        this.extractStudentData();
        // this.compileAsts();
        // Call correspondence function
        // console.log('calling correspondence');
        // AstCorrespondence.correspondence(this.precompiledAsts);
        // this.precompiledAsts.forEach((head:AstNode) => {
        //   console.log(head)
        // });
    }

    private next_cid:number = 0;

    private set_cids(node:AstNode) {
        if (node == null) return;

        // global next_cid
        if (node.cid === undefined) {
        // if (!('cid' in node)) {
        // if not hasattr(node, 'cid'):
            node.cid = this.next_cid;
            // node['cid'] = this.next_cid;
            this.next_cid += 1;
        }
        node.children?.forEach((child:AstNode) => {
            this.set_cids(child);
        });
        // for n in ast.iter_child_nodes(node):
            // set_cids(n)
    }

    // traverse through prev looking for a tparent for cur
    private set_cur_tparent(prev:AstNode, cur:AstNode, cstarti:number, cendi:number) {
        let deeper:boolean = true;
        // console.log('******** startx');
        if (prev.starti !== undefined) {
        // if ('starti' in prev) {
            // console.log('******** starti');
            const pstarti:number = prev.starti;
            const pendi:number = prev.endi;
            if (pstarti <= cstarti && pendi >= cendi) {
                cur.tparent = prev.cid;
            }
            // Go deeper if the current node is smaller then the prev node
            deeper = (cstarti >= pstarti && cendi <= pendi);
        }
        if (deeper) {
            prev.children?.forEach((n:AstNode) => {
                this.set_cur_tparent(n, cur, cstarti, cendi);
            });
            // for n in ast.iter_child_nodes(prev):
            //     set_cur_tparent(n, cur, cstarti, cendi)
        }
    }

    // This function takes an ast node, its start and end indices,
    // and finds the corresponding start and end indices in
    // the last compilable code.
    private prev_start_end(node:AstNode, curloc2prevloc:Array<number>):Array<number> {
        const n:number = curloc2prevloc.length;
        if (node.starti !== undefined) {
        // if ('starti' in node) {
            let i:number = node.starti;//['starti'];
            let j:number = node.endi-1;//['endi']-1;
            while (curloc2prevloc[i] == -1 && i < j) {
                i += 1;
            }
            if (i == j) {
                return [curloc2prevloc[i], curloc2prevloc[j]+1];
            }
            while (curloc2prevloc[j] == -1) {
                j -= 1;
            }
            return [curloc2prevloc[i], curloc2prevloc[j]+1];
        }
        return [-1, -1];
    }
        
    // Uses index correspondences to set tparents
    private set_all_tparents(prev:AstNode, cur:AstNode, curloc2prevloc:Array<number>) {
        // console.log('** set_all_parents **');
        // console.log(prev.name, cur.name);

        if (cur.starti !== undefined) {
            // console.log('******** abc');
            // if ('starti' in cur) {
            // cstarti and cendi are the start and end indices in the code
            // as it was when the prev ast was created. cstarti stands
            // for "cur start index in the coordinates of prev"
            const [cstarti, cendi] = this.prev_start_end(cur, curloc2prevloc);

            // console.log(cur.starti, cstarti, cendi);

            // traverses through prev looking for a tparent for cur
            this.set_cur_tparent(prev, cur, cstarti, cendi);
        }
        // Make recursive call for all of cur's children
        cur.children?.forEach((n:AstNode) => {
            this.set_all_tparents(prev, n, curloc2prevloc);
        });
        // for n in ast.iter_child_nodes(cur):
        //     set_all_tparents(prev, n, curloc2prevloc)
    }

    // Set the number of edits since the last successful compile
    private set_num_edits(node:AstNode, char_list:Array<CharNode>, curloc2charlistnode:Array<number>,
        cid2node:Array<AstNode>, curloc2prevloc:Array<number>) {
        if (node.starti !== undefined) {
        // if ('starti' in node) {
            // Set immediate edits
            const startnodei:number = curloc2charlistnode[node.starti];//['starti']];
            const endnodei:number = curloc2charlistnode[node.endi];//['endi']-1];
            let num_new_chars:number = 0;
            let i:number = startnodei;
            while (i <= endnodei) {
                // if the previous index is -1 then this character has
                // been added since the last compilable state
                if (char_list[i].prev_index == -1) {
                    num_new_chars += 1;
                }
                i += 1;
            }
            node.num_new_chars = num_new_chars;
            // node['num_new_chars'] = num_new_chars;
            
            // Set all edits (look at tparent)
            // if (node.tparent !== undefined && node.tparent.endi !== undefined) {
            // // if ('tparent' in node && 'endi' in node['tparent']) {
            //     const tparent:AstNode = cid2node[node.tparent];//['tparent']];
            //     const [pstarti, pendi] = this.prev_start_end(node, curloc2prevloc);
            //     // perc is the percentage of size of node compared to parent
            //     const perc:number = (pendi-pstarti) / (+tparent['endi']-+tparent['starti']);
            //     node['num_edits'] = node['num_new_chars'] + tparent['num_edits'] * perc;
            // } else {
                node.num_edits = node.num_new_chars;
            // }
        }
        // Set edits for children
        node.children?.forEach((n:AstNode) => {
            this.set_num_edits(n, char_list, curloc2charlistnode, cid2node, curloc2prevloc);
        });
        // for n in ast.iter_child_nodes(node):
        //     set_num_edits(n, char_list, curloc2charlistnode, cid2node, curloc2prevloc)
    }

    // private gather_by_type(node:AstNode, type2nodes) {
    //     name = node.__class__.__name__
    //     if not name in type2nodes:
    //         type2nodes[name] = []
    //     type2nodes[name].append(node)
    //     for n in ast.iter_child_nodes(node):
    //         gather_by_type(n, type2nodes)
    // }

    

    public extractStudentData() {
        if (this.subjectId == null) return;
        if (this.assignmentId == null) return;
        if (this.taskId == null) return;

        const selection = this.cachedSubjects[this.subjectId][this.assignmentId][this.taskId];

        let state = "";
        this.codeStates = [];

        // console.log('visiting each row');

        this.next_cid = 0
    
        let cid2node_inc:number = 64;
        let cid2node:Array<AstNode> = new Array(cid2node_inc);
        // cid2node = [None] * cid2node_inc

        let char_list = Array<CharNode>();
        this.precompiledAsts = [];
        let asts:Array<AstNode> = [];
        this.astParseErrors = [];
        selection.forEach((row: any) => {
            let i = row.SourceLocation;

            let insertText = row.InsertText != null ? String(row.InsertText) : "";
            let deleteText = row.DeleteText != null ? String(row.DeleteText) : "";

            //------------------------------------------------------------
            // char_list is our data structure for maintaining
            // correspondence. Each node stores its index in the current
            // AST as well as its index in the last valid AST. Deleted
            // characters are also stored.
            //------------------------------------------------------------
            let insertions = Array<CharNode>();
            for (let i: number = 0; i < insertText.length; i++) {
                let c: CharNode = {char: insertText[i], action:'insert', index:-1, prev_index:-1};
                // console.log(c);
                insertions.push(c);
            }

            // Find the insertion node index j
            let icorr:number = +row.SourceLocation;
            let j:number = 0
            if (char_list.length > 0) {
                while (j < char_list.length && char_list[j].index < icorr) {
                    j += 1
                }
            }
            // Update the char list
            let delete_k:number = 0;
            let list_k:number = j;
            while (delete_k < deleteText.length) {
                if (char_list[list_k].char == deleteText[delete_k]) {
                    char_list[list_k].action = 'delete';
                    char_list[list_k].index = -1;
                    delete_k += 1;
                }
                list_k += 1;
            }
            char_list = char_list.slice(0,j).concat(insertions).concat(char_list.slice(j));
            // Update the indices of the char list
            j = 0
            char_list.forEach((c:CharNode) => {
                if (c.action != 'delete') {
                    c.index = j;
                    j += 1;
                } else {
                    c.index = -1;
                }
            });
            
            //------------------------------------------------------------
            // Update the code reconstruction
            //------------------------------------------------------------
            state = state.slice(0, i) + insertText + state.slice(i + deleteText.length);

            this.codeStates.push(state);
            this.edits.push(new Edit(i, insertText, deleteText));


            //------------------------------------------------------------
            // AST and correspondence code
            //------------------------------------------------------------
            // this.codeStates.forEach((codeState: string) => {
            let cur_ast:AstNode = null;
            try {
                let codeState = state;
                const ast = AstBuilder.createAst(codeState);
                cur_ast = ast;
                updateLoc(codeState, ast);
                this.precompiledAsts.push(ast);
                this.astParseErrors.push("");
            } catch (error) {
                this.precompiledAsts.push(null);
                this.astParseErrors.push(error.message);
            }
            // });

            //------------------------------------------------------------
            // Correspondence code
            //------------------------------------------------------------
            // If we successfully built an AST
            if (cur_ast != null) {
                // Map current location to previous location
                let s: string = state;
                let curloc2prevloc: Array<number> = new Array(s.length);
                curloc2prevloc.fill(-1);
                // curloc2prevloc = [-1 for _ in range(len(s))]
                let curloc2charlistnode: Array<number> = new Array(s.length);
                curloc2charlistnode.fill(null);
                // curloc2charlistnode = [None for _ in range(len(s))]
                // console.log('** updating curloc2prevloc **');
                char_list.forEach((char:CharNode, i:number) => {
                    //     for i,char in enumerate(char_list):
                    // if index is -1 then the node is deleted
                    // console.log(CharNode2string(char), i);
                    if (char.index > -1) {
                        curloc2prevloc[char.index] = char.prev_index
                        curloc2charlistnode[char.index] = i
                    }
                    // console.log('**', char.index, curloc2prevloc[char.index]);
                });
                // Update cid values. asts is the list of all asts to
                // this point.
                this.set_cids(cur_ast);
                if (asts.length > 0) {
                    // console.log('** curloc2prevloc **');
                    // for (let k:number=0; k<curloc2prevloc.length; ++k) {
                    //     console.log(k, curloc2prevloc[k]);
                    // }
                    this.set_all_tparents(asts[asts.length-1], cur_ast, curloc2prevloc);
                }
                asts.push(cur_ast);
                    
                // Set number of edits since last compilable state for each ast node
                this.set_num_edits(cur_ast, char_list, curloc2charlistnode, cid2node, curloc2prevloc)
                    
                // Gather nodes by cid and type
                // gather_by_type(cur_ast, type2nodes)
                    
                // Update cid2node
                // const it = makeIterator(cur_ast);
                // const it = new AstIterator(cur_ast);
                const gen = AstGenerator(cur_ast);
                let cur = gen.next();
                while (!cur.done) {
                    // if (+node['cid'] >= cid2node.length) {
                    let node:AstNode = cur.value.node;
                    if (node.cid >= cid2node.length) {
                        // Dynamically increase size of cid2node if necessary
                        cid2node = cid2node.concat(new Array(cid2node_inc));
                        cid2node_inc *= 2
                    }
                    // cid2node[+node['cid']] = node
                    cid2node[node.cid] = node
                    cur = gen.next();
                }
                // for node in ast.walk(cur_ast):
                //     if node.cid >= len(cid2node):
                //         # Dynamically increase size of cid2node if necessary
                //         cid2node = cid2node + [None] * cid2node_inc
                //         cid2node_inc *= 2
                //     cid2node[node.cid] = node
                
                // if debug:
                //     PrintVisitor().visit(cur_ast)

                // Update char_list
                char_list = char_list.filter(c => c.action !== 'delete');
                // char_list = [c for c in char_list if c.action != 'delete']
                char_list.forEach((c) => {
                    c.prev_index = c.index;
                    c.action = 'inherit';
                });
                // for c in char_list:
                //     c.prev_index = c.index
                //     c.action = 'inherit'
            }
        });

        // console.log('** char_list **:');
        // console.log(char_list);

        // print number of total edits -- this is done for each node by walking up through
        // tparents and adding the number of their edits.
        console.log('** parents and edits **')
        for (let i:number=0; i < cid2node.length; ++i) {
            let node:AstNode = cid2node[i];
            if (node && node.num_edits !== undefined) {
                let tparent:number = node.tparent;//(node.tparent !== undefined) ? node.tparent : -1;
                console.log(i, cid2node[i].name, 'tparent='+tparent, 'edits='+node.num_edits);
            }
        }

        // initial file load, show first state
        this.playback = 0;
        this.playbackChanged();
    }

    // private compileAsts() {
    //     this.precompiledAsts = [];
    //     this.astParseErrors = [];

    //     this.codeStates.forEach((codeState: string) => {
    //         try {
    //             const ast = AstBuilder.createAst(codeState);
    //             this.precompiledAsts.push(ast);
    //             this.astParseErrors.push("");
    //         } catch (error) {
    //             this.precompiledAsts.push(null);
    //             this.astParseErrors.push(error.message);
    //         }
    //     });
    // }

    private cacheStudentAssignments() {

        // cache every student ID, but don't fill anything in
        const students = this.filteredFile.groupBy(row => row.SubjectID);
        this.cachesubjectIds(students);

        // go through every student and cache their assignments
        students.forEach(student => {
            const assignments = student.groupBy(row => row.AssignmentID);
            this.cacheAssignmentIds(assignments);

            // go through every task and cache the df-window for that task
            //  attaching it to the respective student-assignment
            assignments.forEach(assignment => {
                const tasks = assignment.groupBy(row => row.CodeStateSection);
                this.cacheTasks(tasks);
            });
        });
    }

    private cachesubjectIds(students: ISeries) {
        const subjectIds = students
            .select(group => group.first().SubjectID)
            .inflate()
            .toArray();
        subjectIds.forEach(subjectId => this.cachedSubjects[subjectId] = {});
    }

    private cacheAssignmentIds(assignments: ISeries) {
        const assignmentIds = assignments
            .select(group => ({
                subjectId: group.first().SubjectID,
                assignmentId: group.first().AssignmentID,
            }))
            .inflate()
            .toArray();
        assignmentIds.forEach(assignment => {
            this.cachedSubjects[assignment.subjectId][assignment.assignmentId] = {}
        });
    }

    private cacheTasks(tasks: ISeries) {
        tasks.forEach(task => {
            const content = task.content.pairs[0][1];
            const subjectId = content.SubjectID;
            const assignmentId = content.AssignmentID;
            const taskId = content.CodeStateSection;

            this.cachedSubjects[subjectId][assignmentId][taskId] = task;
        });
    }

    @watch("playback")
    playbackChanged() {
        this.code = this.codeStates[this.playback];
    }
}