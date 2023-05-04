import { AstBuilder, AstNode, AstGenerator, printAst } from './ast';
import { DataFrame, IDataFrame, ISeries } from 'data-forge';

import { watch } from '@aurelia/runtime-html';
import internal from 'stream';
import { ConsoleSink } from 'aurelia';
import { assert } from 'console';
import { InstructionParameters } from '@aurelia/router';

class CharNode {
    char: string;
    action: string;
    index: number;
    prev_index: number;

    constructor(char: string, action: string) {
        this.char = char;
        this.action = action;
        this.index = -1;
        this.prev_index = -1;
    }
}

function CharNode2string(c:CharNode) {
    return c.prev_index + '_' + c.char + '_' + c.index;
}

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

// In this editDistance function, only insertions and deletions are considered.
// Substitutions are considered a deletion and then insertion.
function editDistance(idxInLastSnapshot: Array<number>) {
    // Suppose the change looks like this:
    //    for
    //    fler
    // So the 'o' was deleted and 'le' was inserted, for a distance of three.
    // The idxInLastSnapshot looks like this:
    //    0 -1 -1 2
    // The edit distance between indices [0, 4) is three: the two -1s are insertions
    // and (4-0)-(2-0)-1=1 indicates there was a deletion.
    // The edit distance between indices [0, 3) is undefined.
    // Note: I am abandoning this approach for now because of the problem of undefined
    // distances.
}

// Suppose the change looks like this:
//    for
//    fler
// So the 'o' was deleted and 'le' was inserted.
// The idxInLastSnapshot looks like this:
//    0 -1 -1 2
// The number of insertions between indices [0, 4) is two, one for each -1.
// The number of insertions between indices [1, 3) is two.
// The number of insertions between indices [0, 3) is one.
// The number of insertions between indices [0, 1) is zero.
function numInsertions(idxInLastSnapshot: Array<number>, start: number, end: number) {
    return idxInLastSnapshot.slice(start, end).filter(x=>x==-1).length;
}

