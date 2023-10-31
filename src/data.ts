import { AstBuilder, AstNode, AstGenerator } from "./ast";
import { DataFrame, IDataFrame, ISeries } from "data-forge";
import { ExportToCsv } from "export-to-csv";

import { CharStream, CommonTokenStream } from "antlr4";
import Python3Lexer from "./parser/Python3Lexer";
import Python3Parser from "./parser/Python3Parser";

import { watch } from "@aurelia/runtime-html";
import { TemporalHierarchy } from "./temporalHierarchy";
import { Python3ParserVisitor } from "./parser/Python3ParserVisitor";


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

export class CodeHighlight {
    public startLineNumber: number = 0;
    public startColumn: number = 0;
    public endLineNumber: number = 0;
    public endColumn: number = 0;
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
    public codeHighlights: Array<CodeHighlight> = [];

    public fileLoading: boolean = false;
    public estimatedLoadTime: number = 0;

    public precompiledAsts: Array<AstNode> = [];
    public astParseErrors: Array<string> = [];

    public temporalHierarchy: TemporalHierarchy = new TemporalHierarchy();

    // test our new json
    private testJson() {

        interface TreeNode {
            children: TreeNode;
            id: number;
            reference: boolean;
            startIndex: number;
            tparent: number;
        }

        let jsonFile = require("/static/trees.json");
        let trees: Array<TreeNode> = jsonFile.trees;

        console.log(trees);
    }

    constructor() {
        // this.file = require("/static/keystrokes.csv");
        this.file = require("/static/correspondence.csv");
        this.fileLoaded();

        // TODO: Remove -- testing
        this.testJson();

        setInterval(() => {
            if (!this.playbackEnabled) return;

            if (this.playback >= this.codeStates.length - 1) return;
            this.playback += 1;
        }, 84);
    }

    // create the CSV data for data exploration
    public createCsv() {

        function createDataEntry(subjectId: string, assignmentId: string, taskId: string, self) {
            self.subjectId = subjectId;
            self.assignmentId = assignmentId;
            self.taskId = taskId;

            // create statistics data
            let data = [];
            self.temporalHierarchy.getTid().forEach((node: AstNode) => {
                data.push({
                    subject_id: subjectId,
                    assignment_id: assignmentId,
                    task_id: taskId,
                    timestamp: node.timestamp,
                    tid: node.tid,
                    pid: node.tparent ?? -1,
                    tchild: node.tchildren,
                    num_children: node.children?.length,
                    playback_index: node.treeNumber,
                    event_number: node.treeNumber,
                    type: node.type,
                    name: node.name,
                    deletes: node.numDeletes,
                    inserts: node.numInserts,
                    local_deletes: node.numLocalDeletes,
                    local_inserts: node.numLocalInserts,
                    body_deletes: node.bodyDeletes,
                    body_inserts: node.bodyInserts,
                    start: node.start,
                    end: node.end,
                });
            });
            return data;
        }

        // dump CSV
        function dumpCsv(d, index, subjectId, assignmentId, taskId) {
            const options = {
                filename: `${index}_${subjectId}_${assignmentId}_${taskId.substring(0, taskId.length - 3)}`,
                fieldSeparator: ',',
                quoteStrings: '"',
                decimalSeparator: '.',
                showLabels: true,
                useTextFile: false,
                useBom: true,
                useKeysAsHeaders: true,
            };
            const csvExporter = new ExportToCsv(options);
            csvExporter.generateCsv(d);
        }

        // create iterator for EVERY task
        const combinations = [];
        for (let subjectId in this.cachedSubjects) {
            let subject = this.cachedSubjects[subjectId];
            for (let assignmentId in subject) {
                let assignment = subject[assignmentId];
                for (let taskId in assignment) {
                    combinations.push([subjectId, assignmentId, taskId]);
                }
            }
        }

        console.log(`Total Tasks: ${combinations.length}`)
        // for (const index of [1007, 1011, 1012, 1069, 144, 169, 191, 209, 20, 223, 258, 272, 294, 314, 333, 344, 419, 432, 445, 450, 453, 490, 535, 553, 631, 632, 650, 758, 785, 81, 84, 861, 881, 886, 891, 8, 909, 910, 963, 972, 986, 989, 993, 99]) {
        for (let index = 1067; index < 1084; index++) {
            let [subjectId, assignmentId, taskId] = combinations[index];
            try {
                let data = createDataEntry(subjectId, assignmentId, taskId, this);
                dumpCsv(data, index, subjectId, assignmentId, taskId);
                console.log(`SUCCESS (${index} / ${combinations.length - 1}): ${subjectId}, ${assignmentId}, ${taskId}`);
            } catch (error) {
                console.log(`FAILED (${index} / ${combinations.length - 1}): ${subjectId}, ${assignmentId}, ${taskId}`);
                // throw error;
            }
        }
    }

