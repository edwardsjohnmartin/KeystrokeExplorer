import { Data } from './../data';

import { parse } from 'papaparse';
import { inject } from 'aurelia';
import { watch } from '@aurelia/runtime-html';

@inject(Data)
export class Header {
    private data: Data;
    private fileUpload: any;
    private sliderValue: number;

    private searchString: string;
    private stringNotFound: boolean = false;
    private stringNotFoundClass: string = "";  // "line-through" or ""
    private parseError: string = "";

    public students: Array<string>;
    public assignments: Array<string>;
    public tasks: Array<string>;

    constructor(data: Data) {
        this.data = data;
    }

    // InifileLoadedeady loaded, so we need to bootstrap on filfileLoaded instead of watching for file changes
    attached() {
        this.fileLoaded();
    }

    fileLoaded() {
        if (this.data.cachedSubjects === null) return;

        this.students = Object.keys(
            this.data.cachedSubjects
        );

        // re-trigger file loading
        this.data.subjectId = null;
    }

    public async createCsv() {
        await this.data.createCsv();
    }

    @watch("data.subjectId")
    newSubjectSelected() {
        if (this.data.subjectId === null) return;

        this.assignments = Object.keys(
            this.data.cachedSubjects
            [this.data.subjectId]
        );

        // re-trigger file loading
        this.data.assignmentId = null;
    }

    @watch("data.assignmentId")
    newAssignmentSelected() {
        if (this.data.assignmentId === null) return;

        this.tasks = Object.keys(
            this.data.cachedSubjects
            [this.data.subjectId]
            [this.data.assignmentId]
        );

        // re-trigger file loading
        this.data.taskId = null;
    }

    @watch("data.taskId")
    newFileSelected() {
        if (this.data.taskId === null) return;

        this.searchString = "";
        this.sliderValue = 0;
        //this.data.extractStudentData();
        this.data.studentFileLoaded();
    }

    // Sometimes our playback changes without the use of the slider
    @watch("data.playback")
    dataPlaybackChanged() {
        this.sliderValue = this.data.playback;
    }

    @watch("fileUpload")
    async fileUploaded(fileList: FileList) {
        const csvConfig = {
            delimiter: ",",
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
        }

        this.data.fileLoading = true;

        const file = fileList.item(0);
        this.data.estimatedLoadTime = Math.floor(file.size * 1.4 / 10000000);
        const data = await file.text().then(data => parse(data, csvConfig));

        this.data.file = data.data;
        this.data.fileLoaded();

        this.newSubjectSelected();
        this.newAssignmentSelected();
        this.newFileSelected();
        this.fileLoaded();

        this.data.fileLoading = false;
    }

    @watch("sliderValue")
    sliderChanged() {
        this.data.playback = Number(this.sliderValue);
        this.data.playbackChanged();  // manual trigger
        this.parseError = this.data.astParseErrors[this.data.playback];
    }

    // Debounce set to 850ms
    @watch("searchString")
    searchForString() {
        this.stringNotFound = false;
        this.stringNotFoundClass = "";

        if (this.searchString == "") return;

        for (let index = 0; index < this.data.codeStates.length; index++) {
            const code = this.data.codeStates[index];
            if (code.includes(this.searchString)) {
                this.sliderValue = index;
                return;
            }
        }

        this.stringNotFound = true;
        this.stringNotFoundClass = "line-through";
    }
}
