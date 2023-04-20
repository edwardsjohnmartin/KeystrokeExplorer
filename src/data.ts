import { AstBuilder, AstNode } from './ast';
import { DataFrame, IDataFrame, ISeries } from 'data-forge';

import { watch } from '@aurelia/runtime-html';

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

    constructor() {
        this.file = require("sample.csv");
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

    public extractStudentData() {
        if (this.subjectId == null) return;
        if (this.assignmentId == null) return;
        if (this.taskId == null) return;

        const selection = this.cachedSubjects[this.subjectId][this.assignmentId][this.taskId];

        let state = "";
        this.codeStates = [];

        selection.forEach((row: any) => {
            let i = row.SourceLocation;

            let insertText = row.InsertText != null ? String(row.InsertText) : "";
            let deleteText = row.DeleteText != null ? String(row.DeleteText) : "";

            state = state.slice(0, i) + insertText + state.slice(i + deleteText.length);

            this.codeStates.push(state);
            this.edits.push(new Edit(i, insertText, deleteText));
        });

        // initial file load, show first state
        this.playback = 0;
        this.playbackChanged();
        this.compileAsts();
    }

    private compileAsts() {
        this.precompiledAsts = [];
        this.astParseErrors = [];

        this.codeStates.forEach((codeState: string) => {
            try {
                const ast = AstBuilder.createAst(codeState);
                this.precompiledAsts.push(ast);
                this.astParseErrors.push("");
            } catch (error) {
                this.precompiledAsts.push(null);
                this.astParseErrors.push(error.message);
            }
        });
    }

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