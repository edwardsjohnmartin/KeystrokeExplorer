import { AstBuilder, AstNode, AstGenerator, printAst } from "./ast";

export class TemporalHierarchy {

    // don't reset this value
    private next_tid: number = 0
    private tid2node_inc: number = 64;

    private tid2node = new Array(this.tid2node_inc);

    // idxInLastSnapshot[i] contains the index in the last snapshot (last edit)
    // for the character currently at index i. -1 if the character was just
    // inserted.
    private idxInLastSnapshot = Array<number>();
    private allIdxInLastSnapshot = Array<Array<number>>();

    // idxInLastCompilable[i] contains the index in the last compilable snapshot
    // for the character currently at index i. -1 if the character was inserted
    // since the last compilable event.
    private idxInLastCompilable = Array<number>();
    private allIdxInLastCompilable = Array<Array<number>>();

    // Whether the last code snapshot was compilable
    // (the AST in the last iteration existed).
    private allCompilable = Array<boolean>();
    private asts: Array<AstNode> = [];

    private set_tids(node: AstNode) {
        if (node == null) return;

        if (node.tid === undefined) {
            node.tid = this.next_tid;
            this.next_tid += 1;
        }
        node.children?.forEach((child: AstNode) => {
            this.set_tids(child);
        });
    }

    public pushCompilableTree(compilable: boolean) {
        this.allCompilable.push(compilable);
    }

    public getTid() {
        return this.tid2node;
    }

    public reset() {
        this.idxInLastSnapshot = Array<number>();
        this.allIdxInLastSnapshot = Array<Array<number>>();

        this.idxInLastCompilable = Array<number>();
        this.allIdxInLastCompilable = Array<Array<number>>();

        this.allCompilable = Array<boolean>();
        this.asts = [];
    }

    public temporalCorrespondence(i: number, eventNumber: number, insertText: string, deleteText: string) {
        // Setup
        const inserted = Array<number>(insertText.length);
        inserted.fill(-1);

        // Update idxInLastSnapshot for this iteration.
        this.idxInLastSnapshot = this.idxInLastSnapshot.map((_, i) => i);

        // beforeInsert/afterInsert are the mappings of all characters preceding/following the insertion and deletion.
        const beforeInsert = this.idxInLastSnapshot.slice(0, i);
        const afterInsert = this.idxInLastSnapshot.slice(i + deleteText.length);

        // Create the new array.
        this.idxInLastSnapshot = beforeInsert.concat(inserted).concat(afterInsert);
        this.allIdxInLastSnapshot.push(this.idxInLastSnapshot);

        this.idxInLastCompilable = this.idxInLastSnapshot.slice();
        this.allIdxInLastCompilable.push(this.idxInLastCompilable);

        if (eventNumber > 0 && !this.allCompilable.at(-2)) {
            for (let k = 0; k < this.idxInLastCompilable.length; ++k) {
                // If the character was not inserted, get the index from the
                // idxInLastCompilable from the last snapshot.
                const pk = this.idxInLastSnapshot[k];

                if (pk != -1) {
                    this.idxInLastCompilable[k] = this.allIdxInLastCompilable.at(-2)[pk];
                }
            }
        }
    }

    public temporalHierarchy(ast: AstNode) {
        // Update tid values. asts is the list of all asts to
        // this point.
        this.set_tids(ast);
        if (this.asts.length > 0) {
            set_all_tparents(this.asts.at(-1), ast, this.idxInLastCompilable);
        }
        this.asts.push(ast);

        // Set number of edits since last compilable state for each ast node
        // Note: this currently gets the number of edits since the last snapshot only.
        setNumEdits(ast, this.allIdxInLastSnapshot, this.allCompilable);

        // Gather nodes by tid and type
        // gather_by_type(cur_ast, type2nodes)

        // Update tid2node
        const gen = AstGenerator(ast);
        let cur = gen.next();
        while (!cur.done) {
            let node: AstNode = cur.value.node;
            if (node.tid >= this.tid2node.length) {
                // Dynamically increase size of tid2node if necessary
                this.tid2node = this.tid2node.concat(new Array(this.tid2node_inc));
                this.tid2node_inc *= 2;
            }
            this.tid2node[node.tid] = node;
            cur = gen.next();
        }
    }
}