function setNumEdits(node:AstNode, idxInLastSnapshot:Array<number>) {
    if (node.start === undefined) {
        throw new Error('node.start unexpectedly undefined');
    }
    node.num_new_chars = numInsertions(idxInLastSnapshot, node.start, node.end);
    node.num_edits = node.num_new_chars;
    node.children?.forEach((n:AstNode) => {
        setNumEdits(n, idxInLastSnapshot);
    });
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

    // Maps a temporal ID to the AST node
    public tid2node: Array<AstNode> = [];

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

    private next_tid:number = 0;

    private set_tids(node:AstNode) {
        if (node == null) return;

        if (node.tid === undefined) {
            node.tid = this.next_tid;
            this.next_tid += 1;
        }
        node.children?.forEach((child:AstNode) => {
            this.set_tids(child);
        });
    }

    // traverse through prev looking for a tparent for cur
    private set_cur_tparent(prev:AstNode, cur:AstNode, curStartInPrevCoords:number, curEndInPrevCoords:number) {
        if (prev.start === undefined) {
            throw new Error('prev.start undefined');
        }

        let deeper:boolean = true;
        const pstarti:number = prev.start;
        const pendi:number = prev.end;
        if (pstarti <= curStartInPrevCoords && pendi >= curEndInPrevCoords) {
            cur.tparent = prev.tid;
        }
        // Go deeper if the current node is smaller then the prev node
        deeper = (curStartInPrevCoords >= pstarti && curEndInPrevCoords <= pendi);
        if (deeper) {
            prev.children?.forEach((n:AstNode) => {
                this.set_cur_tparent(n, cur, curStartInPrevCoords, curEndInPrevCoords);
            });
        }
    }

    // This function takes an ast node, its start and end indices,
    // and finds the corresponding start and end indices in
    // the last compilable code.
    private prev_start_end(node:AstNode, idxInLastSnapshot:Array<number>):Array<number> {
        if (node.start === undefined) {
            throw new Error('node.start undefined in prev_start_end');
        }

        const n: number = idxInLastSnapshot.length;
        let i: number = node.start;
        let j:  number = node.end-1; // node.end is one past the last character, so get the last character
        // Iterate past newly-added characters to the beginning then the end of the node
        while (idxInLastSnapshot[i] == -1 && i < j) {
            i += 1;
        }
        while (idxInLastSnapshot[j] == -1 && i < j) {
            j -= 1;
        }

        let prev_start: number = idxInLastSnapshot[i];
        let prev_end_minus_one: number = idxInLastSnapshot[j];

        if (prev_start == prev_end_minus_one) {
            if (prev_start == -1) {
                return [-1, -1];
            }
            return [prev_start, prev_end_minus_one+1];
        } else {
            if (prev_start == -1 || prev_end_minus_one == -1) {
                // Either both indices must be -1 (a new node) or they must both point to valid character
                throw new Error('Illegal previous indices');
            }
            return [prev_start, prev_end_minus_one+1];
        }
    }
        
    // Uses index correspondences to set tparents
    private set_all_tparents(prev:AstNode, cur:AstNode, idxInLastSnapshot:Array<number>) {
        if (cur.start === undefined) {
            throw new Error('cur.start undefined in set_all_parents');
        }
        // curStartInPrevCoords and curEndInPrevCoords are the start and end indices in the code
        // as it was when the prev ast was created.
        const [curStartInPrevCoords, curEndInPrevCoords] = this.prev_start_end(cur, idxInLastSnapshot);

        // traverses through prev looking for a tparent for cur
        this.set_cur_tparent(prev, cur, curStartInPrevCoords, curEndInPrevCoords);

        // Make recursive call for all of cur's children
        cur.children?.forEach((n:AstNode) => {
            this.set_all_tparents(prev, n, idxInLastSnapshot);
        });
        // for n in ast.iter_child_nodes(cur):
        //     set_all_tparents(prev, n, idxInLastSnapshot)
    }

    // Set the number of edits since the last successful compile
    // private set_num_edits(node:AstNode, char_list:Array<CharNode>, curloc2charlistnode:Array<number>,
    //     tid2node:Array<AstNode>, idxInLastSnapshot:Array<number>) {
    // private set_num_edits(node:AstNode, idxInLastSnapshot:Array<number>) {
    //     if (node.start === undefined) {
    //         throw new Error('node.start unexpectedly undefined');
    //     }

    //     // // Set immediate edits
    //     // const startnodei:number = curloc2charlistnode[node.start];
    //     // const endnodei:number = curloc2charlistnode[node.end];
    //     // let num_new_chars:number = 0;
    //     // let i:number = startnodei;
    //     // while (i <= endnodei) {
    //     //     // if the previous index is -1 then this character has
    //     //     // been added since the last compilable state
    //     //     if (char_list[i].prev_index == -1) {
    //     //         num_new_chars += 1;
    //     //     }
    //     //     i += 1;
    //     // }
    //     // node.num_new_chars = num_new_chars;
    //     // node.num_edits = node.num_new_chars;

    //     node.num_new_chars = numInsertions(idxInLastSnapshot, node.start, node.end);
    //     node.num_edits = node.num_new_chars;

    //     // Set edits for children
    //     node.children?.forEach((n:AstNode) => {
    //         // this.set_num_edits(n, char_list, curloc2charlistnode, tid2node, idxInLastSnapshot);
    //         this.set_num_edits(n, idxInLastSnapshot);
    //     });
    // }

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
        this.edits = [];

        this.next_tid = 0
    
        let tid2node_inc:number = 64;
        this.tid2node = new Array(tid2node_inc);

        // let char_list = Array<CharNode>();

        // idxInLastSnapshot[i] contains the index in the last snapshot (last edit)
        // for the character currently at index i. -1 if the character was just
        // inserted.
        let idxInLastSnapshot = Array<number>();
        // idxInLastCompilable[i] contains the index in the last compilable snapshot
        // for the character currently at index i. -1 if the character was just
        // inserted.
        let idxInLastCompilable = Array<number>();
        let idxInLastCompilableFromLastSnapshot: Array<number> = null;
        // Whether the last code snapshot was compilable
        // (the AST in the last iteration existed).
        let lastWasCompilable = false;

        this.precompiledAsts = [];
        let asts:Array<AstNode> = [];
        this.astParseErrors = [];
        selection.forEach((row: any, eventNum: number) => {
            let i = row.SourceLocation;

            let insertText = row.InsertText != null ? String(row.InsertText) : "";
            let deleteText = row.DeleteText != null ? String(row.DeleteText) : "";

            // //------------------------------------------------------------
            // // char_list is our data structure for maintaining
            // // correspondence. Each node stores its index in the current
            // // AST as well as its index in the last valid AST. Deleted
            // // characters are also stored.
            // //------------------------------------------------------------
            // let insertions: Array<CharNode> = [];
            // for (let i: number = 0; i < insertText.length; i++) {
            //     let c: CharNode = new CharNode(insertText[i], 'insert');
            //     insertions.push(c);
            // }

            // // Find the insertion node index j
            // let icorr:number = +row.SourceLocation;
            // let j:number = 0
            // if (char_list.length > 0) {
            //     while (j < char_list.length && char_list[j].index < icorr) {
            //         j += 1;
            //     }
            // }

            // // Update the char list
            // let delete_k:number = 0;
            // let list_k:number = j;
            // while (delete_k < deleteText.length) {
            //     if (char_list[list_k].char != deleteText[delete_k]) {
            //         throw new Error('delete node error');
            //     }
            //     char_list[list_k].action = 'delete';
            //     char_list[list_k].index = -1;
            //     delete_k += 1;
            //     list_k += 1;
            // }
            // char_list = char_list.slice(0,j).concat(insertions).concat(char_list.slice(j));
            // // char_list = char_list.slice(0, j).concat(insertions).concat(char_list.slice(j + deleteText.length));

            // // Update the indices of the char list
            // j = 0
            // char_list.forEach((c:CharNode) => {
            //     if (c.action != 'delete') {
            //         c.index = j;
            //         j += 1;
            //     } else {
            //         c.index = -1;
            //     }
            // });

            // console.log('char_list');
            // console.log(JSON.stringify(char_list));
            
            //------------------------------------------------------------
            // The new way of indicating correspondence
            //------------------------------------------------------------
            // Setup
            const n = insertText.length;
            const m = deleteText.length;
            const idxOffset = n-m;
            const inserted = Array<number>(n);
            inserted.fill(-1);
            // Update idxInLastSnapshot for this iteration.
            idxInLastSnapshot = idxInLastSnapshot.map((x,i)=>i);
            // beforeInsert/afterInsert are the mappings of all characters preceding/following the insertion and deletion.
            const beforeInsert = idxInLastSnapshot.slice(0, i);
            const afterInsert = idxInLastSnapshot.slice(i + m);
            // Create the new array.
            idxInLastSnapshot = beforeInsert.concat(inserted).concat(afterInsert);

            idxInLastCompilable = idxInLastSnapshot.slice();
            if (!lastWasCompilable) {
                for (let k = 0; k < idxInLastCompilable.length; ++k) {
                    // If the character was not inserted, get the index from the
                    // idxInLastCompilable from the last snapshot.
                    if (k > -1) {
                        const pk = idxInLastSnapshot[k];
                        if (pk == -1) {
                            idxInLastCompilable[k] = -1;
                        } else {
                            idxInLastCompilable[k] = idxInLastCompilableFromLastSnapshot[pk];
                        }
                    }
                }
            }

            //------------------------------------------------------------
            // Update the code reconstruction
            //------------------------------------------------------------
            state = state.slice(0, i) + insertText + state.slice(i + deleteText.length);

            this.codeStates.push(state);
            this.edits.push(new Edit(i, insertText, deleteText));


            //------------------------------------------------------------
            // AST
            //------------------------------------------------------------
            let cur_ast:AstNode = null;
            try {
                let codeState = state;
                const ast = AstBuilder.createAst(codeState, eventNum);
                cur_ast = ast;
                // updateLoc(codeState, ast);
                this.precompiledAsts.push(ast);
                this.astParseErrors.push("");
            } catch (error) {
                this.precompiledAsts.push(null);
                this.astParseErrors.push(error.message);
            }

            //------------------------------------------------------------
            // Temporal hierarchy code
            //------------------------------------------------------------
            // If we successfully built an AST
            if (cur_ast != null) {
                // Map current location to previous location
                let s: string = state;
                // let curloc2prevloc: Array<number> = new Array(s.length);
                // curloc2prevloc.fill(-1);
                // let curloc2charlistnode: Array<number> = new Array(s.length);
                // curloc2charlistnode.fill(null);
                // char_list.forEach((char:CharNode, i:number) => {
                //     // if index is -1 then the node is deleted
                //     if (char.index > -1) {
                //         // curloc2prevloc[char.index] = char.prev_index
                //         curloc2charlistnode[char.index] = i
                //     }
                // });
                // Update tid values. asts is the list of all asts to
                // this point.
                this.set_tids(cur_ast);
                if (asts.length > 0) {
                    // this.set_all_tparents(asts.at(-1), cur_ast, idxInLastSnapshot);
                    this.set_all_tparents(asts.at(-1), cur_ast, idxInLastCompilable);
                }
                asts.push(cur_ast);
                    
                // Set number of edits since last compilable state for each ast node
                // this.set_num_edits(cur_ast, char_list, curloc2charlistnode, this.tid2node, idxInLastSnapshot)
                setNumEdits(cur_ast, idxInLastSnapshot);
                    
                // Gather nodes by tid and type
                // gather_by_type(cur_ast, type2nodes)
                    
                // Update tid2node
                const gen = AstGenerator(cur_ast);
                let cur = gen.next();
                while (!cur.done) {
                    let node:AstNode = cur.value.node;
                    if (node.tid >= this.tid2node.length) {
                        // Dynamically increase size of tid2node if necessary
                        this.tid2node = this.tid2node.concat(new Array(tid2node_inc));
                        tid2node_inc *= 2;
                    }
                    this.tid2node[node.tid] = node;
                    cur = gen.next();
                }
            }
            // // Update char_list
            // char_list = char_list.filter(c => c.action !== 'delete');

            // // Test
            // for (let i = 0; i < char_list.length; i++) {
            //     console.log(char_list);
            //     console.log(idxInLastSnapshot);
            //     if (char_list[i].prev_index != idxInLastSnapshot[i]) {
            //         throw new Error("char_list doesn't match idxInLastSnapshot");
            //     }
            // }

            // // Prep char_list for next iteration
            // char_list.forEach((c) => {
            //     c.prev_index = c.index;
            //     c.action = 'inherit';
            // });

            // Prep compilable for next iteration.
            lastWasCompilable = cur_ast != null;
            idxInLastCompilableFromLastSnapshot = idxInLastCompilable;
        });

        // Set tchildren for each node
        this.precompiledAsts.forEach((ast: AstNode) => {
            const gen = AstGenerator(ast);
            let cur = gen.next();
            while (!cur.done) {
                const node: AstNode = cur.value.node;
                if (node.tparent !== undefined) {
                    this.tid2node[node.tparent].tchildren.push(node.tid);
                }
                cur = gen.next();
            }
        });

        // print number of total edits -- this is done for each node by walking up through
        // tparents and adding the number of their edits.
        // console.log('** parents and edits **')
        // for (let i:number=0; i < this.tid2node.length; ++i) {
        //     let node:AstNode = this.tid2node[i];
        //     if (node && node.num_edits !== undefined) {
        //         let tparent:number = node.tparent;//(node.tparent !== undefined) ? node.tparent : -1;
        //         console.log(i, this.tid2node[i].name, 'eventNum='+node.eventNum, 'tparent='+tparent, 'edits='+node.num_edits);
        //     }
        // }

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