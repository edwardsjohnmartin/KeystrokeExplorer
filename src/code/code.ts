import { Data } from './../data';

import { inject } from "aurelia";
import { watch } from '@aurelia/runtime-html';

import * as monaco from "monaco-editor";

@inject(Data)
export class Code {
    private data: Data;

    private codeArea: HTMLElement;
    private monacoEditor;

    constructor(data: Data) {
        this.data = data;
    }

    attached() {
        this.monacoEditor = monaco.editor.create(this.codeArea, {
            value: this.data.code,
            language: "python",
            automaticLayout: true,
            readOnly: true,
            minimap: { enabled: false },
        });

        /* 
            When the user selects text, grab the ICursorSelectionChangedEvent
            https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor.ICursorSelectionChangedEvent.html
        */
        this.monacoEditor.onDidChangeCursorSelection((selectionEvent: monaco.editor.ICursorSelectionChangedEvent) => {
            const selection: monaco.Selection = selectionEvent.selection;
            const start = selection.getStartPosition();
            const end = selection.getEndPosition();

            // console.log("start", start);
            // console.log("end", end);
        });
    }

    @watch("data.code")
    @watch("data.codeHighlights")
    colorCode() {
        const lastEdit = this.data.edits[this.data.playback];
        const { lineNumber, column } = this.monacoEditor.getModel().getPositionAt(lastEdit.location);

        const codeHighlights: Array<any> = []

        this.data.codeHighlights.forEach(highlight => {
            codeHighlights.push({
                range: new monaco.Range(
                    highlight.startLineNumber,
                    highlight.startColumn,
                    highlight.endLineNumber,
                    highlight.endColumn
                ),
                options: {
                    isWholeLine: false,
                    className: "highlighHovered"
                }
            })
        });

        const insertEvent = {
            range: new monaco.Range(
                lineNumber,
                column,
                lineNumber,
                column + lastEdit.insertText.length
            ),
            options: {
                isWholeLine: false,
                className: "insert"
            }
        }
        const deleteEvent = {
            range: new monaco.Range(
                lineNumber,
                column - 1,
                lineNumber,
                column
            ),
            options: {
                isWholeLine: false,
                className: "delete"
            }
        }
        const highlightRow = {
            range: new monaco.Range(
                lineNumber,
                0,
                lineNumber,
                0
            ),
            options: {
                isWholeLine: true,
                className: "hightlightRow",
                marginClassName: "hightlightRow"
            }
        };
        const editEvent = lastEdit.insertText.length > 0 ? insertEvent : deleteEvent;

        this.monacoEditor.setValue(this.data.code);
        this.monacoEditor.revealPositionInCenter({ lineNumber: lineNumber, column: column });

        const combinedHighlights = codeHighlights.concat([highlightRow, editEvent])
        this.monacoEditor.createDecorationsCollection(combinedHighlights);
    }
}