// In this editDistance function, only insertions and deletions are considered.
// Substitutions are considered a deletion and then insertion.
function editDistance(idxInLastSnapshot: Array<number>) {
    // Suppose the change looks like this:
    //    for
    //    fler
    // So the "o" was deleted and "le" was inserted, for a distance of three.
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
// So the "o" was deleted and "le" was inserted.
// The idxInLastSnapshot looks like this:
//    0 -1 -1 2
// The number of insertions between indices [0, 4) is two, one for each -1.
// The number of insertions between indices [1, 3) is two.
// The number of insertions between indices [0, 3) is one.
// The number of insertions between indices [0, 1) is zero.
function numInsertions(idxInLastSnapshot: Array<number>, start: number, end: number) {
    return idxInLastSnapshot.slice(start, end).filter(x => x == -1).length;
}

function setNumEdits(node: AstNode, allIdxInLastSnapshot: Array<Array<number>>, allCompilable: Array<boolean>) {
    if (node.start === undefined) {
        throw new Error("node.start unexpectedly undefined");
    }
    let i: number = 0;
    let start = node.start;
    let end = node.end;
    node.numNewChars = 0;
    let stop = false;

    // Iterate through previous snapshots until we hit a compilable snapshot. Add up
    // the number of edits for each.
    do {
        i--;
        const idxInLastSnapshot = allIdxInLastSnapshot.at(i);
        node.numNewChars += numInsertions(idxInLastSnapshot, start, end);
        // Update start and end. If either one is -1 then find a subset. Example:
        //    for
        //    fler
        // The idxInLastSnapshot looks like this:
        //    0 -1 -1 2
        // If (start,end) are (0, 2) then the new start and end as we back up to
        // a previous snapshot would be (0,-1). Since -1 isn"t a valid index
        while (idxInLastSnapshot.at(start) == -1 && start < end) {
            start++;
        }
        while (idxInLastSnapshot.at(end - 1) == -1 && start < end) {
            end--;
        }
        if (start == end) {
            stop = true;
        } else {
            start = idxInLastSnapshot.at(start);
            end = idxInLastSnapshot.at(end - 1) + 1;
        }
    } while (!stop && !allCompilable.at(i - 1));
    // node.num_edits = node.num_new_chars;
    node.children?.forEach((n: AstNode) => {
        setNumEdits(n, allIdxInLastSnapshot, allCompilable);
    });
}

// This function takes an ast node, its start and end indices,
// and finds the corresponding start and end indices in
// the last compilable code.
function prev_start_end(node: AstNode, idxInLastSnapshot: Array<number>): Array<number> {
    if (node.start === undefined) {
        throw new Error("node.start undefined in prev_start_end");
    }

    const n: number = idxInLastSnapshot.length;
    let i: number = node.start;
    let j: number = node.end - 1; // node.end is one past the last character, so get the last character
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
        return [prev_start, prev_end_minus_one + 1];
    } else {
        if (prev_start == -1 || prev_end_minus_one == -1) {
            // Either both indices must be -1 (a new node) or they must both point to valid character
            throw new Error("Illegal previous indices");
        }
        return [prev_start, prev_end_minus_one + 1];
    }
}

// Uses index correspondences to set tparents
function set_all_tparents(prev: AstNode, cur: AstNode, idxInLastSnapshot: Array<number>) {
    if (cur.start === undefined) {
        throw new Error("cur.start undefined in set_all_parents");
    }
    // curStartInPrevCoords and curEndInPrevCoords are the start and end indices in the code
    // as it was when the prev ast was created.
    const [curStartInPrevCoords, curEndInPrevCoords] = prev_start_end(cur, idxInLastSnapshot);

    // traverses through prev looking for a tparent for cur
    set_cur_tparent(prev, cur, curStartInPrevCoords, curEndInPrevCoords);

    // Make recursive call for all of cur"s children
    cur.children?.forEach((n: AstNode) => {
        set_all_tparents(prev, n, idxInLastSnapshot);
    });
}

// traverse through prev looking for a tparent for cur
function set_cur_tparent(prev: AstNode, cur: AstNode, curStartInPrevCoords: number, curEndInPrevCoords: number) {
    if (prev.start === undefined) {
        throw new Error("prev.start undefined");
    }
    if (cur.name == "Module") {
        return;
    }

    let deeper: boolean = true;
    const pstarti: number = prev.start;
    const pendi: number = prev.end;
    if (pstarti <= curStartInPrevCoords && pendi >= curEndInPrevCoords) {
        cur.tparent = prev.tid;
    }
    // Go deeper if the current node is smaller then the prev node
    deeper = (curStartInPrevCoords >= pstarti && curEndInPrevCoords <= pendi);
    if (deeper) {
        prev.children?.forEach((n: AstNode) => {
            set_cur_tparent(n, cur, curStartInPrevCoords, curEndInPrevCoords);
        });
    }
}