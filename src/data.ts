import { AstBuilder, AstNode, AstGenerator, printAst } from "./ast";
import { DataFrame, IDataFrame, ISeries } from "data-forge";

import { watch } from "@aurelia/runtime-html";
import { TemporalHierarchy } from "./temporalHierarchy";


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

    public temporalHierarchy: TemporalHierarchy = new TemporalHierarchy();

    constructor() {
        // this.file = require("/static/sample.csv");
        this.file = require("/static/correspondence.csv");
        // this.file = require("/static/no-subject-assignment.csv");
        this.fileLoaded();

        setInterval(async () => {
            if (!this.playbackEnabled) return;

            if (this.playback >= this.codeStates.length - 1) return;
            this.playback += 1;
        }, 84);
    }

    fileLoaded() {
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
    }

    private extractStudentData() {
        const selection = this.cachedSubjects[this.subjectId][this.assignmentId][this.taskId];

        let state = "";
        this.codeStates = [];
        this.edits = [];

        this.precompiledAsts = [];
        this.astParseErrors = [];

        this.temporalHierarchy = new TemporalHierarchy();

        let treeNumber = -1;
        selection.forEach((row: any, eventNumber: number) => {
            let i = row.SourceLocation;
            treeNumber += 1;

            let insertText = row.InsertText != null ? String(row.InsertText) : "";
            let deleteText = row.DeleteText != null ? String(row.DeleteText) : "";

            //------------------------------------------------------------
            // Update the code reconstruction
            //------------------------------------------------------------
            state = state.slice(0, i) + insertText + state.slice(i + deleteText.length);

            this.codeStates.push(state);
            this.edits.push(new Edit(i, insertText, deleteText));

            //------------------------------------------------------------
            // AST Parsing
            //------------------------------------------------------------
            let ast: AstNode = null;
            try {
                let codeState = state;
                ast = AstBuilder.createAst(codeState, eventNumber, treeNumber);

                this.precompiledAsts.push(ast);
                this.astParseErrors.push("");
            } catch (error) {
                this.precompiledAsts.push(null);
                this.astParseErrors.push(error.message);
            }

            this.temporalHierarchy.pushCompilableTree(ast !== null);
            this.temporalHierarchy.temporalCorrespondence(i, eventNumber, insertText, deleteText);
            if (ast !== null) this.temporalHierarchy.temporalHierarchy(ast);
        });

        this.setTchildren();

        // initial file load, show first state
        this.playback = 0;
        this.playbackChanged();
    }

    private setTchildren() {
        const tid2node = this.temporalHierarchy.getTid();

        this.precompiledAsts.forEach((ast: AstNode) => {
            const gen = AstGenerator(ast);
            let cur = gen.next();
            while (!cur.done) {
                const node: AstNode = cur.value.node;
                if (node.tparent !== undefined) {
                    tid2node[node.tparent].tchildren.push(node.tid);
                }
                // node.eventNum
                cur = gen.next();
            }
        });
    }

    private cacheStudentAssignments() {

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