    public fileLoaded() {
        this.filteredFile = new DataFrame(this.file).where(row => row.EventType == "File.Edit");

        this.createFakeStudent();
        this.cacheStudentAssignments();

        this.file = null;
        this.filteredFile = null;
    }

    private createFakeStudent() {
        (this.filteredFile.where(row => row.SubjectID === null)).forEach(row => {
            row.SubjectID = "";
        });
        (this.filteredFile.where(row => row.AssignmentID === null)).forEach(row => {
            row.AssignmentID = "";
        });
        (this.filteredFile.where(row => row.TaskID === null)).forEach(row => {
            row.TaskID = "";
        });
    }

    // this will be called by the dashboard when the webpage loads
    // and we know what student to show
    public studentFileLoaded() {
        if (this.subjectId === null) return;
        if (this.assignmentId === null) return;
        if (this.taskId === null) return;

        this.extractStudentData();
        this.setNodeEdits();

        // initial file load, show first state
        this.playback = 0;
        this.playbackChanged();
    }

    private extractStudentData() {
        const selection = this.cachedSubjects[this.subjectId][this.assignmentId][this.taskId];

        let state = "";
        this.codeStates = [];
        this.edits = [];

        this.precompiledAsts = [];
        this.astParseErrors = [];

        this.temporalHierarchy = new TemporalHierarchy();

        const start = performance.now();

        selection.forEach((row: any, treeNumber: number) => {
            let i = row.SourceLocation;
            treeNumber += 1;

            //------------------------------------------------------------
            // Update the code reconstruction
            //------------------------------------------------------------
            let insertText = row.InsertText != null ? String(row.InsertText) : "";
            let deleteText = row.DeleteText != null ? String(row.DeleteText) : "";
            state = state.slice(0, i) + insertText + state.slice(i + deleteText.length);

            this.codeStates.push(state);
            this.edits.push(new Edit(i, insertText, deleteText));

            //------------------------------------------------------------
            // AST Parsing
            //------------------------------------------------------------
            let ast: AstNode = null;
            try {
                ast = AstBuilder.createAst(state, treeNumber);
                this.astParseErrors.push("");
            } catch (error) {
                this.astParseErrors.push(error.message);
                // console.log(error);
            }

            // set timestamps for each event
            const gen = AstGenerator(ast);
            let cur = gen.next();
            while (!cur.done) {
                let node: AstNode = cur.value.node;
                node.timestamp = row.ClientTimestamp;
                cur = gen.next();
            }

            this.precompiledAsts.push(ast);

            this.temporalHierarchy.pushCompilableTree(ast !== null);
            this.temporalHierarchy.temporalCorrespondence(i, treeNumber, insertText, deleteText);
            if (ast !== null) this.temporalHierarchy.temporalHierarchy(ast);
        });

        const end = performance.now();
        console.log(`Parse time: ${end - start}ms`);
    }

    private setNodeEdits() {
        const tid2node = this.temporalHierarchy.getTid();

        // set num edits and num local edits | skip loop edits
        tid2node.forEach((node: AstNode) => {
            node.numLocalInserts = node.numInserts;
            node.numLocalDeletes = node.numDeletes;

            // get edits added from the parent
            if (node.tparent === undefined) return;
            node.numInserts += tid2node[node.tparent].numInserts;
            node.numDeletes += tid2node[node.tparent].numDeletes;
        });

        // set loop-body edits variables
        tid2node.forEach((node: AstNode) => {
            this.setBodyEdits(node);
        });
    }

    private setBodyEdits(node: AstNode) {
        if (node.name.startsWith("def ") && node.children[0].type === "Arguments") {
            for (let index = 1; index < node.children.length; index++) {
                node.bodyInserts += node.children[index].numInserts;
                node.bodyDeletes += node.children[index].numDeletes;
            }
        }

        // functions without arguments
        if (node.name.startsWith("def ") && node.children[0].type !== "Arguments") {
            for (let index = 0; index < node.children.length; index++) {
                node.bodyInserts += node.children[index].numInserts;
                node.bodyDeletes += node.children[index].numDeletes;
            }
        }

        // for-loops: 1st & 2nd children are conditional
        if (node.type === "For") {
            for (let index = 2; index < node.children.length; index++) {
                node.bodyInserts += node.children[index].numInserts;
                node.bodyDeletes += node.children[index].numDeletes;
            }
        }

        // while-loops: 1st child is conditional
        if (node.type === "While") {
            for (let index = 1; index < node.children.length; index++) {
                node.bodyInserts += node.children[index].numInserts;
                node.bodyDeletes += node.children[index].numDeletes;
            }
        }

        // if-statements: 1st child is conditional
        if (node.type === "If") {
            for (let index = 1; index < node.children.length; index++) {
                node.bodyInserts += node.children[index].numInserts;
                node.bodyDeletes += node.children[index].numDeletes;
            }
        }
    }

    private cacheStudentAssignments() {
        // TODO: HIGH PRIORITY - REMOVE OLD CACHE
        // this.cachedSubjects = {};

        // cache every student ID, but don"t fill anything in
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